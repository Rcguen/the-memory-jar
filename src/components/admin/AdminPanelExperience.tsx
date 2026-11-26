"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Database,
  Users,
  Activity,
  Search,
  ArrowLeft,
  Eye,
  RefreshCw,
  FileText,
  Heart,
  X,
  Terminal,
  Cpu,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { isAdminAuthorized } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/client";

type TabKey = "overview" | "memories" | "users" | "activity" | "system";

interface AdminMemory {
  id: string;
  relationship_id: string;
  created_by: string;
  title: string | null;
  content: string | null;
  type: string;
  status: string;
  capsule_style: string | null;
  theme: string | null;
  decorations: string[] | null;
  paper_style: string | null;
  mood_id: string | null;
  soundtrack: Record<string, unknown> | null;
  is_collaborative: boolean;
  is_favorite: boolean;
  is_pinned: boolean;
  unlock_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface AdminProfile {
  id: string;
  username: string;
  display_name: string;
  email: string | null;
  avatar: string | null;
  timezone: string | null;
  created_at: string;
}

interface AdminRelationship {
  id: string;
  start_date: string;
  timezone: string;
  anniversary_type: string;
  created_at: string;
}

interface AdminAttachment {
  id: string;
  memory_id: string;
  file_type: string;
  file_size: number | null;
  created_at: string;
}

interface AdminActivityLog {
  id: string;
  relationship_id: string;
  user_id: string;
  action: string;
  target_type: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export function AdminPanelExperience() {
  const { profile, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Data states
  const [memories, setMemories] = useState<AdminMemory[]>([]);
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [relationship, setRelationship] = useState<AdminRelationship | null>(null);
  const [attachments, setAttachments] = useState<AdminAttachment[]>([]);
  const [activityLogs, setActivityLogs] = useState<AdminActivityLog[]>([]);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMemory, setSelectedMemory] = useState<AdminMemory | null>(null);

  // Client guard
  useEffect(() => {
    if (!isAuthLoading && !isAdminAuthorized(profile)) {
      router.replace("/");
    }
  }, [isAuthLoading, profile, router]);

  // Load telemetry data
  const loadData = useCallback(async () => {
    setIsLoadingData(true);
    const supabase = createClient();

    try {
      // 1. Fetch memories
      const { data: memData } = await supabase
        .from("memories")
        .select("*")
        .order("created_at", { ascending: false });
      if (memData) setMemories(memData as AdminMemory[]);

      // 2. Fetch profiles
      const { data: profData } = await supabase
        .from("profiles")
        .select("id, username, display_name, email, avatar, timezone, created_at")
        .order("created_at", { ascending: true });
      if (profData) setProfiles(profData as AdminProfile[]);

      // 3. Fetch relationships
      const { data: relData } = await supabase
        .from("relationships")
        .select("id, start_date, timezone, anniversary_type, created_at")
        .limit(1)
        .maybeSingle();
      if (relData) setRelationship(relData as AdminRelationship);

      // 4. Fetch attachments
      const { data: attData } = await supabase
        .from("memory_attachments")
        .select("id, memory_id, file_type, file_size, created_at");
      if (attData) setAttachments(attData as AdminAttachment[]);

      // 5. Fetch activity logs
      const { data: actData } = await supabase
        .from("activity_logs")
        .select("id, relationship_id, user_id, action, target_type, created_at, metadata")
        .order("created_at", { ascending: false })
        .limit(50);
      if (actData) setActivityLogs(actData as AdminActivityLog[]);

      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Admin telemetry error:", err);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdminAuthorized(profile)) return;
    let isCancelled = false;

    async function initialFetch() {
      const supabase = createClient();
      try {
        const [memRes, profRes, relRes, attRes, actRes] = await Promise.all([
          supabase.from("memories").select("*").order("created_at", { ascending: false }),
          supabase.from("profiles").select("id, username, display_name, email, avatar, timezone, created_at").order("created_at", { ascending: true }),
          supabase.from("relationships").select("id, start_date, timezone, anniversary_type, created_at").limit(1).maybeSingle(),
          supabase.from("memory_attachments").select("id, memory_id, file_type, file_size, created_at"),
          supabase.from("activity_logs").select("id, relationship_id, user_id, action, target_type, created_at, metadata").order("created_at", { ascending: false }).limit(50),
        ]);

        if (!isCancelled) {
          if (memRes.data) setMemories(memRes.data as AdminMemory[]);
          if (profRes.data) setProfiles(profRes.data as AdminProfile[]);
          if (relRes.data) setRelationship(relRes.data as AdminRelationship);
          if (attRes.data) setAttachments(attRes.data as AdminAttachment[]);
          if (actRes.data) setActivityLogs(actRes.data as AdminActivityLog[]);
          setIsLoadingData(false);
          setLastRefreshed(new Date());
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Admin telemetry fetch error:", err);
          setIsLoadingData(false);
        }
      }
    }

    void initialFetch();

    return () => {
      isCancelled = true;
    };
  }, [profile]);

  // Metrics calculations
  const totalMemories = memories.length;
  const activeMemories = memories.filter((m) => !m.deleted_at).length;
  const deletedMemories = memories.filter((m) => !!m.deleted_at).length;
  const sealedCapsules = memories.filter((m) => m.status === "sealed").length;
  const totalAttachments = attachments.length;

  const startDate = relationship?.start_date;
  const daysTogether = useMemo(() => {
    if (!startDate) return null;
    const startMs = new Date(startDate).getTime();
    if (isNaN(startMs)) return null;
    return Math.max(0, Math.floor((lastRefreshed.getTime() - startMs) / (1000 * 60 * 60 * 24)));
  }, [startDate, lastRefreshed]);

  const totalAttachmentBytes = useMemo(() => {
    return attachments.reduce((acc, curr) => acc + (curr.file_size || 0), 0);
  }, [attachments]);

  const prettyBytes = (bytes: number) => {
    if (bytes === 0) return "0 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Group memories by type for telemetry chart
  const typeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of memories) {
      counts[m.type] = (counts[m.type] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [memories]);

  // Filtered memories list
  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      const matchSearch =
        !searchQuery ||
        (m.title && m.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.content && m.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchType = typeFilter === "all" || m.type === typeFilter;
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "deleted" ? !!m.deleted_at : m.status === statusFilter);

      return matchSearch && matchType && matchStatus;
    });
  }, [memories, searchQuery, typeFilter, statusFilter]);

