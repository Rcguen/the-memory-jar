"use server";

import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/types/memory";

export async function lookupEmailByUsername(username: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_email_by_username", {
    lookup_username: username,
  });

  if (error || !data) {
    return null;
  }

  return data as string;
}

export async function getProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar, timezone, email, created_at")
    .eq("id", user.id)
    .single();

  return profile;
}

/**
 * Saves the auto-detected timezone for a user's profile.
 * Only writes if the current value IS NULL — never overwrites an
 * existing value (including an explicitly chosen 'UTC').
 */
export async function updateProfileTimezone(userId: string, tz: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ timezone: tz })
    .eq("id", userId)
    .is("timezone", null); // Only update if timezone is currently NULL
}
