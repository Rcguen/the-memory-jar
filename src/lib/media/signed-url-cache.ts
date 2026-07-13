"use client";

import { createClient } from "@/lib/supabase/client";

type StorageBucket = "memory-images" | "memory-voices" | "memory-videos" | "memory-thumbnails";

type CacheEntry = {
  signedUrl: string;
  expiresAt: number;
};

const SIGNED_URL_TTL_SECONDS = 60 * 60;
const REFRESH_BUFFER_MS = 5 * 60 * 1000;
const signedUrlCache = new Map<string, CacheEntry>();
const pendingSignedUrls = new Map<string, Promise<string>>();

function cacheKey(bucket: StorageBucket, path: string) {
  return `${bucket}:${path}`;
}

function isFresh(entry: CacheEntry | undefined) {
  return Boolean(entry && entry.expiresAt - REFRESH_BUFFER_MS > Date.now());
}

export async function getCachedSignedUrl(bucket: StorageBucket, path: string) {
  const key = cacheKey(bucket, path);
  const cached = signedUrlCache.get(key);
  if (isFresh(cached)) return cached!.signedUrl;

  const pending = pendingSignedUrls.get(key);
  if (pending) return pending;

  const promise = createClient()
    .storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
    .then(({ data, error }) => {
      if (error) throw error;
      if (!data?.signedUrl) throw new Error("Storage did not return a signed attachment URL.");
      signedUrlCache.set(key, {
        signedUrl: data.signedUrl,
        expiresAt: Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
      });
      return data.signedUrl;
    })
    .finally(() => {
      pendingSignedUrls.delete(key);
    });

  pendingSignedUrls.set(key, promise);
  return promise;
}

export async function getCachedSignedUrls(bucket: StorageBucket, paths: string[]) {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  const result = new Map<string, string>();
  const missing: string[] = [];

  for (const path of uniquePaths) {
    const cached = signedUrlCache.get(cacheKey(bucket, path));
    if (isFresh(cached)) {
      result.set(path, cached!.signedUrl);
    } else {
      missing.push(path);
    }
  }

  if (missing.length > 0) {
    const { data, error } = await createClient()
      .storage
      .from(bucket)
      .createSignedUrls(missing, SIGNED_URL_TTL_SECONDS);

    if (error) throw error;

    for (const item of data ?? []) {
      if (!item.path || !item.signedUrl) continue;
      signedUrlCache.set(cacheKey(bucket, item.path), {
        signedUrl: item.signedUrl,
        expiresAt: Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
      });
      result.set(item.path, item.signedUrl);
    }
  }

  return result;
}

export function clearSignedUrlCache() {
  signedUrlCache.clear();
  pendingSignedUrls.clear();
}
