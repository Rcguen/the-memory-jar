import { createClient } from "@/lib/supabase/client";
import { isValidTimezone, normalizeTimezone } from "@/lib/timezone";
import { UserProfile } from "@/types/memory";

type ProfileUpdateInput = {
  displayName?: string;
  avatar?: string | null;
  timezone?: string | null;
};

export const profileService = {
  async updateOwnProfile(input: ProfileUpdateInput): Promise<UserProfile> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const payload: Record<string, string | null> = {};

    if (typeof input.displayName !== "undefined") {
      const trimmedDisplayName = input.displayName.trim();
      if (!trimmedDisplayName) {
        throw new Error("Display name cannot be empty.");
      }
      payload.display_name = trimmedDisplayName;
    }

    if (typeof input.avatar !== "undefined") {
      const trimmedAvatar = input.avatar?.trim() ?? "";
      payload.avatar = trimmedAvatar ? trimmedAvatar : null;
    }

    if (typeof input.timezone !== "undefined") {
      const trimmedTimezone = input.timezone?.trim() ?? "";
      if (trimmedTimezone && !isValidTimezone(trimmedTimezone)) {
        throw new Error("Please choose a valid IANA timezone.");
      }
      payload.timezone = trimmedTimezone ? normalizeTimezone(trimmedTimezone) : null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", user.id)
      .select("id, username, display_name, avatar, timezone, email, created_at")
      .single();

    if (error || !data) {
      throw error ?? new Error("Could not update profile.");
    }

    return data as UserProfile;
  },
};
