"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { memoryService } from "@/services/memory";
import type { Memory, MemoryAttachment } from "@/types/memory";

const HOME_THUMBNAIL_STALE_TIME = 55 * 60 * 1000;
const HOME_THUMBNAIL_ROOT_MARGIN = "320px 0px";

type HomePreviewVariant = "thumbnail" | "legacy-original";

type HomePreview = { attachment: MemoryAttachment; variant: HomePreviewVariant };

let developmentMediaCardsMounted = 0;
let developmentMediaCardsIntersected = 0;
let developmentThumbnailSignRequests = 0;
let developmentSharedCacheHits = 0;
let developmentDuplicateSignRequestsPrevented = 0;
let developmentLegacyOriginalFallbacks = 0;
let developmentSignedUrlRefreshes = 0;
let developmentImageErrorRetries = 0;
const observedContainers = new WeakMap<Element, () => void>();
let sharedViewportObserver: IntersectionObserver | null = null;

function reportDevelopmentMediaMetric(metric: "mounted" | "intersected" | "sign-request" | "shared-cache-hit" | "duplicate-sign-prevented" | "legacy-original-fallback" | "signed-url-refresh" | "image-error-retry") {
  if (process.env.NODE_ENV !== "development") return;
  if (metric === "mounted") developmentMediaCardsMounted += 1;
  if (metric === "intersected") developmentMediaCardsIntersected += 1;
  if (metric === "sign-request") developmentThumbnailSignRequests += 1;
  if (metric === "shared-cache-hit") developmentSharedCacheHits += 1;
  if (metric === "duplicate-sign-prevented") developmentDuplicateSignRequestsPrevented += 1;
  if (metric === "legacy-original-fallback") developmentLegacyOriginalFallbacks += 1;
  if (metric === "signed-url-refresh") developmentSignedUrlRefreshes += 1;
  if (metric === "image-error-retry") developmentImageErrorRetries += 1;
  console.debug("[home-private-thumbnail]", { mediaCardsMounted: developmentMediaCardsMounted, mediaCardsIntersected: developmentMediaCardsIntersected, thumbnailSignRequests: developmentThumbnailSignRequests, sharedCacheHits: developmentSharedCacheHits, duplicateSignRequestsPrevented: developmentDuplicateSignRequestsPrevented, legacyOriginalFallbacks: developmentLegacyOriginalFallbacks, signedUrlRefreshes: developmentSignedUrlRefreshes, imageErrorRetries: developmentImageErrorRetries });
}

function observeNearViewport(node: Element, onIntersect: () => void) {
  if (typeof IntersectionObserver === "undefined") return null;
  if (!sharedViewportObserver) {
    sharedViewportObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const callback = observedContainers.get(entry.target);
        observedContainers.delete(entry.target);
        sharedViewportObserver?.unobserve(entry.target);
        callback?.();
      }
    }, { rootMargin: HOME_THUMBNAIL_ROOT_MARGIN });
  }
  observedContainers.set(node, onIntersect);
  sharedViewportObserver.observe(node);
  return () => {
    observedContainers.delete(node);
    sharedViewportObserver?.unobserve(node);
  };
}

export function getHomePreview(memory: Memory): HomePreview | null {
  if (memory.type !== "photo" && memory.type !== "video") return null;
  const attachments = memory.attachments ?? [];
  const thumbnail = attachments.find((attachment) => attachment.file_type === "thumbnail");
  if (thumbnail) return { attachment: thumbnail, variant: "thumbnail" };
  const original = attachments.find((attachment) => attachment.file_type === "photo" || attachment.file_type === "video");
  return original ? { attachment: original, variant: "legacy-original" } : null;
}

export function usePrivateThumbnail(preview: HomePreview | null, enabled = true) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasActivatedRef = useRef(false);
  const imageRetryRef = useRef(false);
  const cacheHitRecordedRef = useRef(false);
  const [activatedPreviewKey, setActivatedPreviewKey] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const attachment = preview?.attachment;
  const variant = preview?.variant;
  const attachmentId = attachment?.id;
  const attachmentUrl = attachment?.url;
  const previewKey = `${attachment?.id ?? ""}|${attachment?.url ?? ""}|${variant ?? ""}`;
  const isNearViewport = activatedPreviewKey === previewKey;
  const queryKey = useMemo(() => ["home-private-thumbnail", attachment?.id ?? null, attachment?.url ?? null, variant ?? null] as const, [attachment?.id, attachment?.url, variant]);

  useEffect(() => {
    if (!attachmentId || !enabled) return;
    reportDevelopmentMediaMetric("mounted");
    if (variant === "legacy-original") reportDevelopmentMediaMetric("legacy-original-fallback");
  }, [attachmentId, enabled, variant]);

  useEffect(() => {
    hasActivatedRef.current = false;
    imageRetryRef.current = false;
    cacheHitRecordedRef.current = false;
    if (!attachmentId || !enabled) return;
    const node = containerRef.current;
    const activate = () => {
      if (hasActivatedRef.current) return;
      hasActivatedRef.current = true;
      reportDevelopmentMediaMetric("intersected");
      setActivatedPreviewKey(previewKey);
    };
    if (!node || typeof IntersectionObserver === "undefined") {
      const fallbackTimer = window.setTimeout(activate, 0);
      return () => window.clearTimeout(fallbackTimer);
    }
    return observeNearViewport(node, activate) ?? undefined;
  }, [attachmentId, attachmentUrl, enabled, previewKey]);

  useEffect(() => {
    if (!isNearViewport || cacheHitRecordedRef.current) return;
    if (queryClient.getQueryData(queryKey)) {
      cacheHitRecordedRef.current = true;
      reportDevelopmentMediaMetric("shared-cache-hit");
    } else if (queryClient.getQueryState(queryKey)?.fetchStatus === "fetching") {
      cacheHitRecordedRef.current = true;
      reportDevelopmentMediaMetric("duplicate-sign-prevented");
    }
  }, [isNearViewport, queryClient, queryKey]);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      reportDevelopmentMediaMetric("sign-request");
      return memoryService.getAttachmentUrlAsync(attachment!.file_type, attachment!.url);
    },
    enabled: Boolean(attachment) && enabled && isNearViewport,
    staleTime: HOME_THUMBNAIL_STALE_TIME,
    gcTime: HOME_THUMBNAIL_STALE_TIME,
    retry: 1,
  });

  const retryImage = useCallback(() => {
    if (!attachment || imageRetryRef.current) return;
    imageRetryRef.current = true;
    reportDevelopmentMediaMetric("image-error-retry");
    reportDevelopmentMediaMetric("signed-url-refresh");
    void queryClient.invalidateQueries({ queryKey, exact: true }).then(() => query.refetch());
  }, [attachment, query, queryClient, queryKey]);

  return { containerRef, url: query.data, isLoading: query.isLoading || (isNearViewport && query.isFetching), isError: query.isError, retryImage, variant };
}