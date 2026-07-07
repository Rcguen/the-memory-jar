"use client";

import { useActionState, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { updatePasswordAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function UpdatePasswordForm() {
  const [state, formAction, isPending] = useActionState(updatePasswordAction, {});
  const [mounted, setMounted] = useState(false);
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Validation
  const isLengthValid = newPassword.length >= 6;
  const isMatchValid = newPassword === confirmPassword && newPassword !== "";
  const isValid = isLengthValid && isMatchValid;

  // Basic Strength Indicator
  let strength = 0;
  if (newPassword.length >= 6) strength += 1;
  if (newPassword.length >= 10) strength += 1;
  if (/[A-Z]/.test(newPassword)) strength += 1;
  if (/[0-9]/.test(newPassword)) strength += 1;
  if (/[^A-Za-z0-9]/.test(newPassword)) strength += 1;
  
  const strengthPercentage = Math.min(100, (strength / 5) * 100);
  let strengthColor = "bg-rose-500";
  if (strength >= 3) strengthColor = "bg-amber-400";
  if (strength >= 4) strengthColor = "bg-emerald-400";

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <label className="text-zinc-600 dark:text-zinc-400 font-inter text-sm font-medium">New Password</label>
        <div className="relative">
          <Input
            type={showNew ? "text" : "password"}
            name="newPassword"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm border-white/60 dark:border-zinc-700/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus-visible:ring-rose-500/30 pr-10"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {newPassword.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${strengthColor}`}
                initial={{ width: 0 }}
                animate={{ width: `${strengthPercentage}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-xs text-zinc-500 uppercase font-medium">
              {strength < 3 ? "Weak" : strength < 4 ? "Good" : "Strong"}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-zinc-600 dark:text-zinc-400 font-inter text-sm font-medium">Confirm Password</label>
        <Input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm border-white/60 dark:border-zinc-700/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus-visible:ring-rose-500/30"
          placeholder="••••••••"
        />
        {confirmPassword.length > 0 && !isMatchValid && (
          <p className="text-[11px] text-rose-500 mt-1">Passwords do not match</p>
        )}
      </div>

      <AnimatePresence mode="wait">
        {state.error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-sm font-medium text-rose-500 text-center font-inter"
          >
            {state.error}
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        type="submit"
        disabled={isPending || !isValid}
        className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-full py-6 text-lg font-medium shadow-lg shadow-rose-500/20 transition-all hover:shadow-rose-500/40 font-inter disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          "Save New Password"
        )}
      </Button>
    </form>
  );
}
