"use client";

import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useRelationshipContext } from "@/hooks/useRelationshipContext";
import { usePresence } from "@/hooks/usePresence";
import { useAvatarUrl } from "@/hooks/useAvatarUrl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function CouplePresenceAvatars() {
  const { profile } = useAuth();
  const { data: relationship } = useRelationshipContext();
  const { data: myAvatarUrl } = useAvatarUrl(profile?.avatar);
  const { data: partnerAvatarUrl } = useAvatarUrl(relationship?.partnerAvatar);

  const { partnerOnline } = usePresence(
    relationship?.relationshipId ?? null,
    profile?.id,
    relationship?.partnerId ?? null
  );

  const bothOnline = partnerOnline; // We assume the current user is online if they are viewing this component
  const prefersReducedMotion = typeof window !== "undefined" 
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches 
    : false;

  const gapSize = bothOnline ? -8 : 12; // Negative gap brings them closer, positive pushes them apart
  const partnerOpacity = bothOnline ? 1 : 0.45;
  const partnerRing = bothOnline ? "ring-rose-400" : "ring-white/10";
  const myRing = "ring-emerald-400"; // Always online
  const scale = bothOnline ? 1.03 : 1;

  if (!profile || !relationship) return null;

  return (
    <div 
      className="relative z-10 flex flex-col items-center justify-center mb-6 pointer-events-none"
      aria-label={bothOnline ? "You and your partner are online" : "You are online, partner is offline"}
    >
      <motion.div 
        className="flex items-center justify-center"
        style={{ gap: gapSize }}
        animate={{ gap: gapSize, scale: prefersReducedMotion ? 1 : scale }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      >
        {/* Current User */}
        <div className="relative z-20 pointer-events-auto" aria-label="You are online">
          <Avatar className={`w-14 h-14 sm:w-16 sm:h-16 border-2 border-zinc-950 ring-2 ${myRing} shadow-lg`}>
            {myAvatarUrl && <AvatarImage src={myAvatarUrl} alt="You" className="object-cover" />}
            <AvatarFallback className="bg-emerald-950 text-emerald-200 font-cormorant text-xl">
              {profile.display_name?.charAt(0) ?? "U"}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Heart Glow (Visible when both online) */}
        <motion.div
          initial={false}
          animate={{ 
            opacity: bothOnline ? 1 : 0, 
            scale: bothOnline ? 1 : 0.5 
          }}
          transition={{ duration: 0.5 }}
          className="relative z-30 -mx-4"
        >
          <motion.div
            animate={bothOnline && !prefersReducedMotion ? { scale: [1, 1.15, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="bg-rose-500/20 backdrop-blur-md rounded-full p-1 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.5)]"
          >
            <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
          </motion.div>
        </motion.div>

        {/* Partner */}
        <div 
          className="relative z-10 pointer-events-auto" 
          aria-label={partnerOnline ? "Partner is online" : "Partner is offline"}
        >
          <motion.div
            animate={{ opacity: partnerOpacity }}
            transition={{ duration: 0.5 }}
          >
            <Avatar className={`w-14 h-14 sm:w-16 sm:h-16 border-2 border-zinc-950 ring-2 ${partnerRing} shadow-lg transition-all duration-500`}>
              {partnerAvatarUrl && (
                <AvatarImage src={partnerAvatarUrl} alt={relationship.partnerName ?? "Partner"} className="object-cover" />
              )}
              <AvatarFallback className="bg-zinc-800 text-zinc-400 font-cormorant text-xl">
                {relationship.partnerName?.charAt(0) ?? "P"}
              </AvatarFallback>
            </Avatar>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
