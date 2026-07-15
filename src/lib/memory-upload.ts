"use client";

import { createClient } from "@/lib/supabase/client";
import { memoryService } from "@/services/memory";
import { AttachmentType } from "@/types/memory";
import { compressImageForUpload, generateImageThumbnail, generateVideoThumbnail } from "./media-processing";

type StorageBucket = "memory-images" | "memory-voices" | "memory-videos" | "memory-thumbnails";

const MAX_FILE_CONCURRENCY = 2;
const isDevelopment = process.env.NODE_ENV === "development";

interface UploadTiming {
  filesProcessed: number;
  originalMediaProcessingMs: number;
  originalStorageUploadMs: number;
  originalAttachmentInsertMs: number;
  thumbnailGenerationMs: number;
  thumbnailStorageUploadMs: number;
  thumbnailAttachmentInsertMs: number;
  relationshipLookupMs: number;
  relationshipLookups: number;
  storageUploads: number;
  attachmentInserts: number;
  thumbnailGenerations: number;
  activeFileWorkers: number;
  maxActiveFileWorkers: number;
}

function createUploadTiming(): UploadTiming {
  return {
    filesProcessed: 0,
    originalMediaProcessingMs: 0,
    originalStorageUploadMs: 0,
    originalAttachmentInsertMs: 0,
    thumbnailGenerationMs: 0,
    thumbnailStorageUploadMs: 0,
    thumbnailAttachmentInsertMs: 0,
    relationshipLookupMs: 0,
    relationshipLookups: 0,
    storageUploads: 0,
    attachmentInserts: 0,
    thumbnailGenerations: 0,
    activeFileWorkers: 0,
    maxActiveFileWorkers: 0,
  };
}

function elapsedMs(startedAt: number): number {
  return Math.round((performance.now() - startedAt) * 10) / 10;
}

function classifyFile(file: File): { bucket: StorageBucket; type: AttachmentType } | null {
  if (file.type.startsWith("image/")) return { bucket: "memory-images", type: "photo" };
  if (file.type.startsWith("audio/")) return { bucket: "memory-voices", type: "voice" };
  if (file.type.startsWith("video/")) return { bucket: "memory-videos", type: "video" };
  return null;
}

async function removeUploadedObject(bucket: StorageBucket, path: string | null) {
  if (!path) return;
  const { error } = await createClient().storage.from(bucket).remove([path]);
  if (error && process.env.NODE_ENV === "development") {
    console.warn("[memory-upload] rollback failed");
  }
}

async function resolveUploadRelationshipId(
  trustedRelationshipId: string | undefined,
  files: File[],
  timing: UploadTiming | null,
): Promise<string | undefined> {
  if (trustedRelationshipId || files.length === 0) return trustedRelationshipId;

  const lookupStartedAt = isDevelopment ? performance.now() : 0;
  const relationshipId = await memoryService.getCurrentRelationshipId();
  if (timing) {
    timing.relationshipLookups += 1;
    timing.relationshipLookupMs += elapsedMs(lookupStartedAt);
  }

  if (!relationshipId) throw new Error("No active relationship");
  return relationshipId;
}

