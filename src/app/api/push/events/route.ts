import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getRomanticNotificationCopy,
  resolveRomanticNotificationCategory,
  type RomanticNotificationCategory,
} from "@/lib/notifications/romantic-copy";
import { sendPushToRelationshipPartner, type PushDeliverySummary } from "@/lib/push/server";

export const runtime = "nodejs";

const eventSchema = z.object({
  type: z.enum(["partner_created_memory", "time_capsule_unlocked", "collaborative_capsule_waiting"]),
  memoryId: z.string().uuid(),
});

const MEMORY_NOTIFICATION_INDEX = "idx_notifications_unique_partner_created_memory";
const MAX_MEDIA_COUNT = 5;
const isDevelopment = process.env.NODE_ENV === "development";

type NotificationInsertError = {
  code?: string;
  message?: string;
  details?: string;
};

function isExpectedMemoryNotificationConflict(error: NotificationInsertError | null): boolean {
  if (error?.code !== "23505") return false;
  const diagnostic = `${error.message ?? ""} ${error.details ?? ""}`;
  return diagnostic.includes(MEMORY_NOTIFICATION_INDEX);
}

function getCapsuleState(
  eventType: z.infer<typeof eventSchema>["type"],
  memory: { unlock_at: string | null; is_collaborative: boolean; status: string },
) {
  if (eventType === "time_capsule_unlocked") return "unlocked" as const;
  if (eventType === "collaborative_capsule_waiting") return "collaborative" as const;
  if (memory.is_collaborative && memory.status === "pending_partner") return "collaborative" as const;
  if (memory.unlock_at) return "sealed" as const;
  return null;
}

async function insertPartnerNotifications(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    recipientIds: string[];
    relationshipId: string;
    actorId: string;
    memoryId: string;
    category: RomanticNotificationCategory;
    title: string;
    body: string;
  },
) {
  let created = 0;
  let duplicate = 0;

  for (const recipientId of input.recipientIds) {
    const { error } = await admin.from("notifications").insert({
      user_id: recipientId,
      relationship_id: input.relationshipId,
      actor_id: input.actorId,
      type: "partner_created_memory",
      title: input.title,
      body: input.body,
      target_memory_id: input.memoryId,
      metadata: { notification_category: input.category },
    });

    if (!error) {
      created += 1;
      continue;
    }

    if (isExpectedMemoryNotificationConflict(error)) {
      duplicate += 1;
      continue;
    }

    throw error;
  }

  return { created, duplicate };
}

export async function POST(request: Request) {
  const parsed = eventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid event" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: memory, error: memoryError } = await admin
    .from("memories")
    .select("id,relationship_id,created_by,type,status,unlock_at,is_collaborative,deleted_at")
    .eq("id", parsed.data.memoryId)
    .maybeSingle();

  if (memoryError) return Response.json({ error: "Could not load memory" }, { status: 500 });
  if (!memory || memory.deleted_at) return Response.json({ error: "Memory not found" }, { status: 404 });

  const { data: sender, error: senderError } = await admin
    .from("profiles")
    .select("display_name,active_relationship_id")
    .eq("id", user.id)
    .maybeSingle();

  if (senderError) return Response.json({ error: "Could not verify sender" }, { status: 500 });
  if (!sender || sender.active_relationship_id !== memory.relationship_id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: members, error: membersError } = await admin
    .from("relationship_members")
    .select("profile_id")
    .eq("relationship_id", memory.relationship_id);

  if (membersError) return Response.json({ error: "Could not verify relationship" }, { status: 500 });

  const memberIds = (members ?? []).map((member) => member.profile_id).filter(Boolean);
  if (!memberIds.includes(user.id)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const recipientIds = memberIds.filter((profileId) => profileId !== user.id);

  if (parsed.data.type === "partner_created_memory" && memory.created_by !== user.id) {
    return Response.json({ error: "Only the creator can send this event" }, { status: 403 });
  }

  if (parsed.data.type === "time_capsule_unlocked") {
    const unlockTime = memory.unlock_at ? new Date(memory.unlock_at).getTime() : Number.NaN;
    if (!memory.unlock_at || !Number.isFinite(unlockTime) || Date.now() < unlockTime) {
      return Response.json({ error: "Capsule is not unlocked yet" }, { status: 409 });
    }
  }

  if (parsed.data.type === "collaborative_capsule_waiting") {
    if (!memory.is_collaborative) {
      return Response.json({ error: "Memory is not collaborative" }, { status: 409 });
    }
    if (memory.status !== "unlocked") {
      return Response.json({ error: "Capsule is not waiting for a partner" }, { status: 409 });
    }
  }

  let mediaCount = 0;
  const capsuleState = getCapsuleState(parsed.data.type, memory);
  if (parsed.data.type === "partner_created_memory" && memory.type === "photo" && !capsuleState) {
    const { count, error: mediaCountError } = await admin
      .from("memory_attachments")
      .select("id", { count: "exact", head: true })
      .eq("memory_id", memory.id)
      .eq("file_type", "photo");

    if (mediaCountError) return Response.json({ error: "Could not verify media" }, { status: 500 });
    mediaCount = Math.max(0, Math.min(Number(count ?? 0), MAX_MEDIA_COUNT));
  }

  const category = resolveRomanticNotificationCategory({
    memoryType: memory.type,
    mediaCount,
    capsuleState,
  });
  const copy = getRomanticNotificationCopy({
    category,
    senderDisplayName: sender.display_name,
  });

  const shouldCreateInApp = parsed.data.type === "partner_created_memory";
  let inApp = { created: 0, duplicate: 0 };

  if (shouldCreateInApp) {
    try {
      inApp = await insertPartnerNotifications(admin, {
        recipientIds,
        relationshipId: memory.relationship_id,
        actorId: user.id,
        memoryId: memory.id,
        category,
        title: copy.title,
        body: copy.body,
      });
    } catch {
      return Response.json({ error: "Could not create notification" }, { status: 500 });
    }
  }

  let push: PushDeliverySummary & { duplicate: boolean } = {
    sent: 0,
    expired: 0,
    failed: 0,
    duplicate: false,
  };

  try {
    push = await sendPushToRelationshipPartner(
      user.id,
      memory.relationship_id,
      {
        title: copy.title,
        body: copy.body,
        tag: `tmj-${category}-${memory.id}`,
        type: parsed.data.type,
        url: "/",
      },
      {
        eventKey: parsed.data.type === "time_capsule_unlocked"
          ? `${parsed.data.type}:${memory.id}`
          : `${parsed.data.type}:${memory.id}:${user.id}`,
        targetMemoryId: memory.id,
      },
    );
  } catch {
    push.failed = 1;
  }

  if (isDevelopment) {
    console.debug("[notification-event] result", {
      category,
      notificationCreationAttempts: shouldCreateInApp ? recipientIds.length : 0,
      inAppCreated: inApp.created,
      inAppDuplicates: inApp.duplicate,
      pushDispatchAttempts: 1,
      pushSent: push.sent,
      pushFailed: push.failed,
      pushDuplicate: push.duplicate ? 1 : 0,
      mediaItemCount: mediaCount,
      unknownTypeFallback: category === "unknown" ? 1 : 0,
    });
  }

  return Response.json({ inApp, push });
}