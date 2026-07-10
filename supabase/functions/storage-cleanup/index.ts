import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

type CleanupMode = "dry_run" | "delete";
type CleanupStatus = "running" | "completed" | "failed";
type CleanupItemKind = "memory" | "attachment" | "orphan_object";

type CleanupLogRow = {
  run_id: string;
  relationship_id?: string | null;
  memory_id?: string | null;
  attachment_id?: string | null;
  bucket?: string | null;
  object_path?: string | null;
  item_kind: CleanupItemKind;
  action: string;
  outcome: string;
  detail: Record<string, unknown>;
};

type CleanupRunSummary = {
  candidateMemories: number;
  candidateAttachments: number;
  deletedMemories: number;
  deletedObjects: number;
  orphanObjects: number;
  missingObjects: number;
  protectedObjects: number;
};

type CandidateMemoryRow = {
  id: string;
  relationship_id: string;
  deleted_at: string;
};

type AttachmentRow = {
  id: string;
  memory_id: string;
  url: string;
  file_type: string;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STORAGE_CLEANUP_SECRET = Deno.env.get("STORAGE_CLEANUP_SECRET") ?? "";
const DEFAULT_RETENTION_DAYS = Number(Deno.env.get("STORAGE_CLEANUP_RETENTION_DAYS") ?? "30");
const DEFAULT_BATCH_LIMIT = Number(Deno.env.get("STORAGE_CLEANUP_BATCH_LIMIT") ?? "100");
const DEFAULT_DRY_RUN = (Deno.env.get("STORAGE_CLEANUP_DEFAULT_DRY_RUN") ?? "true").toLowerCase() !== "false";
const STORAGE_BUCKETS = ["memory-images", "memory-voices", "memory-videos", "memory-thumbnails"] as const;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getBucketForAttachmentType(fileType: string) {
  if (fileType === "voice") return "memory-voices" as const;
  if (fileType === "video") return "memory-videos" as const;
  if (fileType === "thumbnail") return "memory-thumbnails" as const;
  return "memory-images" as const;
}

function parseBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return fallback;
}

function normalizeSecret(req: Request) {
  const bearer = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "")?.trim();
  const header = req.headers.get("x-cleanup-secret")?.trim();
  return header || bearer || "";
}

