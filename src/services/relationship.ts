import { createClient } from "@/lib/supabase/client";

export async function createRelationship(
  startDate: string,
  timezone: string,
  anniversaryType: "yearly" | "monthly",
  partnerName?: string
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_relationship", {
    p_start_date: startDate,
    p_timezone: timezone,
    p_anniversary_type: anniversaryType,
    p_partner_name: partnerName || null,
  });

  if (error) throw error;
  return data as string;
}

export async function joinRelationship(inviteCode: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("join_relationship", {
    p_invite_code: inviteCode,
  });

  if (error) throw error;
  return data as string;
}

export async function updateRelationshipSettings(
  relationshipId: string,
  startDate: string,
  timezone: string,
  anniversaryType: "yearly" | "monthly"
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("update_relationship_settings", {
    p_relationship_id: relationshipId,
    p_start_date: startDate,
    p_timezone: timezone,
    p_anniversary_type: anniversaryType,
  });

  if (error) throw error;
}

export async function regenerateInviteCode(relationshipId: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("regenerate_invite_code", {
    p_relationship_id: relationshipId,
  });

  if (error) throw error;
  return data as string;
}