async function uploadSingleMemoryAttachment({
  originalFile,
  memoryId,
  uploadIndex,
  relationshipId,
  timing,
}: {
  originalFile: File;
  memoryId: string;
  uploadIndex: number;
  relationshipId: string;
  timing: UploadTiming | null;
}) {
  if (timing) timing.filesProcessed += 1;

  const processingStartedAt = isDevelopment ? performance.now() : 0;
  const processedFile = originalFile.type.startsWith("image/")
    ? await compressImageForUpload(originalFile)
    : originalFile;
  if (timing && originalFile.type.startsWith("image/")) {
    timing.originalMediaProcessingMs += elapsedMs(processingStartedAt);
  }

  const classified = classifyFile(processedFile);
  if (!classified) return;
  if (processedFile.size === 0) {
    throw new Error(`Attachment "${processedFile.name}" is empty and cannot be uploaded.`);
  }

  if (processedFile.type.startsWith("audio/") && isDevelopment) {
    console.debug("[memory-submit] voice upload input", { bytes: processedFile.size });
  }

  let path: string | null = null;
  try {
    const uploadStartedAt = isDevelopment ? performance.now() : 0;
    path = await memoryService.uploadAttachment(
      processedFile,
      memoryId,
      classified.bucket,
      uploadIndex + 1,
      relationshipId,
    );
    if (timing) {
      timing.storageUploads += 1;
      timing.originalStorageUploadMs += elapsedMs(uploadStartedAt);
    }

    const insertStartedAt = isDevelopment ? performance.now() : 0;
    await memoryService.linkAttachmentToMemory(memoryId, classified.type, path, {
      role: "original",
      upload_index: uploadIndex,
      original_name: originalFile.name,
      uploaded_name: processedFile.name,
      original_size: originalFile.size,
      uploaded_size: processedFile.size,
      mime_type: processedFile.type,
    }, relationshipId);
    if (timing) {
      timing.attachmentInserts += 1;
      timing.originalAttachmentInsertMs += elapsedMs(insertStartedAt);
    }
  } catch (error) {
    await removeUploadedObject(classified.bucket, path);
    throw error;
  }

  if (processedFile.type.startsWith("image/") || processedFile.type.startsWith("video/")) {
    let thumbPath: string | null = null;
    try {
      const thumbnailStartedAt = isDevelopment ? performance.now() : 0;
      const thumbnail = processedFile.type.startsWith("image/")
        ? await generateImageThumbnail(processedFile)
        : await generateVideoThumbnail(processedFile);
      if (timing) {
        timing.thumbnailGenerations += 1;
        timing.thumbnailGenerationMs += elapsedMs(thumbnailStartedAt);
      }

      if (thumbnail) {
        const thumbnailUploadStartedAt = isDevelopment ? performance.now() : 0;
        thumbPath = await memoryService.uploadAttachment(
          thumbnail.file,
          memoryId,
          "memory-thumbnails",
          uploadIndex + 1,
          relationshipId,
        );
        if (timing) {
          timing.storageUploads += 1;
          timing.thumbnailStorageUploadMs += elapsedMs(thumbnailUploadStartedAt);
        }

        const thumbnailInsertStartedAt = isDevelopment ? performance.now() : 0;
        await memoryService.linkAttachmentToMemory(memoryId, "thumbnail", thumbPath, {
          role: "thumbnail",
          upload_index: uploadIndex,
          thumbnail_kind: classified.type === "video" ? "video_poster" : "image_preview",
          ...thumbnail.metadata,
          source_attachment_path: path,
          source_attachment_type: classified.type,
        }, relationshipId);
        if (timing) {
          timing.attachmentInserts += 1;
          timing.thumbnailAttachmentInsertMs += elapsedMs(thumbnailInsertStartedAt);
        }
      }
    } catch {
      await removeUploadedObject("memory-thumbnails", thumbPath);
      console.warn("[media] thumbnail upload skipped");
    }
  }

}

export async function uploadMemoryAttachments(
  memoryId: string,
  files: File[],
  startIndex = 0,
  trustedRelationshipId?: string,
) {
  const submissionStartedAt = isDevelopment ? performance.now() : 0;
  const timing = isDevelopment ? createUploadTiming() : null;

  try {
    const relationshipId = await resolveUploadRelationshipId(trustedRelationshipId, files, timing);
    if (files.length === 0) return;
    if (!relationshipId) throw new Error("No active relationship");

    let nextSelectionIndex = 0;
    let hasFailure = false;
    let firstError: unknown;
    const workerCount = Math.min(MAX_FILE_CONCURRENCY, files.length);

    const worker = async () => {
      while (!hasFailure) {
        const selectionIndex = nextSelectionIndex;
        nextSelectionIndex += 1;
        if (selectionIndex >= files.length) return;

        if (timing) {
          timing.activeFileWorkers += 1;
          timing.maxActiveFileWorkers = Math.max(timing.maxActiveFileWorkers, timing.activeFileWorkers);
        }

        try {
          await uploadSingleMemoryAttachment({
            originalFile: files[selectionIndex],
            memoryId,
            uploadIndex: startIndex + selectionIndex,
            relationshipId,
            timing,
          });
        } catch (error) {
          if (!hasFailure) {
            hasFailure = true;
            firstError = error;
          }
        } finally {
          if (timing) timing.activeFileWorkers -= 1;
        }
      }
    };

    await Promise.all(Array.from({ length: workerCount }, worker));
    if (hasFailure) throw firstError;
  } finally {
    if (timing) {
      console.debug("[memory-submit] upload timing", {
        totalUploadPipelineMs: elapsedMs(submissionStartedAt),
        ...timing,
      });
    }
  }
}