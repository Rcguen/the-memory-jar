"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { normalizeTimezone } from "@/lib/timezone";
import { useAuth } from "@/providers/auth-provider";
import { RelationshipContext } from "@/types/memory";

async function fetchRelationshipContext(profileId: string): Promise<RelationshipContext | null> {
  const supabase = createClient();

  const { data: memberData, error: memberError } = await supabase
    .from("relationship_members")
    .select("relationship_id")
    .eq("profile_id", profileId)
    .single();

  if (memberError) {
    if (memberError.code !== "PGRST116") { // Not found error
      console.error("fetchRelationshipContext: memberError", memberError);
      throw memberError;
    }
  }

  if (!memberData?.relationship_id) return null;

  const relationshipId = memberData.relationship_id;

  const [settingsRes, membersRes] = await Promise.all([
    supabase
      .from("relationship_settings")
      .select("start_date, relationship_timezone, anniversary_type")
      .eq("id", relationshipId)
      .single(),
    supabase
      .from("relationship_members")
      .select("profile_id, display_name, profiles(avatar)")
      .eq("relationship_id", relationshipId),
  ]);

  if (settingsRes.error) {
    console.error("fetchRelationshipContext: settingsRes.error", settingsRes.error);
    throw settingsRes.error;
  }
  if (membersRes.error) {
    console.error("fetchRelationshipContext: membersRes.error", membersRes.error);
    throw membersRes.error;
  }

  const settingsData = settingsRes.data;
  const membersData = membersRes.data;

  const partner = (membersData ?? []).find((member) => member.profile_id !== profileId) ?? null;

  let partnerAvatar: string | null = null;
  const partnerProfiles = (partner as any)?.profiles;
  
  console.log("DEBUG: membersData = ", membersData);
  console.log("DEBUG: partnerProfiles = ", partnerProfiles);

  if (Array.isArray(partnerProfiles)) {
    partnerAvatar = partnerProfiles[0]?.avatar ?? null;
  } else if (partnerProfiles && typeof partnerProfiles === "object") {
    partnerAvatar = partnerProfiles.avatar ?? null;
  }

  console.log("DEBUG: extracted partnerAvatar = ", partnerAvatar);

  return {
    relationshipId,
    relationshipTimezone: normalizeTimezone(settingsData?.relationship_timezone),
    startDate: settingsData?.start_date ?? null,
    partnerId: partner?.profile_id ?? null,
    partnerName: partner?.display_name ?? null,
    partnerAvatar,
    anniversaryType: settingsData?.anniversary_type ?? null,
  };
}

export function useRelationshipContext() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["relationship-context", profile?.id],
    queryFn: () => fetchRelationshipContext(profile!.id),
    enabled: !!profile?.id,
    staleTime: 1000 * 60 * 5,
  });
}
