"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

const AVATAR_URL_MARKERS = [
  "/storage/v1/object/public/avatars/",
  "/storage/v1/object/sign/avatars/",
  "/storage/v1/render/image/public/avatars/",
];

function avatarStoragePath(value: string): string | null {
  const avatar = value.trim();
  if (!avatar) return null;

  if (!/^https?:\/\//i.test(avatar)) {
    return avatar.replace(/^avatars\//, "").replace(/^\/+/, "");
  }

  try {
    const pathname = new URL(avatar).pathname;
    const marker = AVATAR_URL_MARKERS.find((candidate) => pathname.includes(candidate));
    if (!marker) return null;

    return decodeURIComponent(pathname.slice(pathname.indexOf(marker) + marker.length));
  } catch {
    return null;
  }
}

async function resolveAvatarUrl(avatar: string | null | undefined): Promise<string | null> {
  const value = avatar?.trim();
  if (!value) return null;

  const path = avatarStoragePath(value);
  if (!path) return value;

  const { data, error } = await createClient().storage.from("avatars").createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) {
    // A full external URL can still be a valid legacy avatar URL. Raw paths cannot.
    return /^https?:\/\//i.test(value) ? value : null;
  }

  return data.signedUrl;
}

/** Resolves legacy avatar paths and current avatar URLs without changing profile data. */
export function useAvatarUrl(avatar: string | null | undefined) {
  return useQuery({
    queryKey: ["avatar-url", avatar ?? null],
    queryFn: () => resolveAvatarUrl(avatar),
    enabled: Boolean(avatar?.trim()),
    staleTime: 1000 * 60 * 45,
    gcTime: 1000 * 60 * 60,
  });
}
