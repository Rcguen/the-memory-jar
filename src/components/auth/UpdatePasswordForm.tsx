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
        <label className="font-inter text-sm font-medium text-[var(--text-secondary)]">New Password</label>
        <div className="relative">
          <Input
            type={showNew ? "text" : "password"}
            name="newPassword"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="border-[var(--divider)] bg-transparent pr-10 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:border-[var(--accent-primary)] focus-visible:ring-[var(--accent-primary)]/20"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="focus-ring-premium absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-[var(--radius-tiny)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            aria-label={showNew ? "Hide new password" : "Show new password"}
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
            <span className="text-xs font-medium text-[var(--text-caption)]">
              {strength < 3 ? "Weak" : strength < 4 ? "Good" : "Strong"}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="font-inter text-sm font-medium text-[var(--text-secondary)]">Confirm Password</label>
        <Input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="border-[var(--divider)] bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:border-[var(--accent-primary)] focus-visible:ring-[var(--accent-primary)]/20"
          placeholder="••••••••"
        />
        {confirmPassword.length > 0 && !isMatchValid && (
          <p className="mt-1 text-[11px] text-[var(--state-danger)]">Passwords do not match</p>
        )}
      </div>

      <AnimatePresence mode="wait">
        {state.error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="font-inter text-center text-sm font-medium text-[var(--state-danger)]"
          >
            {state.error}
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        type="submit"
        disabled={isPending || !isValid}
        className="w-full rounded-[var(--radius-small)] bg-[var(--accent-primary)] py-6 font-inter text-base font-medium text-white shadow-none transition-colors hover:bg-[color-mix(in_srgb,var(--accent-primary)_88%,black)] disabled:opacity-50"
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
