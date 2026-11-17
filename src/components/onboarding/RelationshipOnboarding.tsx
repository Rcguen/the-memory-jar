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
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden bg-[var(--surface-base)]">

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-cormorant text-4xl text-zinc-800 dark:text-zinc-200 tracking-wider">
            The Memory Jar
          </h1>
          <p className="mt-2 text-[var(--text-muted)] text-sm">
            Start your journey
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
                className="surface-panel w-full text-left p-6 rounded-2xl transition-colors hover:border-[var(--accent-rose)] group"
              >
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-full text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-cormorant text-[var(--text-strong)]">Start a new jar</h3>
                    <p className="text-sm text-[var(--text-muted)]">I am setting this up for us.</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setView("join")}
                className="surface-panel w-full text-left p-6 rounded-2xl transition-colors hover:border-[var(--accent-rose)] group"
              >
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-rose-100 dark:bg-rose-900/40 rounded-full text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
                    <HeartHandshake className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-cormorant text-[var(--text-strong)]">Join a partner</h3>
                    <p className="text-sm text-[var(--text-muted)]">I have an invite code.</p>
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
              className="surface-panel p-6 rounded-2xl space-y-5"
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
                    className="mt-1 bg-[var(--surface-paper)]"
                  />
                </div>
                <div>
                  <Label>Shared Timezone</Label>
                  <Input
                    list="tz-options"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="mt-1 bg-[var(--surface-paper)]"
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
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-[var(--surface-paper)] px-3 py-2 text-sm"
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
              className="surface-panel p-6 rounded-2xl space-y-5"
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
                  className="bg-[var(--surface-paper)] uppercase"
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
