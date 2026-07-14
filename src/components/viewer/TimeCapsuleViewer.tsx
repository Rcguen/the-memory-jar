"use client";

import { useEffect, useState } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { Memory } from "@/types/memory";
import { useUnlockScheduler } from "@/providers/unlock-scheduler";
import { useAuth } from "@/providers/auth-provider";
import { DoorOpen, KeyRound, Pencil, SkipForward, Trash2 } from "lucide-react";
import { useKnockState } from "@/hooks/useKnockState";
import { createClient } from "@/lib/supabase/client";
import { daysUntil, formatInTimezone, normalizeTimezone } from "@/lib/timezone";
import { usePresence } from "@/hooks/usePresence";

interface TimeCapsuleViewerProps {
  memory: Memory;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function TimeCapsuleViewer({ memory, onClose, onEdit, onDelete }: TimeCapsuleViewerProps) {
  const { now } = useUnlockScheduler();
  const { profile } = useAuth();
  const { hasKnocked, partnerKnocked, knock, openMemory } = useKnockState(memory.id, profile?.id);
  const [partnerName, setPartnerName] = useState<string>("your partner");
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [relationshipTimezone, setRelationshipTimezone] = useState<string>("UTC");
  const [ceremonyPhase, setCeremonyPhase] = useState<"idle" | "countdown" | "release" | "opening">("idle");
  const [countdownValue, setCountdownValue] = useState(3);
  const { partnerOnline } = usePresence(memory.relationship_id, profile?.id, partnerId);


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
          .select("profile_id, display_name")
          .eq("relationship_id", memberData.relationship_id)
          .neq("profile_id", profile!.id)
          .single();
        if (partnerData) {
          setPartnerName(partnerData.display_name);
          setPartnerId(partnerData.profile_id);
        }
      }
    }
    fetchPartnerName();
  }, [memory.is_collaborative, profile]);

  useEffect(() => {
    if (ceremonyPhase !== "countdown") return;

    const ticks = [2, 1].map((value, index) => (
      window.setTimeout(() => setCountdownValue(value), (index + 1) * 700)
    ));
    const releaseTimer = window.setTimeout(() => setCeremonyPhase("release"), 2200);
    return () => {
      ticks.forEach((tick) => window.clearTimeout(tick));
      window.clearTimeout(releaseTimer);
    };
  }, [ceremonyPhase]);

  useEffect(() => {
    if (ceremonyPhase !== "release") return;

    const openTimer = window.setTimeout(async () => {
      setCeremonyPhase("opening");
      if (memory.is_collaborative) {
        await openMemory();
      } else {
        const supabase = createClient();
        await supabase.from("memories").update({ status: "opening" }).eq("id", memory.id);
        window.dispatchEvent(new CustomEvent("memory-opened", { detail: { id: memory.id } }));
      }
    }, 1100);

    return () => window.clearTimeout(openTimer);
  }, [ceremonyPhase, memory.id, memory.is_collaborative, openMemory]);

  const beginCeremony = async () => {
    setCountdownValue(3);
    setCeremonyPhase("countdown");
  };

  const handleKnock = async () => {
    if (!profile) return;

    if (partnerKnocked) {
      await knock({ autoOpen: false });
      await beginCeremony();
      return;
    }

    await knock();
  };

  const handleOpenSolo = async () => {
    await beginCeremony();
  };

  const handleSkipCeremony = async () => {
    setCeremonyPhase("opening");
    if (memory.is_collaborative) {
      await openMemory();
      return;
    }

    const supabase = createClient();
    await supabase.from("memories").update({ status: "opening" }).eq("id", memory.id);
    window.dispatchEvent(new CustomEvent("memory-opened", { detail: { id: memory.id } }));
  };

  const daysRemaining = memory.unlock_at ? daysUntil(memory.unlock_at) : 0;
  const unlockAtMs = memory.unlock_at ? new Date(memory.unlock_at).getTime() : 0;
  const isLocked = !!memory.unlock_at && Number.isFinite(unlockAtMs) && now.getTime() < unlockAtMs;

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

        {partnerOnline && (
          <p className="text-sm tracking-[0.2em] uppercase text-emerald-300/80">
            Opening together...
          </p>
        )}

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
              <motion.button
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                onClick={onEdit}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-zinc-800/60 hover:bg-zinc-700/80 text-zinc-300 hover:text-white border border-zinc-700/50 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </motion.button>
            )}
            {onDelete && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                onClick={onDelete}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-rose-950/60 hover:bg-rose-900/80 text-rose-400 hover:text-rose-200 border border-rose-800/50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </motion.button>
            )}
          </motion.div>
        )}

        {ceremonyPhase !== "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 space-y-4"
          >
            <div className="mx-auto w-full max-w-xs rounded-[1.6rem] border border-amber-200/15 bg-white/[0.04] p-5">
              <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center">
                <motion.div
                  className="absolute inset-0 rounded-full bg-amber-200/20 blur-xl"
                  animate={{ scale: [0.9, 1.12, 0.96], opacity: [0.45, 0.9, 0.55] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute inset-3 rounded-full border border-amber-100/30"
                  animate={{ rotate: ceremonyPhase === "release" ? 12 : 0, scale: ceremonyPhase === "release" ? 1.05 : 1 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={ceremonyPhase === "countdown" ? countdownValue : "Open"}
                    initial={{ opacity: 0, scale: 0.5, filter: "blur(4px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 1.5, filter: "blur(4px)" }}
                    transition={{ duration: 0.4, type: "spring", bounce: 0 }}
                    className="relative block font-cormorant text-5xl text-amber-50"
                  >
                    {ceremonyPhase === "countdown" ? countdownValue : "Open"}
                  </motion.span>
                </AnimatePresence>
              </div>
              <div className="space-y-3">
                <motion.div
                  className="h-2 rounded-full bg-rose-300/60"
                  animate={{ width: ceremonyPhase === "release" ? ["100%", "35%"] : "100%", opacity: ceremonyPhase === "release" ? [1, 0.7] : 1 }}
                  transition={{ duration: 0.9, ease: "easeInOut" }}
                />
                <motion.div
                  className="mx-auto h-10 w-10 rounded-full bg-red-900/75 shadow-[0_0_22px_rgba(127,29,29,0.4)]"
                  animate={ceremonyPhase === "release" ? { rotate: [0, -14, 10], scale: [1, 0.84, 0.76] } : { scale: 1 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                />
                <motion.div
                  className="mx-auto h-px w-28 bg-amber-100/30"
                  animate={ceremonyPhase === "release" ? { scaleX: [1, 1.2, 0.6], opacity: [0.35, 0.9, 0.15] } : { scaleX: 1 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                />
                <p className="text-sm text-amber-100/80">
                  {ceremonyPhase === "countdown"
                    ? "The ribbon loosens, the wax softens, and the paper begins to breathe."
                    : "The seal gives way, and the memory unfolds."}
                </p>
              </div>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              onClick={handleSkipCeremony}
              className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/10"
            >
              <SkipForward className="h-4 w-4" />
              Skip animation
            </motion.button>
          </motion.div>
        )}

        {!isLocked && memory.is_collaborative && ceremonyPhase === "idle" && (
          <div className="mt-8 space-y-4">
            {!hasKnocked ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                onClick={handleKnock}
                className="bg-amber-600 hover:bg-amber-500 text-amber-50 px-6 py-2 rounded-full font-medium transition-colors shadow-lg flex items-center gap-2 mx-auto"
              >
                <DoorOpen className="w-4 h-4" />
                Knock to open
              </motion.button>
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

        {!isLocked && !memory.is_collaborative && ceremonyPhase === "idle" && (
          <div className="mt-8 space-y-4">
            <motion.button
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              onClick={handleOpenSolo}
              className="bg-amber-600 hover:bg-amber-500 text-amber-50 px-6 py-2 rounded-full font-medium transition-colors shadow-lg flex items-center gap-2 mx-auto"
            >
              <DoorOpen className="w-4 h-4" />
              Open Memory
            </motion.button>
          </div>
        )}
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        whileTap={{ scale: 0.95 }}
        transition={{ delay: 1, type: "spring", bounce: 0, duration: 0.4 }}
        onClick={onClose}
        className="mt-12 text-zinc-500 hover:text-zinc-300 transition-colors text-sm font-medium tracking-widest uppercase"
      >
        Return to jar
      </motion.button>
    </motion.div>
  );
}
