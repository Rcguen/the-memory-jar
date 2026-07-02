"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";
import { usePresence } from "@/hooks/usePresence";

export function JarHeartbeat() {
  const { profile } = useAuth();
  const [relationshipId, setRelationshipId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchRelInfo() {
      if (!profile) return;
      const supabase = createClient();
      const { data: memberData } = await supabase
        .from("relationship_members")
        .select("relationship_id")
        .eq("profile_id", profile.id)
        .single();
      if (memberData) {
        setRelationshipId(memberData.relationship_id);
        const { data: partnerData } = await supabase
          .from("relationship_members")
          .select("profile_id, display_name")
          .eq("relationship_id", memberData.relationship_id)
          .neq("profile_id", profile.id)
          .single();
        if (partnerData) {
          setPartnerName(partnerData.display_name);
          setPartnerId(partnerData.profile_id);
        }
      }
    }
    fetchRelInfo();
  }, [profile]);

  const { partnerOnline } = usePresence(relationshipId, profile?.id, partnerId);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("jar-heartbeat-active", { detail: { active: partnerOnline } }));
  }, [partnerOnline]);

  return (
    <AnimatePresence>
      {partnerOnline && partnerName && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-rose-50/80 dark:bg-rose-950/40 backdrop-blur-md px-4 py-2 rounded-full border border-rose-200 dark:border-rose-800/50 flex items-center gap-2 shadow-lg shadow-rose-900/10"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          >
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
          </motion.div>
          <span className="text-sm font-medium text-rose-800 dark:text-rose-200">
            {partnerName} is here
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
