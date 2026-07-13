import { useQuery } from "@tanstack/react-query";
import { ImageIcon, Images } from "lucide-react";
import { memoryService } from "@/services/memory";
import type { KeepsakeLayoutProps } from "./types";
import { CompactKeepsakeShell } from "./primitives";

export function PhotoKeepsake(props: KeepsakeLayoutProps) {
  const { memory, metadata, isLocked } = props;
  const photos = memory.attachments?.filter((attachment) => attachment.file_type === "photo") ?? [];
  const thumbnail = memory.attachments?.find((attachment) => attachment.file_type === "thumbnail");
  const primary = thumbnail ?? photos[0];
  const { data: url, isError, isLoading } = useQuery({
    queryKey: ["signedAttachmentUrl", primary?.id, primary?.url],
    queryFn: () => memoryService.getAttachmentUrlAsync(primary!.file_type, primary!.url),
    enabled: Boolean(primary) && !isLocked,
    staleTime: 1000 * 60 * 30,
  });
  const preview = url ? <img src={url} alt="" className="h-full w-full object-cover object-center" loading="lazy" decoding="async" /> : <div className="flex h-full items-center justify-center text-stone-500 bg-black/5"><ImageIcon className={isLoading ? "h-5 w-5 animate-pulse" : "h-5 w-5"} /><span className="sr-only">{isError ? "Photo unavailable" : "Loading photo"}</span></div>;
  return <CompactKeepsakeShell {...props} preview={<div className="relative h-full bg-white p-1 pb-2 shadow-sm">{preview}{photos.length > 1 && <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-1 text-[10px] text-white"><Images className="h-3 w-3" />{photos.length}</span>}</div>} icon={<ImageIcon className="h-3.5 w-3.5" />} label="Photo" excerpt={metadata.preview} />;
}