  if (isAuthLoading || !isAdminAuthorized(profile)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--text-primary)] font-sans">
      {/* Top Quiet Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-[var(--divider)] bg-[var(--surface-wood)]/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--divider)] bg-[var(--surface-raised)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] active:scale-[0.97]"
              aria-label="Return to Jar"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              <span className="flex h-6 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 text-xs font-medium text-emerald-400">
                <Shield className="h-3 w-3" />
                Admin Console
              </span>
              <span className="text-xs text-[var(--text-tertiary)] hidden sm:inline">
                {profile?.display_name} (@{profile?.username})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => void loadData()}
              disabled={isLoadingData}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--divider)] bg-[var(--surface-raised)] px-2.5 text-xs text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] active:scale-[0.97] disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isLoadingData ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <span className="text-[11px] font-mono text-[var(--text-tertiary)] hidden md:inline">
              Sync: {lastRefreshed.toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Tab Navigation (Nested Radii, 4px scale) */}
        <div className="mx-auto flex max-w-7xl overflow-x-auto px-4 pb-2 pt-1 sm:px-6 panel-scroll">
          <nav className="inline-flex rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)]/60 p-1 text-xs">
            {(
              [
                { key: "overview", label: "Overview", icon: Cpu },
                { key: "memories", label: `Memories (${totalMemories})`, icon: Database },
                { key: "users", label: `Users (${profiles.length})`, icon: Users },
                { key: "activity", label: `Audit trail (${activityLogs.length})`, icon: Activity },
                { key: "system", label: "Security & limits", icon: Terminal },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all active:scale-[0.98] ${
                    isActive
                      ? "bg-[var(--surface-paper)] text-[var(--text-primary)] shadow-sm border border-[var(--divider)]"
                      : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 page-safe-bottom">
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Top Stat Row: 4 Real Numbers, No Gimmicks, Tabular Nums */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] p-4">
                <span className="text-xs text-[var(--text-tertiary)]">Total keepsakes</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                    {totalMemories}
                  </span>
                  <span className="text-xs text-emerald-500 font-mono">
                    {activeMemories} active
                  </span>
                </div>
                <span className="mt-2 block text-[11px] text-[var(--text-caption)]">
                  {deletedMemories > 0 ? `${deletedMemories} in trash` : "0 deleted"}
                </span>
              </div>

              <div className="rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] p-4">
                <span className="text-xs text-[var(--text-tertiary)]">Stored attachments</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                    {totalAttachments}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)] font-mono">
                    {prettyBytes(totalAttachmentBytes)}
                  </span>
                </div>
                <span className="mt-2 block text-[11px] text-[var(--text-caption)]">
                  Images, audio & video
                </span>
              </div>

              <div className="rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] p-4">
                <span className="text-xs text-[var(--text-tertiary)]">Sealed capsules</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                    {sealedCapsules}
                  </span>
                  <span className="text-xs text-amber-500 font-mono">
                    {memories.filter((m) => m.unlock_at).length} total
                  </span>
                </div>
                <span className="mt-2 block text-[11px] text-[var(--text-caption)]">
                  Awaiting scheduled dates
                </span>
              </div>

              <div className="rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] p-4">
                <span className="text-xs text-[var(--text-tertiary)]">Relationship days</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                    {daysTogether !== null ? daysTogether : "—"}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)]">days</span>
                </div>
                <span className="mt-2 block text-[11px] text-[var(--text-caption)]">
                  {relationship?.anniversary_type === "monthly" ? "Monthly cadence" : "Yearly cadence"}
                </span>
              </div>
            </div>

            {/* One Bright Element: Unslop Craft Distribution Telemetry */}
            <div className="rounded-2xl border border-[var(--divider)] bg-[var(--surface-raised)] p-5">
              <div className="flex items-center justify-between border-b border-[var(--divider)] pb-4">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                    Keepsake distribution by type
                  </h2>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    Proportion of memory archetypes stored in database
                  </p>
                </div>
                <span className="font-mono text-xs text-[var(--text-caption)]">
                  {totalMemories} records
                </span>
              </div>

              {/* Graphical Stacked Distribution Bar */}
              <div className="mt-4">
                <div className="flex h-5 w-full overflow-hidden rounded-md bg-[var(--surface-paper)]">
                  {typeDistribution.map(([type, count]) => {
                    const pct = totalMemories > 0 ? (count / totalMemories) * 100 : 0;
                    return (
                      <div
                        key={type}
                        style={{ width: `${pct}%` }}
                        className="group relative h-full transition-opacity hover:opacity-85"
                        title={`${type}: ${count} (${pct.toFixed(1)}%)`}
                      >
                        <div
                          className={`h-full border-r border-[var(--surface-base)] ${
                            type === "photo"
                              ? "bg-amber-600/70"
                              : type === "letter"
                              ? "bg-emerald-600/70"
                              : type === "promise"
                              ? "bg-rose-600/70"
                              : type === "voice"
                              ? "bg-blue-600/70"
                              : type === "video"
                              ? "bg-purple-600/70"
                              : type === "travel"
                              ? "bg-teal-600/70"
                              : type === "wish"
                              ? "bg-yellow-600/70"
                              : type === "gratitude"
                              ? "bg-pink-600/70"
                              : "bg-zinc-600/70"
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Legend Chips */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {typeDistribution.map(([type, count]) => {
                    const pct = totalMemories > 0 ? ((count / totalMemories) * 100).toFixed(0) : 0;
                    return (
                      <div
                        key={type}
                        className="inline-flex items-center gap-1.5 rounded-md border border-[var(--divider)] bg-[var(--surface-paper)]/70 px-2.5 py-1 text-xs"
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            type === "photo"
                              ? "bg-amber-500"
                              : type === "letter"
                              ? "bg-emerald-500"
                              : type === "promise"
                              ? "bg-rose-500"
                              : type === "voice"
                              ? "bg-blue-500"
                              : type === "video"
                              ? "bg-purple-500"
                              : type === "travel"
                              ? "bg-teal-500"
                              : type === "wish"
                              ? "bg-yellow-500"
                              : type === "gratitude"
                              ? "bg-pink-500"
                              : "bg-zinc-500"
                          }`}
                        />
                        <span className="capitalize text-[var(--text-secondary)]">{type}</span>
                        <span className="font-mono text-[var(--text-tertiary)]">
                          {count} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick Overview Columns */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Member Accounts List */}
              <div className="rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] p-4">
                <div className="flex items-center justify-between border-b border-[var(--divider)] pb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Coupled accounts
                  </h3>
                  <span className="font-mono text-xs text-[var(--text-caption)]">
                    {profiles.length} registered
                  </span>
                </div>
                <div className="mt-3 divide-y divide-[var(--divider)]">
                  {profiles.map((p) => {
                    const isCurrent = p.id === profile?.id;
                    const isAdm = p.email === "phu.nt2710@gmail.com" || p.username === "phu";
                    return (
                      <div key={p.id} className="flex items-center justify-between py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-paper)] text-xs font-semibold text-[var(--text-primary)]">
                            {p.display_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-[var(--text-primary)]">
                                {p.display_name}
                              </span>
                              {isAdm && (
                                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                                  Admin
                                </span>
                              )}
                              {isCurrent && (
                                <span className="rounded bg-zinc-500/15 px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)]">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="block font-mono text-xs text-[var(--text-tertiary)]">
                              @{p.username} · {p.email || "No email"}
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] text-[var(--text-caption)] font-mono">
                          {p.timezone || "UTC"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Activity Mini Feed */}
              <div className="rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] p-4">
                <div className="flex items-center justify-between border-b border-[var(--divider)] pb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Latest event logs
                  </h3>
                  <button
                    onClick={() => setActiveTab("activity")}
                    className="text-xs text-[var(--accent-primary)] hover:underline"
                  >
                    View all
                  </button>
                </div>
                <div className="mt-3 space-y-2.5">
                  {activityLogs.slice(0, 5).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start justify-between rounded-lg border border-[var(--divider)]/50 bg-[var(--surface-paper)]/40 p-2.5 text-xs"
                    >
                      <div>
                        <span className="font-mono font-medium text-[var(--text-primary)]">
                          {log.action}
                        </span>
                        <span className="ml-1.5 text-[var(--text-tertiary)]">
                          on {log.target_type}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-[var(--text-caption)]">
                        {new Date(log.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                  {activityLogs.length === 0 && (
                    <p className="py-4 text-center text-xs text-[var(--text-tertiary)]">
                      No activity logs recorded yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MEMORIES EXPLORER */}
        {activeTab === "memories" && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-col gap-3 rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  placeholder="Search by title, content or UUID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-[var(--divider)] bg-[var(--surface-paper)] py-2 pl-9 pr-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-color)]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="rounded-lg border border-[var(--divider)] bg-[var(--surface-paper)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] focus:outline-none"
                >
                  <option value="all">All types</option>
                  <option value="photo">Photo</option>
                  <option value="letter">Letter</option>
                  <option value="promise">Promise</option>
                  <option value="voice">Voice</option>
                  <option value="video">Video</option>
                  <option value="travel">Travel</option>
                  <option value="wish">Wish</option>
                  <option value="gratitude">Gratitude</option>
                  <option value="random_thought">Thought</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-[var(--divider)] bg-[var(--surface-paper)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] focus:outline-none"
                >
                  <option value="all">All statuses</option>
                  <option value="sealed">Sealed</option>
                  <option value="unlocked">Unlocked</option>
                  <option value="pending_partner">Pending partner</option>
                  <option value="draft">Draft</option>
                  <option value="deleted">In trash</option>
                </select>
              </div>
            </div>

            {/* Table of Memories */}
            <div className="overflow-hidden rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[var(--divider)] bg-[var(--surface-paper)] text-[var(--text-tertiary)]">
                    <tr>
                      <th className="px-4 py-3 font-medium">Title & Archetype</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Theme</th>
                      <th className="px-4 py-3 font-medium">Author ID</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--divider)] font-sans">
                    {filteredMemories.map((m) => (
                      <tr
                        key={m.id}
                        className="transition-colors hover:bg-[var(--surface-paper)]/50"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[var(--text-primary)]">
                              {m.title || "Untitled keepsake"}
                            </span>
                            <span className="rounded bg-[var(--surface-paper)] px-1.5 py-0.5 text-[10px] capitalize text-[var(--text-tertiary)]">
                              {m.type}
                            </span>
                          </div>
                          {m.content && (
                            <p className="mt-0.5 line-clamp-1 text-[11px] text-[var(--text-caption)]">
                              {m.content}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              m.deleted_at
                                ? "bg-red-500/10 text-red-400"
                                : m.status === "sealed"
                                ? "bg-amber-500/10 text-amber-400"
                                : "bg-emerald-500/10 text-emerald-400"
                            }`}
                          >
                            {m.deleted_at ? "Trash" : m.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-[var(--text-tertiary)] capitalize">
                          {m.theme || "Standard"}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-[var(--text-tertiary)]">
                          {m.created_by.slice(0, 8)}...
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-[var(--text-tertiary)]">
                          {new Date(m.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelectedMemory(m)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--divider)] bg-[var(--surface-base)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] active:scale-[0.95]"
                            title="Inspect details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredMemories.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs text-[var(--text-tertiary)]">
                          No keepsakes match the current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: USERS & RELATIONSHIP */}
        {activeTab === "users" && (
          <div className="space-y-6">
            {/* Relationship Card */}
            {relationship && (
              <div className="rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] p-5">
                <div className="flex items-center justify-between border-b border-[var(--divider)] pb-3">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-rose-500" />
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                      Relationship parameters
                    </h2>
                  </div>
                  <span className="font-mono text-xs text-[var(--text-tertiary)]">
                    ID: {relationship.id}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
                  <div>
                    <span className="text-[var(--text-tertiary)]">Start date</span>
                    <p className="mt-1 font-mono text-sm font-medium text-[var(--text-primary)]">
                      {relationship.start_date}
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--text-tertiary)]">Timezone</span>
                    <p className="mt-1 font-mono text-sm font-medium text-[var(--text-primary)]">
                      {relationship.timezone}
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--text-tertiary)]">Anniversary cadence</span>
                    <p className="mt-1 font-mono text-sm font-medium text-[var(--text-primary)] capitalize">
                      {relationship.anniversary_type}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* User Cards Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {profiles.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] p-5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-paper)] text-sm font-semibold text-[var(--text-primary)]">
                        {p.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                          {p.display_name}
                        </h3>
                        <span className="font-mono text-xs text-[var(--text-tertiary)]">
                          @{p.username}
                        </span>
                      </div>
                    </div>
                    {p.username === "phu" && (
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-400">
                        Admin
                      </span>
                    )}
                  </div>

                  <div className="mt-4 space-y-2 border-t border-[var(--divider)] pt-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-tertiary)]">UUID</span>
                      <span className="font-mono text-[var(--text-secondary)]">{p.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-tertiary)]">Email</span>
                      <span className="font-mono text-[var(--text-secondary)]">
                        {p.email || "None"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-tertiary)]">Timezone</span>
                      <span className="font-mono text-[var(--text-secondary)]">
                        {p.timezone || "Not set"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-tertiary)]">Joined</span>
                      <span className="font-mono text-[var(--text-secondary)]">
                        {new Date(p.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT TRAIL */}
        {activeTab === "activity" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] p-4">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Activity & audit log
                </h2>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Recent actions and interactions recorded in the database
                </p>
              </div>
              <span className="font-mono text-xs text-[var(--text-caption)]">
                {activityLogs.length} events logged
              </span>
            </div>

            <div className="divide-y divide-[var(--divider)] rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] overflow-hidden">
              {activityLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col gap-1 p-3.5 text-xs sm:flex-row sm:items-center sm:justify-between hover:bg-[var(--surface-paper)]/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="rounded bg-[var(--surface-paper)] px-2 py-0.5 font-mono text-[11px] text-[var(--text-primary)]">
                      {log.action}
                    </span>
                    <span className="text-[var(--text-secondary)]">
                      Target: <span className="font-mono text-[var(--text-primary)]">{log.target_type}</span>
                    </span>
                    <span className="text-[var(--text-tertiary)] font-mono text-[10px]">
                      (User: {log.user_id.slice(0, 8)}...)
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-[var(--text-caption)]">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
              {activityLogs.length === 0 && (
                <p className="py-8 text-center text-xs text-[var(--text-tertiary)]">
                  No activity logs found.
                </p>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: SYSTEM & SECURITY MATRIX */}
        {activeTab === "system" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] p-5">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Access control & permissions matrix
              </h2>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                Role enforcement configured in <code className="font-mono text-[11px]">permissions.ts</code>
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
                {/* Admin Role */}
                <div className="rounded-lg border border-[var(--divider)] bg-[var(--surface-paper)]/70 p-4">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <Shield className="h-4 w-4" />
                    <span>Administrator Console Access</span>
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                    Full access to telemetry, keepsake inspector, and system metrics.
                  </p>
                  <div className="mt-3 space-y-1 font-mono text-[11px]">
                    <div className="text-emerald-400/90">• phu.nt2710@gmail.com</div>
                    <div className="text-[var(--text-tertiary)]">• username: phu</div>
                    <div className="text-[var(--text-tertiary)]">• UUID: d800d931...</div>
                  </div>
                </div>

                {/* Letters in Motion Role */}
                <div className="rounded-lg border border-[var(--divider)] bg-[var(--surface-paper)]/70 p-4">
                  <div className="flex items-center gap-2 text-violet-400 font-semibold">
                    <FileText className="h-4 w-4" />
                    <span>Letters in Motion (/animated-cards)</span>
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                    Exclusive access to interactive 3D anniversary letters.
                  </p>
                  <div className="mt-3 space-y-1 font-mono text-[11px]">
                    <div className="text-[var(--text-secondary)]">• ritchiguen10@gmail.com</div>
                    <div className="text-[var(--text-secondary)]">• floreskristine484@gmail.com</div>
                    <div className="text-emerald-400/90">• phu.nt2710@gmail.com</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Storage Buckets Overview */}
            <div className="rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] p-5">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Storage buckets telemetry
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { name: "memory-images", label: "Images", count: attachments.filter((a) => a.file_type === "image").length },
                  { name: "memory-voices", label: "Voice clips", count: attachments.filter((a) => a.file_type === "voice").length },
                  { name: "memory-videos", label: "Videos", count: attachments.filter((a) => a.file_type === "video").length },
                  { name: "memory-thumbnails", label: "Thumbnails", count: attachments.filter((a) => a.file_type === "thumbnail").length },
                ].map((b) => (
                  <div
                    key={b.name}
                    className="rounded-lg border border-[var(--divider)] bg-[var(--surface-paper)] p-3 text-xs"
                  >
                    <span className="font-mono text-[11px] text-[var(--text-tertiary)] block">
                      {b.name}
                    </span>
                    <span className="text-base font-semibold font-mono text-[var(--text-primary)] mt-1 block">
                      {b.count} files
                    </span>
                    <span className="text-[10px] text-[var(--text-caption)]">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Keepsake Inspection Drawer (Detail modal) */}
      <AnimatePresence>
        {selectedMemory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-[var(--divider)] bg-[var(--surface-raised)] p-6 shadow-2xl custom-scrollbar"
            >
              <div className="flex items-start justify-between border-b border-[var(--divider)] pb-4">
                <div>
                  <span className="rounded bg-[var(--surface-paper)] px-2 py-0.5 font-mono text-xs capitalize text-[var(--text-tertiary)]">
                    {selectedMemory.type}
                  </span>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-1">
                    {selectedMemory.title || "Untitled Keepsake"}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedMemory(null)}
                  className="rounded-lg border border-[var(--divider)] p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-[0.95]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs">
                {/* Content text */}
                {selectedMemory.content && (
                  <div className="rounded-lg border border-[var(--divider)] bg-[var(--surface-paper)] p-3.5">
                    <span className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
                      Text Content
                    </span>
                    <p className="whitespace-pre-wrap text-[var(--text-primary)] leading-relaxed">
                      {selectedMemory.content}
                    </p>
                  </div>
                )}

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
                  <div className="rounded-lg border border-[var(--divider)] bg-[var(--surface-paper)]/50 p-2.5">
                    <span className="text-[var(--text-tertiary)] block">ID</span>
                    <span className="text-[var(--text-primary)]">{selectedMemory.id}</span>
                  </div>
                  <div className="rounded-lg border border-[var(--divider)] bg-[var(--surface-paper)]/50 p-2.5">
                    <span className="text-[var(--text-tertiary)] block">Author</span>
                    <span className="text-[var(--text-primary)]">{selectedMemory.created_by}</span>
                  </div>
                  <div className="rounded-lg border border-[var(--divider)] bg-[var(--surface-paper)]/50 p-2.5">
                    <span className="text-[var(--text-tertiary)] block">Status</span>
                    <span className="text-[var(--text-primary)]">{selectedMemory.status}</span>
                  </div>
                  <div className="rounded-lg border border-[var(--divider)] bg-[var(--surface-paper)]/50 p-2.5">
                    <span className="text-[var(--text-tertiary)] block">Created</span>
                    <span className="text-[var(--text-primary)]">
                      {new Date(selectedMemory.created_at).toLocaleString()}
                    </span>
                  </div>
                  {selectedMemory.unlock_at && (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 col-span-2">
                      <span className="text-amber-400 block">Capsule Unlock Date</span>
                      <span className="text-amber-300 font-semibold">
                        {new Date(selectedMemory.unlock_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Raw JSON Payload */}
                <details className="rounded-lg border border-[var(--divider)] bg-[var(--surface-paper)]/30 p-3">
                  <summary className="cursor-pointer text-[11px] font-medium text-[var(--text-secondary)]">
                    Raw JSON payload
                  </summary>
                  <pre className="mt-2 overflow-x-auto p-2 bg-black/40 rounded text-[10px] font-mono text-zinc-300">
                    {JSON.stringify(selectedMemory, null, 2)}
                  </pre>
                </details>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
