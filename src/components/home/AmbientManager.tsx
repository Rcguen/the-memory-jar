"use client";

import { useMemo } from "react";
import { getCurrentSeason } from "@/lib/season";
import { useRelationshipContext } from "@/hooks/useRelationshipContext";
import { motion, useReducedMotion } from "framer-motion";

export function AmbientManager() {
  const { data: relationshipContext } = useRelationshipContext();
  const reduceMotion = useReducedMotion();

  const season = useMemo(() => {
    return getCurrentSeason(relationshipContext?.relationshipTimezone);
  }, [relationshipContext?.relationshipTimezone]);

  if (reduceMotion) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {season === "Spring" && (
        <div className="absolute inset-0 opacity-10 sm:opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-pink-200/20 via-transparent to-transparent sm:mix-blend-overlay" />
      )}
      {season === "Summer" && (
        <div className="absolute inset-0 opacity-15 sm:opacity-25 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-300/30 via-transparent to-transparent sm:mix-blend-overlay" />
      )}
      {season === "Autumn" && (
        <div className="absolute inset-0 opacity-15 sm:opacity-25 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-400/20 via-transparent to-transparent sm:mix-blend-overlay" />
      )}
      {season === "Winter" && (
        <div className="absolute inset-0 opacity-15 sm:opacity-25 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-200/20 via-transparent to-transparent sm:mix-blend-overlay" />
      )}
      {/* 
        NOTE: Audio architecture has been deliberately omitted per user request.
        This component is strictly for visual ambience in this phase.
      */}
    </div>
  );
}
