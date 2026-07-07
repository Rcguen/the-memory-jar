"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, useEffect } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock3,
  HeartHandshake,
  LogOut,
  MoonStar,
  Palette,
  Sparkles,
  UserRound,
  FileText,
  Image as ImageIcon,
  Video,
  Mic,
  Star,
  Pin,
  Archive,
  MessageSquare,
  Heart,
  Globe2,
  CalendarHeart
} from "lucide-react";
import { toast } from "sonner";
import { logoutAction } from "@/app/actions/auth";
import { useAuth } from "@/providers/auth-provider";
import { useRoutePrefetch } from "@/hooks/useRoutePrefetch";
import { useRelationshipContext } from "@/hooks/useRelationshipContext";
import { useCoupleDashboardStats } from "@/hooks/useMemoryData";
import { usePresence } from "@/hooks/usePresence";
import {
  detectTimezone,
  formatInTimezone,
  getSupportedTimezones,
  isValidTimezone,
  normalizeTimezone,
} from "@/lib/timezone";
import { profileService } from "@/services/profile";
import { AvatarUploader } from "./AvatarUploader";
import { SecuritySettingsCard } from "./SecuritySettingsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RelationshipAmbientBackdrop } from "@/components/experience/RelationshipAmbientBackdrop";
import { AmbientParticles } from "@/components/ui/AmbientParticles";
import { cn } from "@/lib/utils";

type StatsKey =
  | "totalMemories"
  | "totalLetters"
  | "totalPhotos"
  | "totalVideos"
  | "totalVoices"
  | "favorites"
  | "totalPinned"
  | "totalCapsules"
  | "totalComments"
  | "totalReactions";

const STATS_ITEMS: Array<{ key: StatsKey; label: string; icon: React.ElementType }> = [
  { key: "totalMemories", label: "Memories", icon: Sparkles },
  { key: "totalLetters", label: "Letters", icon: FileText },
  { key: "totalPhotos", label: "Photos", icon: ImageIcon },
  { key: "totalVideos", label: "Videos", icon: Video },
  { key: "totalVoices", label: "Voice Notes", icon: Mic },
  { key: "favorites", label: "Favorites", icon: Star },
  { key: "totalPinned", label: "Pinned", icon: Pin },
  { key: "totalCapsules", label: "Capsules", icon: Archive },
  { key: "totalComments", label: "Comments", icon: MessageSquare },
  { key: "totalReactions", label: "Reactions", icon: Heart },
];

export function SectionShell({
  title,
  subtitle,
  icon: Icon,
  children,
  className
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-[1.6rem] border border-white/12 bg-zinc-950/58 shadow-[0_22px_80px_rgba(0,0,0,0.24)] backdrop-blur-2xl", className)}>
      <div className="border-b border-white/8 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="rounded-full border border-white/10 bg-white/5 p-2 text-emerald-300">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-cormorant text-3xl leading-none text-zinc-50">{title}</h2>
            <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
          </div>
        </div>
      </div>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

export function DetailRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "muted";
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[1.1rem] border border-white/8 bg-white/[0.03] px-4 py-3 sm:flex-row sm:items-center sm:justify-between overflow-hidden">
      <span className="text-xs uppercase tracking-[0.18em] text-zinc-500 whitespace-nowrap shrink-0">{label}</span>
      <span className={cn("text-sm text-zinc-100 break-all sm:text-right sm:ml-4", tone === "muted" && "text-zinc-400")}>{value}</span>
    </div>
  );
}

