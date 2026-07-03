"use client";

import { useEffect, useState } from "react";

import { motion } from "framer-motion";
import { Memory } from "@/types/memory";
import { useUnlockScheduler } from "@/providers/unlock-scheduler";
import { useAuth } from "@/providers/auth-provider";
import { DoorOpen, KeyRound, Pencil, Trash2 } from "lucide-react";
import { useKnockState } from "@/hooks/useKnockState";
import { createClient } from "@/lib/supabase/client";
import { daysUntil, formatInTimezone, normalizeTimezone } from "@/lib/timezone";

interface TimeCapsuleViewerProps {
  memory: Memory;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function TimeCapsuleViewer({ memory, onClose, onEdit, onDelete }: TimeCapsuleViewerProps) {
  const { now } = useUnlockScheduler();
  const { profile } = useAuth();
  const { hasKnocked, partnerKnocked, knock } = useKnockState(memory.id, profile?.id);
  const [partnerName, setPartnerName] = useState<string>("your partner");
  const [relationshipTimezone, setRelationshipTimezone] = useState<string>("UTC");


  useEffect(() => {
    if (!memory.relationship_id) return;

    const supabase = createClient();
    async function fetchRelationshipTimezone() {
      const { data } = await supabase
        .from("relationship_settings")
        .select("relationship_timezone")
        .eq("id", memory.relationship_id)
        .single();

      setRelationshipTimezone(normalizeTimezone((data as { relationship_timezone?: string } | null)?.relationship_timezone));
    }

    fetchRelationshipTimezone();
  }, [memory.relationship_id]);

  useEffect(() => {
    if (!memory.is_collaborative || !profile) return;

    const supabase = createClient();
    async function fetchPartnerName() {
      const { data: memberData } = await supabase
        .from("relationship_members")
        .select("relationship_id")
        .eq("profile_id", profile!.id)
        .single();

      if (memberData) {
        const { data: partnerData } = await supabase
          .from("relationship_members")
          .select("display_name")
          .eq("relationship_id", memberData.relationship_id)
          .neq("profile_id", profile!.id)
          .single();
        if (partnerData) setPartnerName(partnerData.display_name);
      }
    }
    fetchPartnerName();
  }, [memory.is_collaborative, profile]);

  const handleKnock = async () => {
    if (!profile) return;
    await knock();
  };

  const handleOpenSolo = async () => {
    const supabase = createClient();
    await supabase.from("memories").update({ status: "opening" }).eq("id", memory.id);
    window.dispatchEvent(new CustomEvent("memory-opened", { detail: { id: memory.id } }));
  };

  const daysRemaining = memory.unlock_at ? daysUntil(memory.unlock_at) : 0;
  const unlockAtMs = memory.unlock_at ? new Date(memory.unlock_at).getTime() : 0;
  const isLocked = memory.status === "sealed" && !!memory.unlock_at && now.getTime() < unlockAtMs;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="relative flex flex-col items-center justify-center p-12 max-w-sm w-full mx-4"
    >
      <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-3xl rounded-3xl border border-zinc-700/30 shadow-[0_0_50px_rgba(0,0,0,0.5)] -z-10" />

      <motion.div
        initial={{ rotate: -15, y: 10 }}
        animate={{ rotate: 0, y: 0 }}
        transition={{ delay: 0.2, duration: 1, type: "spring" }}
        className="text-amber-400 mb-8 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]"
      >
        <KeyRound className="h-8 w-8" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 1 }}
        className="text-center space-y-4 font-cormorant"
      >
        <p className="text-xl text-zinc-300 italic font-light">
          {isLocked ? "This memory\nhas been waiting patiently." : "This memory\nis ready to be opened."}
        </p>

        <div className="w-16 h-[1px] bg-amber-900/30 mx-auto my-6" />

        {isLocked && memory.unlock_at && (
          <div className="space-y-1">
            <h3 className="text-2xl text-amber-50/90 tracking-wide">
              {formatInTimezone(
                memory.unlock_at,
                relationshipTimezone,
                { day: "numeric", month: "long", year: "numeric" }
              )}
            </h3>
            <p className="text-amber-500/70 text-sm tracking-widest uppercase">
              {daysRemaining} {daysRemaining === 1 ? "day" : "days"} remaining
            </p>
          </div>
        )}

        {(onEdit || onDelete) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="flex gap-3 mt-8 justify-center"
          >
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-zinc-800/60 hover:bg-zinc-700/80 text-zinc-300 hover:text-white border border-zinc-700/50 transition-all"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-rose-950/60 hover:bg-rose-900/80 text-rose-400 hover:text-rose-200 border border-rose-800/50 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            )}
          </motion.div>
        )}

        {!isLocked && memory.is_collaborative && (
          <div className="mt-8 space-y-4">
            {!hasKnocked ? (
              <button
                onClick={handleKnock}
                className="bg-amber-600 hover:bg-amber-500 text-amber-50 px-6 py-2 rounded-full font-medium transition-colors shadow-lg flex items-center gap-2 mx-auto"
              >
                <DoorOpen className="w-4 h-4" />
                Knock to open
              </button>
            ) : (
              <div className="text-amber-400/80 italic">
                {partnerKnocked ? "Opening together..." : `Waiting for ${partnerName} to knock...`}
              </div>
            )}
            {partnerKnocked && !hasKnocked && (
              <p className="text-amber-300 text-sm animate-pulse">
                {partnerName} is waiting for you!
              </p>
            )}
          </div>
        )}

        {!isLocked && !memory.is_collaborative && (
          <div className="mt-8 space-y-4">
            <button
              onClick={handleOpenSolo}
              className="bg-amber-600 hover:bg-amber-500 text-amber-50 px-6 py-2 rounded-full font-medium transition-colors shadow-lg flex items-center gap-2 mx-auto"
            >
              <DoorOpen className="w-4 h-4" />
              Open Memory
            </button>
          </div>
        )}
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        onClick={onClose}
        className="mt-12 text-zinc-500 hover:text-zinc-300 transition-colors text-sm font-medium tracking-widest uppercase"
      >
        Return to jar
      </motion.button>
    </motion.div>
  );
}
