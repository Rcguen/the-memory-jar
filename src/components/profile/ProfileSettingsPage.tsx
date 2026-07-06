"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  Clock3,
  HeartHandshake,
  LogOut,
  Mail,
  MoonStar,
  Palette,
  Sparkles,
  SunMedium,
  UserRound,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RelationshipAmbientBackdrop } from "@/components/experience/RelationshipAmbientBackdrop";
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

const STATS_ITEMS: Array<{ key: StatsKey; label: string }> = [
  { key: "totalMemories", label: "Memories" },
  { key: "totalLetters", label: "Letters" },
  { key: "totalPhotos", label: "Photos" },
  { key: "totalVideos", label: "Videos" },
  { key: "totalVoices", label: "Voice Notes" },
  { key: "favorites", label: "Favorites" },
  { key: "totalPinned", label: "Pinned" },
  { key: "totalCapsules", label: "Capsules" },
  { key: "totalComments", label: "Comments" },
  { key: "totalReactions", label: "Reactions" },
];

const NOTIFICATION_ITEMS = [
  "Time Capsule",
  "Comments",
  "Reactions",
  "On This Day",
] as const;

function SectionShell({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: typeof UserRound;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[1.6rem] border border-white/12 bg-zinc-950/58 shadow-[0_22px_80px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
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

function DetailRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "muted";
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[1.1rem] border border-white/8 bg-white/[0.03] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</span>
      <span className={cn("text-sm text-zinc-100", tone === "muted" && "text-zinc-400")}>{value}</span>
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
  const [avatarDraft, setAvatarDraft] = useState<string | undefined>(profile?.avatar ?? "");
  const [timezoneDraft, setTimezoneDraft] = useState<string | undefined>(profile?.timezone ?? undefined);
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
  const effectiveAvatar = avatarDraft ?? profile?.avatar ?? "";
  const effectiveTimezoneDraft = timezoneDraft ?? currentTimezone;
  const timezoneSource =
    profile?.timezone && normalizeTimezone(profile.timezone) !== detectedTimezone
      ? "Manually selected"
      : "Detected automatically";

  const isAccountDirty =
    !!profile &&
    (effectiveDisplayName.trim() !== profile.display_name ||
      (effectiveAvatar.trim() || "") !== (profile.avatar ?? ""));

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

  const handleAccountSave = () => {
    if (!profile) return;

    startAccountTransition(async () => {
      try {
        await profileService.updateOwnProfile({
          displayName: effectiveDisplayName,
          avatar: effectiveAvatar,
        });
        await refreshProfile();
        setDisplayNameDraft(undefined);
        setAvatarDraft(undefined);
        toast.success("Profile updated.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update your profile.");
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
    <main className="relative min-h-screen overflow-x-hidden bg-emerald-50/30 px-4 py-6 pb-32 dark:bg-emerald-950/20 sm:px-6 sm:py-8 sm:pb-10">
      {relationship?.relationshipTimezone && (
        <RelationshipAmbientBackdrop timezone={relationship.relationshipTimezone} />
      )}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.12),transparent_32%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.1),transparent_36%)]" />

      <div className="relative z-10 mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="rounded-[1.85rem] border border-white/12 bg-zinc-950/52 px-5 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.26)] backdrop-blur-2xl sm:px-7 sm:py-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-zinc-100">
                <ArrowLeft className="h-4 w-4" />
                Back to jar
              </Link>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-rose-100/70">
                <HeartHandshake className="h-3.5 w-3.5 text-rose-300" />
                Profile Settings
              </div>
              <h1 className="mt-4 font-cormorant text-5xl leading-none text-zinc-50 sm:text-6xl">
                Your corner of the jar
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-zinc-300/85 sm:text-base">
                A gentle place to keep your name, timezone, relationship details, and the little stats that say your story is still growing.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
              <Avatar data-size="lg" className="h-11 w-11">
                <AvatarImage src={avatarDraft || profile?.avatar || ""} alt={profile?.display_name ?? "Profile"} />
                <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {profile?.display_name?.charAt(0) ?? "M"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-zinc-100">{profile?.display_name ?? "Loading..."}</p>
                <p className="text-xs text-zinc-400">{profile ? `@${profile.username}` : "Finding your name..."}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <SectionShell
              title="Account"
              subtitle="Keep your face and name feeling like home."
              icon={UserRound}
            >
              <div className="grid gap-5 lg:grid-cols-[minmax(0,11rem)_1fr]">
                <div className="rounded-[1.3rem] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-col items-center text-center">
                    <Avatar data-size="lg" className="h-24 w-24">
                      <AvatarImage src={avatarDraft || profile?.avatar || ""} alt={profile?.display_name ?? "Profile"} />
                      <AvatarFallback className="bg-emerald-100 text-2xl text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        {profile?.display_name?.charAt(0) ?? "M"}
                      </AvatarFallback>
                    </Avatar>
                    <p className="mt-4 text-sm text-zinc-300">Paste an avatar image URL to refresh the little portrait used across the jar.</p>
                  </div>
                </div>

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

                  <div className="space-y-2">
                    <Label htmlFor="avatar-url" className="text-zinc-200">Avatar URL</Label>
                    <Input
                      id="avatar-url"
                      value={effectiveAvatar}
                      onChange={(event) => setAvatarDraft(event.target.value)}
                      className="h-11 rounded-[1rem] border-white/10 bg-white/[0.03] px-3 text-zinc-100"
                      placeholder="https://..."
                    />
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

            <SectionShell
              title="Timezone"
              subtitle="Let date-only memories still unlock at the exact right shared moment."
              icon={Clock3}
            >
              <div className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <DetailRow label="Detected timezone" value={detectedTimezone} />
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
                  <Label htmlFor="profile-timezone" className="text-zinc-200">Manual override</Label>
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
                    Manual values stay manual. Automatic detection only fills the profile when no timezone has been saved yet.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.1rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                  <Button
                    variant="outline"
                    onClick={handleUseDetectedTimezone}
                    className="h-10 rounded-full border-white/10 bg-white/[0.03] px-5 text-zinc-100 hover:bg-white/[0.06]"
                  >
                    Use detected timezone
                  </Button>
                  <Button
                    onClick={handleTimezoneSave}
                    disabled={!profile || !isTimezoneDirty || isTimezonePending}
                    className="h-10 rounded-full px-5"
                  >
                    {isTimezonePending ? "Saving..." : "Save timezone"}
                  </Button>
                </div>
              </div>
            </SectionShell>

            <SectionShell
              title="Relationship"
              subtitle="A quick read on the shared part of the story."
              icon={HeartHandshake}
            >
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
                <DetailRow label="Relationship started" value={relationshipStarted} />
                <DetailRow
                  label="Days together"
                  value={typeof stats?.togetherDays === "number" ? `${stats.togetherDays} days` : "Counting..."}
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

          <div className="space-y-5">
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
                      const active = theme === option.value;
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
                    { label: "Ambient effects", description: "Coming soon" },
                    { label: "Reduced motion", description: "Coming soon" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-4 py-3 opacity-75"
                    >
                      <div>
                        <p className="text-sm text-zinc-100">{item.label}</p>
                        <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{item.description}</p>
                      </div>
                      <input
                        type="checkbox"
                        disabled
                        aria-label={`${item.label} coming soon`}
                        className="h-5 w-5 rounded border-white/15 bg-white/5 accent-emerald-400"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </SectionShell>

            <SectionShell
              title="Notifications"
              subtitle="Preference storage can drop in here once that wiring is ready."
              icon={Bell}
            >
              <div className="space-y-3">
                {NOTIFICATION_ITEMS.map((item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-4 py-3 opacity-75"
                  >
                    <div>
                      <p className="text-sm text-zinc-100">{item}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Coming soon</p>
                    </div>
                    <input
                      type="checkbox"
                      disabled
                      aria-label={`${item} notifications coming soon`}
                      className="h-5 w-5 rounded border-white/15 bg-white/5 accent-emerald-400"
                    />
                  </div>
                ))}
              </div>
            </SectionShell>

            <SectionShell
              title="Statistics"
              subtitle="Just the little counts that make your keepsake feel alive."
              icon={Sparkles}
            >
              <div className="grid grid-cols-2 gap-3">
                {STATS_ITEMS.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-4 py-4"
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{item.label}</p>
                    <p className="mt-2 font-cormorant text-4xl leading-none text-zinc-50">
                      {statsLoading ? "..." : stats?.[item.key] ?? 0}
                    </p>
                  </div>
                ))}
              </div>
            </SectionShell>

            <SectionShell
              title="Logout"
              subtitle="Leave gently and come back to the same jar later."
              icon={Mail}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.1rem] border border-white/8 bg-white/[0.03] px-4 py-4">
                <p className="max-w-md text-sm text-zinc-400">
                  This reuses the existing sign-out flow, so your session closes cleanly without touching your memories.
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