async function createRun(client: SupabaseClient, mode: CleanupMode, retentionDays: number, batchLimit: number) {
  const { data, error } = await client
    .from("storage_cleanup_runs")
    .insert({
      mode,
      status: "running",
      retention_days: retentionDays,
      batch_limit: batchLimit,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

async function finalizeRun(
  client: SupabaseClient,
  runId: string,
  status: CleanupStatus,
  summary: CleanupRunSummary,
  errorMessage?: string,
) {
  const { error } = await client
    .from("storage_cleanup_runs")
    .update({
      status,
      candidate_memories: summary.candidateMemories,
      candidate_attachments: summary.candidateAttachments,
      deleted_memories: summary.deletedMemories,
      deleted_objects: summary.deletedObjects,
      orphan_objects: summary.orphanObjects,
      missing_objects: summary.missingObjects,
      protected_objects: summary.protectedObjects,
      error_message: errorMessage ?? null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId);

  if (error) throw error;
}

async function insertCleanupLogs(client: SupabaseClient, rows: CleanupLogRow[]) {
  if (rows.length === 0) return;

  for (let index = 0; index < rows.length; index += 200) {
    const slice = rows.slice(index, index + 200);
    const { error } = await client.from("storage_cleanup_items").insert(slice);
    if (error) throw error;
  }
}

async function storageObjectExists(client: SupabaseClient, bucket: string, objectPath: string) {
  const parts = objectPath.split("/");
  const fileName = parts.pop();
  const folder = parts.join("/");
  if (!fileName) return false;

  const { data, error } = await client.storage.from(bucket).list(folder, {
    limit: 100,
    search: fileName,
  });

  if (error) throw error;
  return (data ?? []).some((entry) => entry.name === fileName);
}

async function listPrefixObjects(client: SupabaseClient, bucket: string, prefix: string) {
  const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw error;

  return (data ?? [])
    .filter((entry) => entry.name && entry.name !== ".emptyFolderPlaceholder")
    .map((entry) => `${prefix}/${entry.name}`);
}

serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!STORAGE_CLEANUP_SECRET || normalizeSecret(req) !== STORAGE_CLEANUP_SECRET) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const body = await req.json().catch(() => ({}));
  const dryRun = parseBoolean(body?.dryRun, DEFAULT_DRY_RUN);
  const retentionDays = Math.max(1, Number(body?.retentionDays ?? DEFAULT_RETENTION_DAYS) || DEFAULT_RETENTION_DAYS);
  const batchLimit = Math.max(1, Math.min(Number(body?.limit ?? DEFAULT_BATCH_LIMIT) || DEFAULT_BATCH_LIMIT, 500));
  const mode: CleanupMode = dryRun ? "dry_run" : "delete";

  const summary: CleanupRunSummary = {
    candidateMemories: 0,
    candidateAttachments: 0,
    deletedMemories: 0,
    deletedObjects: 0,
    orphanObjects: 0,
    missingObjects: 0,
    protectedObjects: 0,
  };

  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const runId = await createRun(supabase, mode, retentionDays, batchLimit);
  const cleanupLogs: CleanupLogRow[] = [];

  try {
    const { data: candidateMemories, error: memoryError } = await supabase
      .from("memories")
      .select("id,relationship_id,deleted_at")
      .not("deleted_at", "is", null)
      .lte("deleted_at", cutoff)
      .order("deleted_at", { ascending: true })
      .limit(batchLimit);

    if (memoryError) throw memoryError;

    const memories = (candidateMemories ?? []) as CandidateMemoryRow[];
    summary.candidateMemories = memories.length;

    if (memories.length === 0) {
      await finalizeRun(supabase, runId, "completed", summary);
      return jsonResponse({
        runId,
        mode,
        cutoff,
        summary,
        message: "No cleanup candidates found.",
      });
    }

    const memoryIds = memories.map((memory) => memory.id);
    const memoryById = new Map(memories.map((memory) => [memory.id, memory]));

    const { data: attachmentRows, error: attachmentError } = await supabase
      .from("memory_attachments")
      .select("id,memory_id,url,file_type")
      .in("memory_id", memoryIds);

    if (attachmentError) throw attachmentError;

    const attachments = (attachmentRows ?? []) as AttachmentRow[];
    summary.candidateAttachments = attachments.length;

    const candidatePaths = [...new Set(attachments.map((attachment) => attachment.url))];
    const activeReferencedPaths = new Set<string>();

    if (candidatePaths.length > 0) {
      const { data: sharedRefs, error: sharedRefsError } = await supabase
        .from("memory_attachments")
        .select("memory_id,url")
        .in("url", candidatePaths);

      if (sharedRefsError) throw sharedRefsError;

      const outsideMemoryIds = [...new Set((sharedRefs ?? [])
        .map((row) => row.memory_id as string)
        .filter((memoryId) => !memoryById.has(memoryId)))];

      const activeMemoryIds = new Set<string>();
      if (outsideMemoryIds.length > 0) {
        const { data: activeMemories, error: activeMemoriesError } = await supabase
          .from("memories")
          .select("id,deleted_at")
          .in("id", outsideMemoryIds);

        if (activeMemoriesError) throw activeMemoriesError;
        for (const memory of activeMemories ?? []) {
          if (!memory.deleted_at) activeMemoryIds.add(memory.id);
        }
      }

      for (const row of sharedRefs ?? []) {
        if (activeMemoryIds.has(row.memory_id as string)) {
          activeReferencedPaths.add(row.url as string);
        }
      }
    }

    const blockedMemoryIds = new Set<string>();
    const missingObjects: string[] = [];
    const orphanObjects = new Set<string>();
    const existingAttachmentPaths = new Set(candidatePaths);

    for (const attachment of attachments) {
      const bucket = getBucketForAttachmentType(attachment.file_type);
      const memory = memoryById.get(attachment.memory_id);
      if (!memory) continue;

      if (activeReferencedPaths.has(attachment.url)) {
        blockedMemoryIds.add(attachment.memory_id);
        summary.protectedObjects += 1;
        cleanupLogs.push({
          run_id: runId,
          relationship_id: memory.relationship_id,
          memory_id: attachment.memory_id,
          attachment_id: attachment.id,
          bucket,
          object_path: attachment.url,
          item_kind: "attachment",
          action: dryRun ? "protect" : "skip_delete",
          outcome: "active_reference",
          detail: { reason: "Object path is still referenced by a non-deleted memory." },
        });
        continue;
      }

      const exists = await storageObjectExists(supabase, bucket, attachment.url);
      if (!exists) {
        missingObjects.push(`${bucket}:${attachment.url}`);
        summary.missingObjects += 1;
        cleanupLogs.push({
          run_id: runId,
          relationship_id: memory.relationship_id,
          memory_id: attachment.memory_id,
          attachment_id: attachment.id,
          bucket,
          object_path: attachment.url,
          item_kind: "attachment",
          action: dryRun ? "report_missing" : "delete_memory_without_object",
          outcome: "missing_object",
          detail: { reason: "Attachment row exists but storage object is missing." },
        });
        continue;
      }

      if (!dryRun) {
        const { error } = await supabase.storage.from(bucket).remove([attachment.url]);
        if (error) throw error;
        summary.deletedObjects += 1;
      }

      cleanupLogs.push({
        run_id: runId,
        relationship_id: memory.relationship_id,
        memory_id: attachment.memory_id,
        attachment_id: attachment.id,
        bucket,
        object_path: attachment.url,
        item_kind: "attachment",
        action: dryRun ? "report_delete_candidate" : "delete_object",
        outcome: dryRun ? "candidate" : "deleted",
        detail: { fileType: attachment.file_type },
      });
    }

    for (const memory of memories) {
      const prefix = `${memory.relationship_id}/${memory.id}`;
      for (const bucket of STORAGE_BUCKETS) {
        const objects = await listPrefixObjects(supabase, bucket, prefix);
        for (const objectPath of objects) {
          if (!existingAttachmentPaths.has(objectPath)) {
            orphanObjects.add(`${bucket}:${objectPath}`);
          }
        }
      }
    }

    summary.orphanObjects = orphanObjects.size;

    for (const orphanKey of orphanObjects) {
      const [bucket, ...pathParts] = orphanKey.split(":");
      const objectPath = pathParts.join(":");
      const relationshipId = objectPath.split("/")[0] ?? null;
      const memoryId = objectPath.split("/")[1] ?? null;

      if (!dryRun) {
        const { error } = await supabase.storage.from(bucket).remove([objectPath]);
        if (error) throw error;
        summary.deletedObjects += 1;
      }

      cleanupLogs.push({
        run_id: runId,
        relationship_id: relationshipId,
        memory_id: memoryId,
        bucket,
        object_path: objectPath,
        item_kind: "orphan_object",
        action: dryRun ? "report_orphan" : "delete_orphan",
        outcome: dryRun ? "candidate" : "deleted",
        detail: { reason: "Storage object exists under a deleted memory prefix without an attachment row." },
      });
    }

    for (const memory of memories) {
      if (blockedMemoryIds.has(memory.id)) {
        cleanupLogs.push({
          run_id: runId,
          relationship_id: memory.relationship_id,
          memory_id: memory.id,
          item_kind: "memory",
          action: dryRun ? "protect" : "skip_delete",
          outcome: "blocked",
          detail: { reason: "One or more attachment paths are still referenced by an active memory." },
        });
        continue;
      }

      if (!dryRun) {
        const { error } = await supabase.from("memories").delete().eq("id", memory.id).not("deleted_at", "is", null);
        if (error) throw error;
        summary.deletedMemories += 1;
      }

      cleanupLogs.push({
        run_id: runId,
        relationship_id: memory.relationship_id,
        memory_id: memory.id,
        item_kind: "memory",
        action: dryRun ? "report_delete_candidate" : "delete_memory",
        outcome: dryRun ? "candidate" : "deleted",
        detail: { deletedAt: memory.deleted_at },
      });
    }

    await insertCleanupLogs(supabase, cleanupLogs);
    await finalizeRun(supabase, runId, "completed", summary);

    return jsonResponse({
      runId,
      mode,
      cutoff,
      summary,
      dryRun,
      blockedMemoryIds: [...blockedMemoryIds],
      missingObjects,
      orphanObjects: [...orphanObjects],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown cleanup error";
    await insertCleanupLogs(supabase, cleanupLogs).catch(() => undefined);
    await finalizeRun(supabase, runId, "failed", summary, message).catch(() => undefined);
    console.error("Cleanup job failed", error);
    return jsonResponse({ runId, error: message, summary }, 500);
  }
});
