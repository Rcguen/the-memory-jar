"use client";

import { createClient } from "@/lib/supabase/client";
import { memoryService } from "@/services/memory";
import { AttachmentType } from "@/types/memory";
import { compressImageForUpload, generateImageThumbnail, generateVideoThumbnail } from "./media-processing";

type StorageBucket = "memory-images" | "memory-voices" | "memory-videos" | "memory-thumbnails";

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
    console.warn("[memory-upload] rollback failed", { bucket, path, message: error.message });
  }
}

export async function uploadMemoryAttachments(memoryId: string, files: File[], startIndex = 0) {
  let fileIndex = startIndex;

  for (const originalFile of files) {
    const processedFile = originalFile.type.startsWith("image/")
      ? await compressImageForUpload(originalFile)
      : originalFile;
    const classified = classifyFile(processedFile);
    if (!classified) continue;
    if (processedFile.size === 0) {
      throw new Error(`Attachment "${processedFile.name}" is empty and cannot be uploaded.`);
    }

    if (processedFile.type.startsWith("audio/")) {
      console.log("[memory-upload] voice file", processedFile.name, processedFile.size, processedFile.type);
    }

    let path: string | null = null;
    try {
      path = await memoryService.uploadAttachment(processedFile, memoryId, classified.bucket, fileIndex + 1);
      await memoryService.linkAttachmentToMemory(memoryId, classified.type, path, {
        role: "original",
        original_name: originalFile.name,
        uploaded_name: processedFile.name,
        original_size: originalFile.size,
        uploaded_size: processedFile.size,
        mime_type: processedFile.type,
      });
    } catch (error) {
      await removeUploadedObject(classified.bucket, path);
      throw error;
    }

    if (processedFile.type.startsWith("image/") || processedFile.type.startsWith("video/")) {
      let thumbPath: string | null = null;
      try {
        const thumbnail = processedFile.type.startsWith("image/")
          ? await generateImageThumbnail(processedFile)
          : await generateVideoThumbnail(processedFile);
        if (thumbnail) {
          thumbPath = await memoryService.uploadAttachment(
            thumbnail.file,
            memoryId,
            "memory-thumbnails",
            fileIndex + 1,
          );
          await memoryService.linkAttachmentToMemory(memoryId, "thumbnail", thumbPath, {
            role: "thumbnail",
            thumbnail_kind: classified.type === "video" ? "video_poster" : "image_preview",
            ...thumbnail.metadata,
            source_attachment_path: path,
            source_attachment_type: classified.type,
          });
        }
      } catch (error) {
        await removeUploadedObject("memory-thumbnails", thumbPath);
        console.warn("[media] thumbnail upload skipped", error);
      }
    }

    fileIndex++;
  }
}
