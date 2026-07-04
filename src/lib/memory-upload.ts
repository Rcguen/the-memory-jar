"use client";

import { memoryService } from "@/services/memory";
import { AttachmentType } from "@/types/memory";
import { compressImageForUpload, generateVideoThumbnail } from "./media-processing";

type StorageBucket = "memory-images" | "memory-voices" | "memory-videos" | "memory-thumbnails";

function classifyFile(file: File): { bucket: StorageBucket; type: AttachmentType } | null {
  if (file.type.startsWith("image/")) return { bucket: "memory-images", type: "photo" };
  if (file.type.startsWith("audio/")) return { bucket: "memory-voices", type: "voice" };
  if (file.type.startsWith("video/")) return { bucket: "memory-videos", type: "video" };
  return null;
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

    const path = await memoryService.uploadAttachment(processedFile, memoryId, classified.bucket, fileIndex + 1);
    await memoryService.linkAttachmentToMemory(memoryId, classified.type, path, {
      original_name: originalFile.name,
      uploaded_name: processedFile.name,
      original_size: originalFile.size,
      uploaded_size: processedFile.size,
      mime_type: processedFile.type,
    });

    if (processedFile.type.startsWith("video/")) {
      try {
        const thumbnail = await generateVideoThumbnail(processedFile);
        if (thumbnail) {
          const thumbPath = await memoryService.uploadAttachment(
            thumbnail.file,
            memoryId,
            "memory-thumbnails",
            fileIndex + 1,
          );
          await memoryService.linkAttachmentToMemory(memoryId, "thumbnail", thumbPath, thumbnail.metadata);
        }
      } catch (error) {
        console.warn("[media] thumbnail upload skipped", error);
      }
    }

    fileIndex++;
  }
}