export function ProfileSettingsPage() {
  const { profile, refreshProfile, isLoading } = useAuth();
  const { data: relationship } = useRelationshipContext();
  const { data: stats, isLoading: statsLoading } = useCoupleDashboardStats();
  const { theme, setTheme } = useTheme();
  const { partnerOnline } = usePresence(
    relationship?.relationshipId ?? null,
    profile?.id,
    relationship?.partnerId ?? null,
  );
  
  const [displayNameDraft, setDisplayNameDraft] = useState<string | undefined>(profile?.display_name);
  const [timezoneDraft, setTimezoneDraft] = useState<string | undefined>(profile?.timezone ?? undefined);
  const [greeting, setGreeting] = useState("Good evening");
  const [isMounted, setIsMounted] = useState(false);
  
  const [isAccountPending, startAccountTransition] = useTransition();
  const [isTimezonePending, startTimezoneTransition] = useTransition();
  const [isLogoutPending, startLogoutTransition] = useTransition();

  useRoutePrefetch(["/", "/timeline", "/dashboard", "/on-this-day"]);

  const detectedTimezone = useMemo(() => detectTimezone(), []);
  const supportedTimezones = useMemo(() => {
    const base = getSupportedTimezones();
    const boosted = new Set([
      detectedTimezone,
      relationship?.relationshipTimezone ?? null,
      "UTC",
      ...base,
    ]);

    return Array.from(boosted)
      .filter((timezone): timezone is string => typeof timezone === "string" && timezone.length > 0)
      .sort((a, b) => a.localeCompare(b));
  }, [detectedTimezone, relationship?.relationshipTimezone]);

  const currentTimezone = normalizeTimezone(profile?.timezone ?? detectedTimezone);
  const effectiveDisplayName = displayNameDraft ?? profile?.display_name ?? "";
  const effectiveTimezoneDraft = timezoneDraft ?? currentTimezone;
  const timezoneSource =
    profile?.timezone && normalizeTimezone(profile.timezone) !== detectedTimezone
      ? "Manual selection"
      : "Detected automatically";

  const isAccountDirty =
    !!profile &&
    effectiveDisplayName.trim() !== profile.display_name;

  const isTimezoneDirty = effectiveTimezoneDraft.trim() !== currentTimezone;

  const joinedDate = profile?.created_at
    ? new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(profile.created_at))
    : "Just now";

  const relationshipStarted = relationship?.startDate
    ? formatInTimezone(relationship.startDate, relationship.relationshipTimezone, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Not set yet";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
    // Determine dynamic greeting based on relationship timezone or local
    const tz = relationship?.relationshipTimezone || detectTimezone();
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "numeric",
        hour12: false
      }).formatToParts(new Date());
      const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "12", 10);
      
      if (hour >= 5 && hour < 12) setGreeting("Good morning");
      else if (hour >= 12 && hour < 17) setGreeting("Good afternoon");
      else if (hour >= 17 && hour < 21) setGreeting("Good evening");
      else setGreeting("Good evening");
    } catch {
      setGreeting("Hello");
    }
  }, [relationship?.relationshipTimezone]);

  const handleAccountSave = () => {
    if (!profile) return;
    startAccountTransition(async () => {
      try {
        await profileService.updateOwnProfile({
          displayName: effectiveDisplayName,
        });
        await refreshProfile();
        setDisplayNameDraft(undefined);
        toast.success("Profile updated.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update your profile.");
      }
    });
  };

  const handleAvatarUpdate = async (url: string) => {
    startAccountTransition(async () => {
      try {
        await profileService.updateOwnProfile({ avatar: url });
        await refreshProfile();
      } catch {
        toast.error("Avatar updated but failed to save to profile.");
      }
    });
  };

  const handleTimezoneSave = () => {
    const trimmedTimezone = effectiveTimezoneDraft.trim();
    if (!isValidTimezone(trimmedTimezone)) {
      toast.error("Please choose a valid IANA timezone.");
      return;
    }

    startTimezoneTransition(async () => {
      try {
        await profileService.updateOwnProfile({ timezone: trimmedTimezone });
        await refreshProfile();
        setTimezoneDraft(undefined);
        toast.success("Timezone updated.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update timezone.");
      }
    });
  };

  const handleUseDetectedTimezone = () => {
    setTimezoneDraft(detectedTimezone);
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-emerald-50/30 px-4 py-4 pb-32 dark:bg-emerald-950/20 sm:px-6 sm:py-6 sm:pb-10">
      <AmbientParticles />
      {relationship?.relationshipTimezone && (
        <RelationshipAmbientBackdrop timezone={relationship.relationshipTimezone} />
      )}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.12),transparent_32%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.1),transparent_36%)]" />

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* HERO SECTION */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="rounded-[1.85rem] border border-white/12 bg-zinc-950/52 px-5 py-4 shadow-[0_24px_80px_rgba(0,0,0,0.26)] backdrop-blur-2xl sm:px-6 sm:py-5"
        >
          <div className="flex flex-col gap-2">
            <div>
              <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-zinc-100">
                <ArrowLeft className="h-4 w-4" />
                Back to jar
              </Link>
            </div>
            
            <div className="mt-1 flex items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-rose-100/70">
                <HeartHandshake className="h-3.5 w-3.5 text-rose-300" />
                PROFILE
              </div>
            </div>

            <h1 className="mt-1 font-cormorant text-4xl leading-none text-zinc-50 sm:text-5xl">
              {greeting}, {profile?.display_name?.split(' ')[0] || "there"}.
            </h1>
            
            <p className="mt-1 text-base text-zinc-300/90 font-medium">
              {typeof stats?.togetherDays === "number" ? `${stats.togetherDays} days together.` : "Counting..."}
            </p>
            <p className="text-sm text-zinc-400/90">
              &quot;The jar has quietly kept {stats?.totalMemories ?? 0} memories for both of you.&quot;
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-white/5 px-2.5 py-1 text-xs text-zinc-300">
                <CalendarHeart className="h-3 w-3 text-emerald-400" />
                {typeof stats?.togetherDays === "number" ? `${stats.togetherDays} days` : "..."}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-white/5 px-2.5 py-1 text-xs text-zinc-300">
                <Star className="h-3 w-3 text-rose-400" />
                Since {relationship?.startDate ? formatInTimezone(relationship.startDate, relationship.relationshipTimezone, { month: "short", day: "numeric", year: "numeric" }) : "..."}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-white/5 px-2.5 py-1 text-xs text-zinc-300">
                <UserRound className="h-3 w-3 text-sky-400" />
                {relationship?.partnerName ?? "Partner"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-white/5 px-2.5 py-1 text-xs text-zinc-300">
                <Globe2 className="h-3 w-3 text-indigo-400" />
                {relationship?.relationshipTimezone ?? "UTC"}
              </span>
            </div>
          </div>
        </motion.div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            {/* ACCOUNT */}
            <SectionShell
              title="Account"
              subtitle="Keep your face and name feeling like home."
              icon={UserRound}
            >
              <div className="grid gap-5 lg:grid-cols-[minmax(0,12rem)_1fr] items-start">
                <AvatarUploader 
                  currentAvatarUrl={profile?.avatar || undefined}
                  displayName={profile?.display_name || undefined}
                  onAvatarChange={handleAvatarUpdate}
                />

                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="display-name" className="text-zinc-200">Display Name</Label>
                      <Input
                         id="display-name"
                         value={effectiveDisplayName}
                         onChange={(event) => setDisplayNameDraft(event.target.value)}
                         className="h-11 rounded-[1rem] border-white/10 bg-white/[0.03] px-3 text-zinc-100"
                         placeholder="How should the jar call you?"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-zinc-200">Username</Label>
                      <Input
                        id="username"
                        value={profile?.username ?? ""}
                        readOnly
                        className="h-11 rounded-[1rem] border-white/10 bg-white/[0.02] px-3 text-zinc-400"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <DetailRow label="Email" value={profile?.email ?? "Unavailable"} tone="muted" />
                    <DetailRow label="Joined" value={joinedDate} tone="muted" />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.1rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                    <p className="text-sm text-zinc-400">
                      We keep your username read-only here so the rest of the jar stays familiar.
                    </p>
                    <Button
                      onClick={handleAccountSave}
                      disabled={!profile || !isAccountDirty || isAccountPending}
                      className="h-10 rounded-full px-5"
                    >
                      {isAccountPending ? "Saving..." : "Save account"}
                    </Button>
                  </div>
                </div>
              </div>
            </SectionShell>

            {/* TIMEZONE */}
            <SectionShell
              title="Timezone"
              subtitle="Let date-only memories still unlock at the exact right shared moment."
              icon={Clock3}
            >
              <div className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <DetailRow label="Your timezone" value={detectedTimezone} />
                  <DetailRow
                    label="Current mode"
                    value={
                      <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-200">
                        {timezoneSource}
                      </span>
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-timezone" className="text-zinc-200">Manual selection</Label>
                  <Input
                    id="profile-timezone"
                    list="profile-timezone-options"
                    value={effectiveTimezoneDraft}
                    onChange={(event) => setTimezoneDraft(event.target.value)}
                    className="h-11 rounded-[1rem] border-white/10 bg-white/[0.03] px-3 text-zinc-100"
                    placeholder="Asia/Ho_Chi_Minh"
                  />
                  <datalist id="profile-timezone-options">
                    {supportedTimezones.map((timezone) => (
                      <option key={timezone} value={timezone} />
                    ))}
                  </datalist>
                  <p className="text-sm text-zinc-400">
                    Your memories always unlock using the shared relationship timezone.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.1rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                  <Button
                    variant="outline"
                    onClick={handleUseDetectedTimezone}
                    className="h-10 rounded-full border-white/10 bg-white/[0.03] px-5 text-zinc-100 hover:bg-white/[0.06]"
                  >
                    Use detected automatically
                  </Button>
                  <Button
                    onClick={handleTimezoneSave}
                    disabled={!profile || !isTimezoneDirty || isTimezonePending}
                    className="h-10 rounded-full px-5"
                  >
                    {isTimezonePending ? "Saving..." : "Keep this time"}
                  </Button>
                </div>
              </div>
            </SectionShell>

            {/* RELATIONSHIP */}
            <SectionShell
              title="Our Beginning"
              subtitle="A quick read on the shared part of the story."
              icon={HeartHandshake}
            >
              <div className="mb-4 rounded-[1.1rem] border border-rose-500/20 bg-rose-500/5 px-5 py-4 text-center">
                <Heart className="mx-auto h-6 w-6 text-rose-400 mb-2" />
                <p className="text-lg font-medium text-rose-100">Together {typeof stats?.togetherDays === "number" ? `${stats.togetherDays} Days` : "Counting..."}</p>
                <p className="text-sm text-rose-200/70">Since {relationshipStarted}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <DetailRow
                  label="Partner"
                  value={
                    <div className="inline-flex items-center gap-2">
                      <span>{relationship?.partnerName ?? "Waiting for your person"}</span>
                      {relationship?.partnerId && (
                        <span
                          className={cn(
                            "inline-flex h-2.5 w-2.5 rounded-full",
                            partnerOnline ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.65)]" : "bg-zinc-500",
                          )}
                          aria-label={partnerOnline ? "Partner online" : "Partner offline"}
                        />
                      )}
                    </div>
                  }
                />
                <DetailRow
                  label="Relationship timezone"
                  value={relationship?.relationshipTimezone ?? "UTC"}
                />
                <DetailRow
                  label="Anniversary type"
                  value={relationship?.anniversaryType ?? "yearly"}
                />
                <DetailRow
                  label="Invite code"
                  value="Not needed while you're already together."
                  tone="muted"
                />
              </div>
            </SectionShell>
          </div>

          <div className="space-y-4">
            {/* STATISTICS */}
            <SectionShell
              title="Little Moments"
              subtitle="Just the little counts that make your keepsake feel alive."
              icon={Sparkles}
              className="relative"
            >

              <div className="grid grid-cols-2 gap-3 mt-2">
                {STATS_ITEMS.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <div
                      key={item.key}
                      className="rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-4 py-4 relative overflow-hidden group hover:bg-white/[0.05] transition-colors"
                    >
                      <ItemIcon className="absolute -right-3 -bottom-3 h-16 w-16 text-white/[0.02] group-hover:text-white/[0.04] transition-colors" />
                      <div className="flex items-center gap-2">
                        <ItemIcon className="h-3.5 w-3.5 text-zinc-400" />
                        <p className="text-xs uppercase tracking-[0.15em] text-zinc-400">{item.label}</p>
                      </div>
                      <p className="mt-3 font-cormorant text-4xl leading-none text-zinc-50 relative z-10">
                        {statsLoading ? "..." : stats?.[item.key] ?? 0}
                      </p>
                    </div>
                  );
                })}
              </div>
            </SectionShell>

            {/* NOTIFICATIONS */}
            <SectionShell
              title="Notifications"
              subtitle="How you hear from the jar."
              icon={MessageSquare}
            >
              <div className="flex items-center justify-between rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-4 py-4 opacity-75">
                <div>
                  <p className="text-sm text-zinc-100">Preference controls</p>
                  <p className="text-xs text-zinc-400 mt-1">Preference controls will arrive in a future update.</p>
                </div>
                <div className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-500 border border-white/10">
                  Available soon
                </div>
              </div>
            </SectionShell>

            {/* APPEARANCE */}
            <SectionShell
              title="Appearance"
              subtitle="Future-ready controls for how the jar feels around you."
              icon={Palette}
            >
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Theme</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {[
                      { value: "light", label: "Light", icon: SunMedium },
                      { value: "dark", label: "Dark", icon: MoonStar },
                      { value: "system", label: "System", icon: Sparkles },
                    ].map((option) => {
                      const Icon = option.icon;
                      const active = isMounted && theme === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setTheme(option.value)}
                          className={cn(
                            "flex min-h-[56px] items-center justify-between rounded-[1.1rem] border px-4 py-3 text-left transition-colors",
                            active
                              ? "border-emerald-400/60 bg-emerald-400/14 text-zinc-50"
                              : "border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.05]",
                          )}
                        >
                          <span className="text-sm font-medium">{option.label}</span>
                          <Icon className={cn("h-4 w-4", active ? "text-emerald-300" : "text-zinc-500")} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-3">
                  {[
                    { label: "Ambient effects" },
                    { label: "Reduced motion" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-4 py-3 opacity-75"
                    >
                      <p className="text-sm text-zinc-100">{item.label}</p>
                      <div className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-500 border border-white/10">
                        Available soon
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SectionShell>
            
            <SecuritySettingsCard />

            {/* LOGOUT */}
            <SectionShell
              title="Logout"
              subtitle="Leave gently and come back to the same jar later."
              icon={LogOut}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.1rem] border border-white/8 bg-white/[0.03] px-4 py-4">
                <p className="max-w-[14rem] text-sm text-zinc-400">
                  This reuses the existing sign-out flow, so your session closes cleanly.
                </p>
                <Button
                  variant="destructive"
                  onClick={() => startLogoutTransition(async () => { await logoutAction(); })}
                  disabled={isLogoutPending}
                  className="h-10 rounded-full px-5"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {isLogoutPending ? "Logging out..." : "Log out"}
                </Button>
              </div>
            </SectionShell>
          </div>
        </div>

        {isLoading && (
          <div className="mt-5 rounded-full border border-white/10 bg-zinc-950/45 px-4 py-2 text-center text-sm text-zinc-200 backdrop-blur-xl">
            Gathering your profile details...
          </div>
        )}
      </div>
    </main>
  );
}

// Ensure SunMedium is accessible since it wasn't in the new import list
import { SunMedium } from "lucide-react";
