"use client";

import { useState, useActionState, useEffect } from "react";
import { ShieldCheck, Eye, EyeOff, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { SectionShell, DetailRow } from "./ProfileSettingsPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changePasswordAction, signOutAllAction } from "@/app/actions/auth";

export function SecuritySettingsCard() {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [changeState, changeAction, isChangePending] = useActionState(changePasswordAction, {});
  const [signOutState, signOutAction, isSignOutPending] = useActionState(signOutAllAction, {});

  // Handle Action States
  useEffect(() => {
    if (changeState?.success) {
      toast.success("Password updated successfully.");
      const t = setTimeout(() => {
        setIsChangingPassword(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }, 0);
      return () => clearTimeout(t);
    } else if (changeState?.error) {
      toast.error(changeState.error);
    }
  }, [changeState]);

  useEffect(() => {
    if (signOutState?.success) {
      toast.success("Signed out of all other devices.");
    } else if (signOutState?.error) {
      toast.error(signOutState.error);
    }
  }, [signOutState]);

  // Validation
  const isLengthValid = newPassword.length >= 6;
  const isMatchValid = newPassword === confirmPassword && newPassword !== "";
  const isValid = currentPassword !== "" && isLengthValid && isMatchValid;

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
    <SectionShell
      title="Security"
      subtitle="Protect your memories"
      icon={ShieldCheck}
    >
      <div className="space-y-4">
        {/* Password Row */}
        <div className="flex flex-col rounded-[1.1rem] border border-white/8 bg-white/[0.03] overflow-hidden transition-all duration-300">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs uppercase tracking-[0.18em] text-zinc-500 whitespace-nowrap shrink-0">Password</span>
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-400">••••••••</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsChangingPassword(!isChangingPassword)}
                className="h-8 rounded-full bg-white/5 px-3 text-xs text-zinc-300 hover:bg-white/10 hover:text-white"
              >
                {isChangingPassword ? "Cancel" : "Change"}
              </Button>
            </div>
          </div>

          <AnimatePresence>
            {isChangingPassword && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-white/5 bg-black/20"
              >
                <form action={changeAction} className="p-4 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-400">Current Password</label>
                    <div className="relative">
                      <Input
                        type={showCurrent ? "text" : "password"}
                        name="currentPassword"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="bg-white/5 border-white/10 text-sm focus-visible:ring-rose-500/30 pr-10"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      >
                        {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-zinc-400">New Password</label>
                    <div className="relative">
                      <Input
                        type={showNew ? "text" : "password"}
                        name="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="bg-white/5 border-white/10 text-sm focus-visible:ring-rose-500/30 pr-10"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      >
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {newPassword.length > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full ${strengthColor}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${strengthPercentage}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <span className="text-[10px] text-zinc-500 uppercase">
                          {strength < 3 ? "Weak" : strength < 4 ? "Good" : "Strong"}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-zinc-400">Confirm Password</label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-white/5 border-white/10 text-sm focus-visible:ring-rose-500/30"
                      placeholder="••••••••"
                    />
                    {confirmPassword.length > 0 && !isMatchValid && (
                      <p className="text-[10px] text-rose-500">Passwords do not match</p>
                    )}
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={!isValid || isChangePending}
                      className="w-full bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-50 disabled:bg-rose-500/50 transition-all rounded-full"
                    >
                      {isChangePending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Other Details */}
        <DetailRow label="Last login" value="Current session" tone="default" />
        <DetailRow label="Current device" value={typeof navigator !== 'undefined' ? navigator.userAgent.split(' ')[0] : 'This Browser'} tone="muted" />

        {/* Sign Out Devices */}
        <div className="flex flex-col gap-1 rounded-[1.1rem] border border-white/8 bg-white/[0.03] px-4 py-3 sm:flex-row sm:items-center sm:justify-between overflow-hidden">
          <span className="text-xs uppercase tracking-[0.18em] text-zinc-500 whitespace-nowrap shrink-0">Other Devices</span>
          <form action={signOutAction} className="sm:ml-4">
            <Button
              type="submit"
              variant="ghost"
              disabled={isSignOutPending}
              className="h-8 rounded-full bg-white/5 px-3 text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
            >
              {isSignOutPending ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
              Sign out all other devices
            </Button>
          </form>
        </div>

        {/* 2FA */}
        <div className="flex flex-col gap-1 rounded-[1.1rem] border border-white/8 bg-white/[0.03] opacity-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between overflow-hidden cursor-not-allowed">
          <span className="text-xs uppercase tracking-[0.18em] text-zinc-500 whitespace-nowrap shrink-0">Two-Factor Auth</span>
          <span className="text-xs text-zinc-400 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-full">Coming Soon</span>
        </div>
      </div>
    </SectionShell>
  );
}
