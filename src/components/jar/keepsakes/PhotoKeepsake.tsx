import { ImageIcon, Images } from "lucide-react";
import { getHomePreview, usePrivateThumbnail } from "@/hooks/usePrivateThumbnail";
import type { KeepsakeLayoutProps } from "./types";
import { CompactKeepsakeShell } from "./primitives";

export function PhotoKeepsake(props: KeepsakeLayoutProps) {
  const { memory, metadata, isLocked } = props;
  const photos = memory.attachments?.filter((attachment) => attachment.file_type === "photo") ?? [];
  const previewSource = getHomePreview(memory);
  const { containerRef, url, isError, isLoading, retryImage } = usePrivateThumbnail(previewSource, !isLocked);
  const preview = (
    <div ref={containerRef} className="flex h-full items-center justify-center bg-white p-1 pb-2 shadow-sm">
      {url ? <img src={url} alt="" className="h-full w-full object-cover object-center" loading="lazy" decoding="async" onError={retryImage} /> : <div className="flex h-full w-full items-center justify-center bg-black/5 text-stone-500"><ImageIcon className="h-5 w-5" /><span className="sr-only">{isError ? "Photo unavailable" : isLoading ? "Loading photo" : "Photo preview"}</span></div>}
    </div>
  );
  return <CompactKeepsakeShell {...props} preview={<div className="relative h-full">{preview}{photos.length > 1 && <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-1 text-[10px] text-white"><Images className="h-3 w-3" />{photos.length}</span>}</div>} icon={<ImageIcon className="h-3.5 w-3.5" />} label="Photo" excerpt={metadata.preview} />;
}