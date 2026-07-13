"use client";

const MB = 1024 * 1024;
const MAX_IMAGE_SIZE = 10 * MB;
const MAX_IMAGE_DIMENSION = 2048;
const MAX_THUMBNAIL_DIMENSION = 640;
const IMAGE_QUALITY = 0.82;
const THUMBNAIL_QUALITY = 0.72;

function canvasSupportsType(type: string) {
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  return canvas.toDataURL(type).startsWith(`data:${type}`);
}

function replaceExtension(name: string, extension: string) {
  const base = name.replace(/\.[^/.]+$/, "");
  return `${base}.${extension}`;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

async function loadImageBitmap(file: File) {
  if ("createImageBitmap" in window) {
    return createImageBitmap(file);
  }

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image"));
    };
    image.src = url;
  });
}

async function renderImageToFile(file: File, maxDimension: number, quality: number, suffix?: string) {
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;

  try {
    const bitmap = await loadImageBitmap(file);
    const sourceWidth = bitmap.width;
    const sourceHeight = bitmap.height;
    const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    if ("close" in bitmap) {
      bitmap.close();
    }

    const outputType = canvasSupportsType("image/webp") ? "image/webp" : "image/jpeg";
    const blob = await canvasToBlob(canvas, outputType, quality);
    if (!blob) return file;

    const extension = outputType === "image/webp" ? "webp" : "jpg";
    const fileName = suffix
      ? replaceExtension(file.name, `${suffix}.${extension}`)
      : replaceExtension(file.name, extension);
    const compressed = new File([blob], fileName, {
      type: outputType,
      lastModified: file.lastModified,
    });

    if (process.env.NODE_ENV === "development") {
      console.info(
        `[media] image compressed ${file.name}: ${(file.size / MB).toFixed(2)}MB -> ${(compressed.size / MB).toFixed(2)}MB`,
      );
    }

    return compressed.size <= MAX_IMAGE_SIZE ? compressed : file;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[media] image compression failed, using original", error);
    }
    return file;
  }
}

function seekVideo(video: HTMLVideoElement, seconds: number) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("error", handleError);
    };
    const handleSeeked = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("Could not seek video"));
    };
    video.addEventListener("seeked", handleSeeked, { once: true });
    video.addEventListener("error", handleError, { once: true });
    video.currentTime = seconds;
  });
}

export async function generateVideoThumbnail(file: File) {
  if (!file.type.startsWith("video/")) return null;

  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Could not read video metadata"));
    });

    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const captureAt = Math.min(Math.max(duration * 0.1, 0.1), 1);
    await seekVideo(video, captureAt);

    const width = Math.max(1, video.videoWidth);
    const height = Math.max(1, video.videoHeight);
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const outputType = canvasSupportsType("image/webp") ? "image/webp" : "image/jpeg";
    const blob = await canvasToBlob(canvas, outputType, 0.82);
    if (!blob) return null;

    const extension = outputType === "image/webp" ? "webp" : "jpg";
    return {
      file: new File([blob], replaceExtension(file.name, `thumb.${extension}`), {
        type: outputType,
        lastModified: Date.now(),
      }),
      metadata: {
        source_video_name: file.name,
        capture_at_seconds: captureAt,
        width: canvas.width,
        height: canvas.height,
      },
    };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[media] video thumbnail failed", error);
    }
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function compressImageForUpload(file: File) {
  return renderImageToFile(file, MAX_IMAGE_DIMENSION, IMAGE_QUALITY);
}

export async function generateImageThumbnail(file: File) {
  if (!file.type.startsWith("image/")) return null;
  if (file.type === "image/gif" || file.type === "image/svg+xml") return null;

  const thumbnail = await renderImageToFile(file, MAX_THUMBNAIL_DIMENSION, THUMBNAIL_QUALITY, "thumb");
  if (thumbnail === file) return null;

  return {
    file: thumbnail,
    metadata: {
      source_image_name: file.name,
      source_image_size: file.size,
      thumbnail_size: thumbnail.size,
      max_dimension: MAX_THUMBNAIL_DIMENSION,
      mime_type: thumbnail.type,
    },
  };
}

export function getPreferredAudioMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/mpeg",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}
