"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { normalizeTimezone } from "@/lib/timezone";
import { useAuth } from "@/providers/auth-provider";
import { RelationshipContext } from "@/types/memory";

async function fetchRelationshipContext(profile: import("@/types/memory").UserProfile): Promise<RelationshipContext | null> {
  const supabase = createClient();
  const profileId = profile.id;
  let relationshipId = profile.active_relationship_id;

  if (!relationshipId) {
    // Fallback: lookup relationship_members
    const { data: membersList, error: memberError } = await supabase
      .from("relationship_members")
      .select("relationship_id")
      .eq("profile_id", profileId);

    if (memberError) {
      console.error("fetchRelationshipContext: memberError", memberError);
      throw memberError;
    }

    if (!membersList || membersList.length === 0) {
      return null;
    }

    if (membersList.length === 1) {
      relationshipId = membersList[0].relationship_id;
      // Repair active_relationship_id silently
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ active_relationship_id: relationshipId })
        .eq("id", profileId);
      if (updateError) {
        console.error("Failed to repair active_relationship_id", updateError);
      }
    } else {
      throw new Error("Multiple relationships found. Manual selection required.");
    }
  }

  if (!relationshipId) return null; // Satisfy TS, though caught by length === 0

  const [settingsRes, membersRes] = await Promise.all([
    supabase
      .from("relationship_settings")
      .select("start_date, relationship_timezone, anniversary_type, invite_code")
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
  const partnerProfiles = (partner as { profiles?: unknown })?.profiles;

  if (Array.isArray(partnerProfiles)) {
    partnerAvatar = (partnerProfiles[0] as { avatar?: string })?.avatar ?? null;
  } else if (partnerProfiles && typeof partnerProfiles === "object") {
    partnerAvatar = (partnerProfiles as { avatar?: string }).avatar ?? null;
  }

  return {
    relationshipId,
    relationshipTimezone: normalizeTimezone(settingsData?.relationship_timezone),
    startDate: settingsData?.start_date ?? null,
    partnerId: partner?.profile_id ?? null,
    partnerName: partner?.display_name ?? null,
    partnerAvatar,
    anniversaryType: settingsData?.anniversary_type ?? null,
    inviteCode: settingsData?.invite_code ?? undefined,
    memberCount: membersData?.length ?? 0,
  };
}

export function useRelationshipContext() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["relationship-context", profile?.id],
    queryFn: () => fetchRelationshipContext(profile!),
    enabled: !!profile?.id,
    staleTime: 1000 * 60 * 5,
  });
}
