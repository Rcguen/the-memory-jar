"use client";

import { useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";
import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";
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

  return (
    <AnimatePresence>
      {partnerOnline && relationship?.partnerName && (
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
            {relationship.partnerName} is here
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
