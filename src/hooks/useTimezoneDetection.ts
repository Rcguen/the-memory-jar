"use client";

import { useEffect } from "react";
import { detectTimezone } from "@/lib/timezone";
import { updateProfileTimezone } from "@/services/auth";
import { UserProfile } from "@/types/memory";

/**
 * Auto-detects the viewer's IANA timezone and saves it to their profile
 * ONCE — only when profile.timezone is currently NULL.
 *
 * Conditions:
 * - profile must be loaded (non-null)
 * - profile.timezone must be NULL (never detected before)
 * - detected timezone must pass IANA validation inside detectTimezone()
 *
 * This hook NEVER overwrites an existing value, so:
 * - Users who chose 'UTC' explicitly keep it
 * - Users who set a custom timezone keep it
 * - The update runs at most once per session (and once ever, since after
 *   saving the DB value is no longer NULL)
 */
export function useTimezoneDetection(profile: UserProfile | null) {
  useEffect(() => {
    if (!profile) return;
    // Only run when timezone has never been saved (IS NULL in DB)
    if (profile.timezone !== null) return;

    const detected = detectTimezone();
    // Save asynchronously — do not block rendering
    updateProfileTimezone(profile.id, detected).catch((err) => {
      console.warn("[useTimezoneDetection] Failed to save timezone:", err);
    });
  }, [profile?.id, profile?.timezone]); // re-check only when identity or timezone changes
}
