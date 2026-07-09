"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/providers/auth-provider";
import { useQueryClient } from "@tanstack/react-query";
import { createRelationship, joinRelationship } from "@/services/relationship";
import { detectTimezone, getSupportedTimezones } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HeartHandshake, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AmbientParticles } from "@/components/ui/AmbientParticles";

export function RelationshipOnboarding() {
  const { profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"choice" | "create" | "join">("choice");
  const [isPending, startTransition] = useTransition();

  const [inviteCode, setInviteCode] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [timezone, setTimezone] = useState(profile?.timezone || detectTimezone());
  const [anniversaryType, setAnniversaryType] = useState<"yearly" | "monthly">("yearly");

  const handleCreate = () => {
    if (!startDate || !timezone) {
      toast.error("Start date and timezone are required.");
      return;
    }
    startTransition(async () => {
      try {
        await createRelationship(
          new Date(startDate).toISOString(),
          timezone,
          anniversaryType
        );
        toast.success("Relationship created!");
        await refreshProfile();
        queryClient.invalidateQueries({ queryKey: ["relationship-context"] });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to create relationship.");
      }
    });
  };

  const handleJoin = () => {
    if (!inviteCode) {
      toast.error("Please enter an invite code.");
      return;
    }
    startTransition(async () => {
      try {
        await joinRelationship(inviteCode.trim().toUpperCase());
        toast.success("Joined relationship successfully!");
        await refreshProfile();
        queryClient.invalidateQueries({ queryKey: ["relationship-context"] });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to join relationship. Check your code.");
      }
    });
  };

  const choiceVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95 },
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden bg-emerald-50/30 dark:bg-emerald-950/20">
      <AmbientParticles />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.12),transparent_32%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.1),transparent_36%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-cormorant text-4xl text-zinc-800 dark:text-zinc-200 tracking-wider">
            The Memory Jar
          </h1>
          <p className="mt-2 text-zinc-500 text-sm tracking-widest uppercase">
            Start Your Journey
          </p>
        </div>

        <AnimatePresence mode="wait">
          {view === "choice" && (
            <motion.div
              key="choice"
              variants={choiceVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-4"
            >
              <button
                onClick={() => setView("create")}
                className="w-full text-left p-6 rounded-[1.5rem] border border-white/12 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl shadow-xl hover:bg-white/60 dark:hover:bg-zinc-900/60 transition-all group"
              >
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-full text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-cormorant text-zinc-800 dark:text-zinc-200">Start a New Jar</h3>
                    <p className="text-sm text-zinc-500">I am setting this up for us.</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setView("join")}
                className="w-full text-left p-6 rounded-[1.5rem] border border-white/12 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl shadow-xl hover:bg-white/60 dark:hover:bg-zinc-900/60 transition-all group"
              >
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-rose-100 dark:bg-rose-900/40 rounded-full text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
                    <HeartHandshake className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-cormorant text-zinc-800 dark:text-zinc-200">Join a Partner</h3>
                    <p className="text-sm text-zinc-500">I have an invite code.</p>
                  </div>
                </div>
              </button>
            </motion.div>
          )}

          {view === "create" && (
            <motion.div
              key="create"
              variants={choiceVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="p-6 rounded-[1.5rem] border border-white/12 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl shadow-xl space-y-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setView("choice")} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                  &larr; Back
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>When did your relationship start?</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 bg-white/50 dark:bg-zinc-900/50"
                  />
                </div>
                <div>
                  <Label>Shared Timezone</Label>
                  <Input
                    list="tz-options"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="mt-1 bg-white/50 dark:bg-zinc-900/50"
                  />
                  <datalist id="tz-options">
                    {getSupportedTimezones().map((tz) => (
                      <option key={tz} value={tz} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <Label>Anniversary tracking</Label>
                  <select
                    value={anniversaryType}
                    onChange={(e) => setAnniversaryType(e.target.value as "yearly" | "monthly")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 bg-white/50 dark:bg-zinc-900/50"
                  >
                    <option value="yearly">Yearly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              <Button
                className="w-full rounded-full"
                onClick={handleCreate}
                disabled={isPending}
              >
                {isPending ? "Creating..." : "Create Relationship"}
              </Button>
            </motion.div>
          )}

          {view === "join" && (
            <motion.div
              key="join"
              variants={choiceVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="p-6 rounded-[1.5rem] border border-white/12 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl shadow-xl space-y-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setView("choice")} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                  &larr; Back
                </button>
              </div>

              <div className="space-y-2">
                <Label>Invite Code</Label>
                <Input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="JAR-XXXXX"
                  className="bg-white/50 dark:bg-zinc-900/50 uppercase"
                />
                <p className="text-xs text-zinc-500 mt-1">Ask your partner for the code from their Profile settings.</p>
              </div>

              <Button
                className="w-full rounded-full"
                onClick={handleJoin}
                disabled={isPending || !inviteCode}
              >
                {isPending ? "Joining..." : "Join Partner"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
