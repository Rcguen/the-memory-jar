"use client";

import { useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";
import { usePresence } from "@/hooks/usePresence";
import { useRelationshipContext } from "@/hooks/useRelationshipContext";

export function JarHeartbeat() {
  const { profile } = useAuth();
  const { data: relationship } = useRelationshipContext();
  const { partnerOnline } = usePresence(
    relationship?.relationshipId ?? null,
    profile?.id,
    relationship?.partnerId ?? null,
  );

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("jar-heartbeat-active", { detail: { active: partnerOnline } }));
    return () => {
      window.dispatchEvent(new CustomEvent("jar-heartbeat-active", { detail: { active: false } }));
    };
  }, [partnerOnline]);

  return null;
}
