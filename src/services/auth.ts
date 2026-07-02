"use server";

import { createClient } from "@/lib/supabase/server";

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

export async function getProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar")
    .eq("id", user.id)
    .single();

  return profile;
}
