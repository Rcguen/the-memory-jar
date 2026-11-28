"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
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
  Heart,
  X,
  Cpu,
  HardDrive,
  Key,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Trash2,
  RotateCcw,
  Lock,
  Sparkles,
  ChevronRight,
  Smartphone,
  Server,
  Camera,
  Mic,
  Video,
  BarChart3,
  Clock,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { isAdminAuthorized } from "@/lib/permissions";
import {
  getAdminDashboardTelemetry,
  adminSendPasswordReset,
  adminToggleMemorySoftDelete,
  adminPurgeDeletedMemories,
  type AdminDashboardPayload,
  type AdminTelemetryProfile,
  type AdminTelemetryRelationship,
  type AdminTelemetryMemory,
} from "@/app/actions/admin";

type TabKey = "overview" | "users" | "couples" | "memories" | "storage" | "audit";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

function prettyBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

const ARCHETYPE_COLORS: Record<string, string> = {
  photo: "bg-amber-400",
  letter: "bg-emerald-500",
  random_thought: "bg-sky-400",
  thought: "bg-sky-400",
  voice: "bg-violet-400",
  wish: "bg-yellow-300",
  gratitude: "bg-pink-400",
  video: "bg-indigo-400",
  travel: "bg-teal-400",
  promise: "bg-rose-400",
};

export function AdminPanelExperience() {
  const { profile } = useAuth();
  const [telemetry, setTelemetry] = useState<AdminDashboardPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Filters & Search
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | "coupled" | "uncoupled" | "admin">("all");
  const [relationshipSearch, setRelationshipSearch] = useState("");
  const [memorySearch, setMemorySearch] = useState("");
  const [memoryArchetypeFilter, setMemoryArchetypeFilter] = useState("all");
  const [memoryStatusFilter, setMemoryStatusFilter] = useState<"all" | "active" | "sealed" | "deleted">("all");
  const [memoryCoupleFilter, setMemoryCoupleFilter] = useState("all");
  const [storageSearch, setStorageSearch] = useState("");

  // Inspect Modals
  const [selectedUser, setSelectedUser] = useState<AdminTelemetryProfile | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<AdminTelemetryMemory | null>(null);
  const [showPurgeModal, setShowPurgeModal] = useState(false);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3600);
  }, []);

  const handleCopy = useCallback((text: string, id: string) => {
    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1800);
    }
  }, []);

  const refreshTelemetry = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAdminDashboardTelemetry();
      setTelemetry(data);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("[AdminPanel] Telemetry fetch failed:", err);
      showToast("Failed to sync telemetry. Verify service role permissions.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!isAdminAuthorized(profile)) return;
    let isMounted = true;

    async function initialFetch() {
      try {
        const data = await getAdminDashboardTelemetry();
        if (isMounted) {
          setTelemetry(data);
          setLastRefreshed(new Date());
          setIsLoading(false);
        }
      } catch (err) {
        console.error("[AdminPanel] Initial telemetry fetch failed:", err);
        if (isMounted) {
          showToast("Failed to load system telemetry.", "error");
          setIsLoading(false);
        }
      }
    }

    void initialFetch();
    return () => {
      isMounted = false;
    };
  }, [profile, showToast]);

  // Derived data
  const profiles = useMemo(() => telemetry?.profiles ?? [], [telemetry]);
  const relationships = useMemo(() => telemetry?.relationships ?? [], [telemetry]);
  const relationshipMembers = useMemo(() => telemetry?.relationshipMembers ?? [], [telemetry]);
  const memories = useMemo(() => telemetry?.memories ?? [], [telemetry]);
  const attachments = useMemo(() => telemetry?.attachments ?? [], [telemetry]);
  const activityLogs = useMemo(() => telemetry?.activityLogs ?? [], [telemetry]);
  const authUsers = useMemo(() => telemetry?.authUsers ?? [], [telemetry]);
  const pushCount = telemetry?.pushSubscriptionsCount ?? 0;

  const totalMemories = memories.length;
  const activeMemories = memories.filter((m) => !m.deleted_at).length;
  const deletedMemories = memories.filter((m) => !!m.deleted_at).length;
  const sealedCapsules = memories.filter((m) => m.status === "sealed").length;

  const totalAttachmentBytes = useMemo(() => {
    return attachments.reduce((sum, a) => sum + (a.file_size || 0), 0);
  }, [attachments]);

  const mediaTypeBreakdown = useMemo(() => {
    let imagesBytes = 0;
    let videoBytes = 0;
    let audioBytes = 0;
    let imageCount = 0;
    let videoCount = 0;
    let audioCount = 0;

    attachments.forEach((a) => {
      const size = a.file_size || 0;
      const type = (a.file_type || "").toLowerCase();
      if (type.includes("image") || type === "photo") {
        imagesBytes += size;
        imageCount++;
      } else if (type.includes("video")) {
        videoBytes += size;
        videoCount++;
      } else if (type.includes("audio") || type === "voice") {
        audioBytes += size;
        audioCount++;
      }
    });

    const total = imagesBytes + videoBytes + audioBytes || 1;
    return {
      imagesBytes,
      videoBytes,
      audioBytes,
      imageCount,
      videoCount,
      audioCount,
      imagePct: Math.round((imagesBytes / total) * 100),
      audioPct: Math.round((audioBytes / total) * 100),
      videoPct: Math.round((videoBytes / total) * 100),
    };
  }, [attachments]);

  // Monthly activity timeline computed from real memory timestamps
  const monthlyTimeline = useMemo(() => {
    const buckets: Record<string, { label: string; count: number; sortKey: string }> = {};
    memories.forEach((m) => {
      const d = new Date(m.created_at);
      if (isNaN(d.getTime())) return;
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      if (!buckets[sortKey]) {
        buckets[sortKey] = { label, count: 0, sortKey };
      }
      buckets[sortKey].count++;
    });

    const sorted = Object.values(buckets).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    const maxCount = Math.max(1, ...sorted.map((b) => b.count));
    return sorted.slice(-6).map((b) => ({
      ...b,
      heightPct: Math.max(12, Math.round((b.count / maxCount) * 100)),
    }));
  }, [memories]);

  const typeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    memories.forEach((m) => {
      const key = (m.type || "thought").toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([type, count]) => ({
        type,
        count,
        percentage: totalMemories > 0 ? Math.round((count / totalMemories) * 100) : 0,
        color: ARCHETYPE_COLORS[type] ?? "bg-zinc-400",
      }))
      .sort((a, b) => b.count - a.count);
  }, [memories, totalMemories]);

  const usersWithRelationship = useMemo(() => {
    return profiles.map((p) => {
      const authUser = authUsers.find((u) => u.id === p.id);
      const isUserAdmin = isAdminAuthorized({ id: p.id, email: p.email, username: p.username });
      let partnerProfile: AdminTelemetryProfile | null = null;
      let relRecord: AdminTelemetryRelationship | null = null;

      if (p.active_relationship_id) {
        relRecord = relationships.find((r) => r.id === p.active_relationship_id) ?? null;
        const pairMembers = relationshipMembers.filter((m) => m.relationship_id === p.active_relationship_id);
        const partnerMember = pairMembers.find((m) => m.profile_id !== p.id);
        if (partnerMember) {
          partnerProfile = profiles.find((prof) => prof.id === partnerMember.profile_id) ?? null;
        }
      }

      const userMemoriesCount = memories.filter((m) => m.created_by === p.id).length;

      return {
        ...p,
        authUser,
        isAdmin: isUserAdmin,
        partner: partnerProfile,
        relationship: relRecord,
        memoriesCount: userMemoriesCount,
      };
    });
  }, [profiles, authUsers, relationships, relationshipMembers, memories]);

  const filteredUsers = useMemo(() => {
    return usersWithRelationship.filter((u) => {
      const q = userSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        u.display_name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        u.id.toLowerCase().includes(q);

      let matchRole = true;
      if (userRoleFilter === "admin") matchRole = u.isAdmin;
      else if (userRoleFilter === "coupled") matchRole = !!u.partner;
      else if (userRoleFilter === "uncoupled") matchRole = !u.partner;

      return matchSearch && matchRole;
    });
  }, [usersWithRelationship, userSearch, userRoleFilter]);

  const enrichedRelationships = useMemo(() => {
    return relationships.map((r) => {
      const members = relationshipMembers.filter((m) => m.relationship_id === r.id);
      const memberProfiles = members
        .map((m) => profiles.find((p) => p.id === m.profile_id))
        .filter(Boolean) as AdminTelemetryProfile[];

      const relMemories = memories.filter((m) => m.relationship_id === r.id);
      const relAttachments = attachments.filter((a) =>
        relMemories.some((m) => m.id === a.memory_id)
      );

      const daysTogether = (() => {
        if (!r.start_date) return null;
        const startMs = new Date(r.start_date).getTime();
        if (isNaN(startMs)) return null;
        return Math.max(0, Math.floor((lastRefreshed.getTime() - startMs) / (1000 * 60 * 60 * 24)));
      })();

      return {
        ...r,
        members: memberProfiles,
        memoriesCount: relMemories.length,
        attachmentsCount: relAttachments.length,
        daysTogether,
      };
    });
  }, [relationships, relationshipMembers, profiles, memories, attachments, lastRefreshed]);

  const filteredRelationships = useMemo(() => {
    const q = relationshipSearch.toLowerCase().trim();
    if (!q) return enrichedRelationships;
    return enrichedRelationships.filter((r) => {
      const matchId = r.id.toLowerCase().includes(q);
      const matchNames = r.members.some(
        (m) =>
          m.display_name.toLowerCase().includes(q) ||
          m.username.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q)
      );
      return matchId || matchNames;
    });
  }, [enrichedRelationships, relationshipSearch]);

  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      const q = memorySearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        (m.title && m.title.toLowerCase().includes(q)) ||
        (m.content && m.content.toLowerCase().includes(q)) ||
        m.id.toLowerCase().includes(q);

      const matchType =
        memoryArchetypeFilter === "all" ||
        m.type.toLowerCase() === memoryArchetypeFilter.toLowerCase();

      let matchStatus = true;
      if (memoryStatusFilter === "active") matchStatus = !m.deleted_at && m.status !== "sealed";
      else if (memoryStatusFilter === "sealed") matchStatus = m.status === "sealed";
      else if (memoryStatusFilter === "deleted") matchStatus = !!m.deleted_at;

      const matchCouple =
        memoryCoupleFilter === "all" || m.relationship_id === memoryCoupleFilter;

      return matchSearch && matchType && matchStatus && matchCouple;
    });
  }, [memories, memorySearch, memoryArchetypeFilter, memoryStatusFilter, memoryCoupleFilter]);

  const filteredAttachments = useMemo(() => {
    const q = storageSearch.toLowerCase().trim();
    if (!q) return attachments;
    return attachments.filter((a) => {
      return (
        a.id.toLowerCase().includes(q) ||
        a.file_type.toLowerCase().includes(q) ||
        a.file_path.toLowerCase().includes(q) ||
        a.memory_id.toLowerCase().includes(q)
      );
    });
  }, [attachments, storageSearch]);

  // Actions
  const handlePasswordReset = async (email: string) => {
    if (!email) return;
    setActionLoadingId(`pwd-${email}`);
    try {
      const res = await adminSendPasswordReset(email);
      showToast(res.message, res.success ? "success" : "error");
    } catch {
      showToast("Error triggering password reset.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleMemoryTrash = async (memoryId: string, shouldTrash: boolean) => {
    setActionLoadingId(`trash-${memoryId}`);
    try {
      const res = await adminToggleMemorySoftDelete(memoryId, shouldTrash);
      if (res.success) {
        setTelemetry((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            memories: prev.memories.map((m) =>
              m.id === memoryId
                ? { ...m, deleted_at: shouldTrash ? new Date().toISOString() : null }
                : m
            ),
          };
        });
        showToast(res.message, "success");
        if (selectedMemory && selectedMemory.id === memoryId) {
          setSelectedMemory((prev) =>
            prev ? { ...prev, deleted_at: shouldTrash ? new Date().toISOString() : null } : null
          );
        }
      } else {
        showToast(res.message, "error");
      }
    } catch {
      showToast("Error updating memory status.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePurgeTrashConfirm = async () => {
    setShowPurgeModal(false);
    setActionLoadingId("purge-all");
    try {
      const res = await adminPurgeDeletedMemories();
      if (res.success) {
        setTelemetry((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            memories: prev.memories.filter((m) => !m.deleted_at),
          };
        });
        showToast(res.message, "success");
      } else {
        showToast(res.message, "error");
      }
    } catch {
      showToast("Error executing trash purge.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!isAdminAuthorized(profile)) {
    return null;
  }

  const navGroups: Array<{
    label: string;
    items: Array<{ key: TabKey; label: string; icon: typeof Cpu; badge: number | null }>;
  }> = [
    {
      label: "Telemetry",
      items: [
        { key: "overview", label: "Overview", icon: Cpu, badge: null },
        { key: "audit", label: "Audit & Logs", icon: Activity, badge: activityLogs.length },
      ],
    },
    {
      label: "Directory",
      items: [
        { key: "users", label: "Users", icon: Users, badge: profiles.length },
        { key: "couples", label: "Couples", icon: Heart, badge: relationships.length },
      ],
    },
    {
      label: "Vault Data",
      items: [
        { key: "memories", label: "Keepsakes", icon: Database, badge: totalMemories },
        { key: "storage", label: "Storage", icon: HardDrive, badge: attachments.length },
      ],
    },
  ];

  const activeTabTitle: Record<TabKey, string> = {
    overview: "System Overview",
    users: "Account Directory",
    couples: "Coupled Vaults",
    memories: "Keepsakes Explorer",
    storage: "Storage Hygiene",
    audit: "Audit Trail & Diagnostics",
  };

  return (
    <div className="min-h-[100dvh] bg-[#0b0b0d] text-zinc-100 font-sans antialiased selection:bg-emerald-500/20 flex flex-col lg:flex-row">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="fixed top-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border border-white/10 bg-zinc-900/95 px-4 py-3 shadow-2xl backdrop-blur-xl"
          >
            {toast.type === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
            {toast.type === "error" && <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />}
            {toast.type === "info" && <Sparkles className="h-4 w-4 text-sky-400 shrink-0" />}
            <span className="text-xs font-medium text-zinc-100">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================ */}
      {/* DESKTOP SIDEBAR (256px, Persistent Command Rail)                 */}
      {/* ================================================================ */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:sticky lg:top-0 lg:h-[100dvh] border-r border-white/[0.07] bg-[#0f0f12] px-4 py-5 justify-between">
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-xs font-semibold tracking-tight text-zinc-100">
                  Memory Jar
                </h1>
                <p className="text-[10px] font-mono text-zinc-500">Superadmin Console</p>
              </div>
            </div>

            <Link
              href="/"
              title="Back to App"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.07] bg-white/[0.03] text-zinc-400 transition-colors hover:bg-white/[0.07] hover:text-zinc-100 active:scale-[0.96]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Navigation Groups */}
          <nav className="space-y-5">
            {navGroups.map((group) => (
              <div key={group.label} className="space-y-1">
                <div className="px-2 pb-1 text-[11px] font-medium text-zinc-500">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setActiveTab(item.key)}
                      className={`group flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.98] ${
                        isActive
                          ? "bg-white/[0.08] text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                          : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`h-4 w-4 transition-colors ${
                            isActive ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300"
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== null && (
                        <span
                          className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] tabular-nums ${
                            isActive
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-white/[0.04] text-zinc-500"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom System Telemetry Card (Double-Bezel) */}
        <div className="space-y-3">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-1">
            <div className="rounded-lg bg-[#141418] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] space-y-2 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-medium">System Status</span>
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-500 font-mono text-[10px]">
                <span>PostgreSQL RLS</span>
                <span className="text-zinc-300">Bypass</span>
              </div>
              <div className="flex items-center justify-between text-zinc-500 font-mono text-[10px]">
                <span>Push Devices</span>
                <span className="text-zinc-300 tabular-nums">{pushCount}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-2 py-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 border border-white/10 text-xs font-semibold text-zinc-200">
              {profile?.display_name?.charAt(0).toUpperCase() || "P"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-zinc-200">{profile?.display_name}</p>
              <p className="truncate font-mono text-[10px] text-zinc-500">@{profile?.username}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ================================================================ */}
      {/* MOBILE HEADER & TAB BAR                                          */}
      {/* ================================================================ */}
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#0f0f12]/90 backdrop-blur-xl lg:hidden">
        <div className="flex h-13 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-zinc-300 active:scale-[0.96]"
              aria-label="Return to Jar"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
              <Shield className="h-3 w-3" />
              Admin
            </span>
          </div>

          <button
            onClick={() => void refreshTelemetry()}
            disabled={isLoading}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 text-xs text-zinc-300 active:scale-[0.97] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
            <span>Sync</span>
          </button>
        </div>

        <div className="flex overflow-x-auto px-4 pb-2.5 pt-1 gap-1.5 panel-scroll">
          {navGroups.flatMap((g) => g.items).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-white/[0.1] text-zinc-100 border border-white/10"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
                {item.badge !== null && (
                  <span className="font-mono text-[10px] text-zinc-400 tabular-nums">
                    ({item.badge})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* ================================================================ */}
      {/* MAIN WORKSPACE                                                   */}
      {/* ================================================================ */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Desktop Top Utility Bar */}
        <div className="hidden lg:flex h-14 sticky top-0 z-30 items-center justify-between border-b border-white/[0.07] bg-[#0b0b0d]/85 backdrop-blur-xl px-8">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-zinc-100 text-balance">
              {activeTabTitle[activeTab]}
            </h2>
            <span className="text-zinc-700">/</span>
            <span className="font-mono text-xs text-zinc-500">
              {profiles.length} accounts · {relationships.length} vaults · {totalMemories} keepsakes
            </span>
          </div>

          <div className="flex items-center gap-3">
            {deletedMemories > 0 && (
              <button
                onClick={() => setShowPurgeModal(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-2.5 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/20 active:scale-[0.97]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="tabular-nums">Purge Trash ({deletedMemories})</span>
              </button>
            )}

            <button
              onClick={() => void refreshTelemetry()}
              disabled={isLoading}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-xs font-medium text-zinc-200 transition-[background-color,transform] hover:bg-white/[0.08] active:scale-[0.97] disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-emerald-400" : "text-zinc-400"}`} />
              <span>Sync Telemetry</span>
            </button>

            <span className="font-mono text-[11px] text-zinc-500 tabular-nums">
              {lastRefreshed.toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Page Container */}
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-6 max-w-[1440px] w-full mx-auto">
          {/* ============================================================ */}
          {/* TAB 1: OVERVIEW (ASYMMETRICAL BENTO GRID)                    */}
          {/* ============================================================ */}
          {activeTab === "overview" && (
            <div className="space-y-5">
              {/* Row 1: 4 Compact KPI Bezel Cards */}
              <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
                {[
                  {
                    label: "Global Keepsakes",
                    value: totalMemories,
                    sub: `${activeMemories} active · ${deletedMemories} trash`,
                    accent: "text-emerald-400",
                    icon: Database,
                  },
                  {
                    label: "Storage Footprint",
                    value: prettyBytes(totalAttachmentBytes),
                    sub: `${attachments.length} media attachments`,
                    accent: "text-sky-400",
                    icon: HardDrive,
                  },
                  {
                    label: "Registered Users",
                    value: profiles.length,
                    sub: `${usersWithRelationship.filter((u) => !!u.partner).length} coupled · ${relationships.length} vaults`,
                    accent: "text-amber-400",
                    icon: Users,
                  },
                  {
                    label: "Capsules & Push",
                    value: `${sealedCapsules} / ${pushCount}`,
                    sub: "Sealed capsules / active devices",
                    accent: "text-rose-400",
                    icon: Smartphone,
                  },
                ].map((kpi) => {
                  const Icon = kpi.icon;
                  return (
                    <div
                      key={kpi.label}
                      className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-1"
                    >
                      <div className="rounded-[calc(1rem-0.25rem)] bg-[#131316] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-400">{kpi.label}</span>
                          <Icon className={`h-4 w-4 ${kpi.accent}`} />
                        </div>
                        <div className="mt-2 font-mono text-2xl font-semibold tracking-tight text-zinc-100 tabular-nums">
                          {kpi.value}
                        </div>
                        <div className="mt-1.5 text-[11px] text-zinc-500 font-mono tabular-nums">
                          {kpi.sub}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Row 2: Asymmetrical Bento (8 cols Activity Chart + 4 cols Storage Breakdown) */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                {/* Left 8 cols: Monthly Keepsake Activity Timeline */}
                <div className="lg:col-span-8 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-1">
                  <div className="h-full rounded-[calc(1rem-0.25rem)] bg-[#131316] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-emerald-400" />
                          <h3 className="text-sm font-medium text-zinc-100">
                            Keepsake creation cadence
                          </h3>
                        </div>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          Monthly volume of memories archived across all relationship vaults
                        </p>
                      </div>
                      <span className="rounded-md bg-white/[0.04] px-2 py-1 font-mono text-[11px] text-zinc-400 tabular-nums">
                        Last {monthlyTimeline.length} months
                      </span>
                    </div>

                    {/* Visual Bar Chart */}
                    <div className="mt-6 flex h-40 items-end gap-3 pt-4">
                      {monthlyTimeline.length === 0 ? (
                        <div className="flex w-full items-center justify-center text-xs text-zinc-500">
                          No timeline data available.
                        </div>
                      ) : (
                        monthlyTimeline.map((bar) => (
                          <div key={bar.sortKey} className="group flex flex-1 flex-col items-center gap-2 h-full justify-end">
                            <span className="font-mono text-[11px] text-zinc-400 opacity-75 group-hover:text-emerald-400 group-hover:opacity-100 transition-colors tabular-nums">
                              {bar.count}
                            </span>
                            <div className="w-full max-w-[3.5rem] flex-1 flex items-end">
                              <div
                                style={{ height: `${bar.heightPct}%` }}
                                className="w-full rounded-t-lg bg-gradient-to-t from-emerald-500/20 to-emerald-400/70 border-t border-emerald-300/40 transition-all duration-300 group-hover:to-emerald-300"
                              />
                            </div>
                            <span className="font-mono text-[10px] text-zinc-500">
                              {bar.label}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Right 4 cols: Storage Media Breakdown */}
                <div className="lg:col-span-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-1">
                  <div className="h-full rounded-[calc(1rem-0.25rem)] bg-[#131316] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-zinc-100">Storage Composition</h3>
                        <button
                          onClick={() => setActiveTab("storage")}
                          className="text-xs text-sky-400 hover:underline"
                        >
                          Inspect
                        </button>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {prettyBytes(totalAttachmentBytes)} across {attachments.length} files
                      </p>
                    </div>

                    <div className="mt-5 space-y-3.5">
                      {[
                        {
                          label: "Photos & Images",
                          bytes: mediaTypeBreakdown.imagesBytes,
                          count: mediaTypeBreakdown.imageCount,
                          pct: mediaTypeBreakdown.imagePct,
                          color: "bg-sky-400",
                          icon: Camera,
                        },
                        {
                          label: "Audio & Voice",
                          bytes: mediaTypeBreakdown.audioBytes,
                          count: mediaTypeBreakdown.audioCount,
                          pct: mediaTypeBreakdown.audioPct,
                          color: "bg-amber-400",
                          icon: Mic,
                        },
                        {
                          label: "Video Clips",
                          bytes: mediaTypeBreakdown.videoBytes,
                          count: mediaTypeBreakdown.videoCount,
                          pct: mediaTypeBreakdown.videoPct,
                          color: "bg-violet-400",
                          icon: Video,
                        },
                      ].map((row) => {
                        const Icon = row.icon;
                        return (
                          <div key={row.label} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 text-zinc-300">
                                <Icon className="h-3.5 w-3.5 text-zinc-500" />
                                <span>{row.label}</span>
                              </div>
                              <span className="font-mono text-[11px] text-zinc-400 tabular-nums">
                                {prettyBytes(row.bytes)} ({row.count})
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
                              <div
                                style={{ width: `${Math.max(4, row.pct)}%` }}
                                className={`h-full rounded-full ${row.color}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 3: Archetype Proportional Bar */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-1">
                <div className="rounded-[calc(1rem-0.25rem)] bg-[#131316] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-zinc-100">
                      Archetype distribution
                    </h3>
                    <span className="font-mono text-xs text-zinc-500 tabular-nums">
                      {totalMemories} total records
                    </span>
                  </div>

                  <div className="mt-3.5 flex h-3 w-full overflow-hidden rounded-full bg-white/[0.05]">
                    {typeDistribution.map((item) => (
                      <div
                        key={item.type}
                        style={{ width: `${Math.max(2, item.percentage)}%` }}
                        title={`${item.type}: ${item.count} (${item.percentage}%)`}
                        className={`${item.color} border-r border-[#131316] last:border-r-0`}
                      />
                    ))}
                  </div>

                  <div className="mt-3.5 flex flex-wrap gap-x-5 gap-y-2 text-xs">
                    {typeDistribution.map((item) => (
                      <div key={item.type} className="flex items-center gap-1.5 font-mono tabular-nums">
                        <span className={`h-2 w-2 rounded-full ${item.color}`} />
                        <span className="capitalize text-zinc-300">{item.type.replace("_", " ")}</span>
                        <span className="text-zinc-500">
                          {item.count} ({item.percentage}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 4: Recent Keepsakes Feed (7 cols) + Coupled Vaults (5 cols) */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                {/* Recent Keepsakes Feed */}
                <div className="lg:col-span-7 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-1">
                  <div className="h-full rounded-[calc(1rem-0.25rem)] bg-[#131316] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-400" />
                        <h3 className="text-sm font-medium text-zinc-100">Latest Keepsakes</h3>
                      </div>
                      <button
                        onClick={() => setActiveTab("memories")}
                        className="text-xs text-emerald-400 hover:underline"
                      >
                        Explore all ({totalMemories})
                      </button>
                    </div>

                    <div className="mt-2 divide-y divide-white/[0.05]">
                      {memories.slice(0, 5).map((m) => {
                        const author = profiles.find((p) => p.id === m.created_by);
                        return (
                          <div
                            key={m.id}
                            onClick={() => setSelectedMemory(m)}
                            className="group flex cursor-pointer items-center justify-between gap-3 py-2.5 px-2 -mx-2 rounded-lg transition-colors hover:bg-white/[0.03]"
                          >
                            <div className="min-w-0 flex items-center gap-3">
                              <span
                                className={`h-2 w-2 rounded-full shrink-0 ${
                                  ARCHETYPE_COLORS[m.type.toLowerCase()] ?? "bg-zinc-400"
                                }`}
                              />
                              <div className="min-w-0">
                                <p className="truncate text-xs font-medium text-zinc-200 group-hover:text-white">
                                  {m.title || "Untitled Keepsake"}
                                </p>
                                <p className="font-mono text-[10px] text-zinc-500">
                                  {author?.display_name || "Unknown"} · {m.type}
                                </p>
                              </div>
                            </div>
                            <span className="font-mono text-[11px] text-zinc-500 shrink-0 tabular-nums">
                              {formatDateTime(m.created_at)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Coupled Vaults Matrix */}
                <div className="lg:col-span-5 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-1">
                  <div className="h-full rounded-[calc(1rem-0.25rem)] bg-[#131316] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-rose-400" />
                        <h3 className="text-sm font-medium text-zinc-100">
                          Coupled Vaults ({relationships.length})
                        </h3>
                      </div>
                      <button
                        onClick={() => setActiveTab("couples")}
                        className="text-xs text-rose-400 hover:underline"
                      >
                        Manage
                      </button>
                    </div>

                    <div className="mt-2 divide-y divide-white/[0.05]">
                      {enrichedRelationships.map((rel) => (
                        <div key={rel.id} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex -space-x-2">
                              {rel.members.map((m) => (
                                <div
                                  key={m.id}
                                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#131316] bg-zinc-800 text-xs font-semibold text-zinc-200"
                                >
                                  {m.display_name.charAt(0).toUpperCase()}
                                </div>
                              ))}
                            </div>
                            <div>
                              <div className="text-xs font-medium text-zinc-200">
                                {rel.members.map((m) => m.display_name).join(" & ") || "Unnamed Pair"}
                              </div>
                              <div className="font-mono text-[10px] text-zinc-500 tabular-nums">
                                {rel.daysTogether !== null ? `${rel.daysTogether} days` : "—"} · {rel.timezone}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setMemoryCoupleFilter(rel.id);
                              setActiveTab("memories");
                            }}
                            className="rounded-md border border-white/[0.07] bg-white/[0.03] px-2 py-1 font-mono text-[11px] text-emerald-400 hover:bg-white/[0.07] tabular-nums"
                          >
                            {rel.memoriesCount} items
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: USERS DIRECTORY                                       */}
          {/* ============================================================ */}
          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search accounts by name, @username, email or UUID"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#131316] pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500/50 focus:outline-none"
                  />
                </div>

                <div className="inline-flex rounded-lg border border-white/[0.08] bg-[#131316] p-0.5 text-xs">
                  {(
                    [
                      { key: "all", label: "All" },
                      { key: "coupled", label: "Coupled" },
                      { key: "uncoupled", label: "Single" },
                      { key: "admin", label: "Admins" },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setUserRoleFilter(f.key)}
                      className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                        userRoleFilter === f.key
                          ? "bg-white/[0.1] text-zinc-100"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-1">
                <div className="overflow-x-auto rounded-[calc(1rem-0.25rem)] bg-[#131316]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-[11px] font-medium text-zinc-500">
                        <th className="px-4 py-3">Account</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Partner</th>
                        <th className="px-4 py-3">Timezone</th>
                        <th className="px-4 py-3 text-right">Keepsakes</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="transition-colors hover:bg-white/[0.02]">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 border border-white/10 text-xs font-semibold text-zinc-200">
                                {u.display_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-zinc-200 flex items-center gap-1.5">
                                  <span>{u.display_name}</span>
                                  {u.id === profile?.id && (
                                    <span className="rounded bg-emerald-500/15 px-1.5 py-0.2 font-mono text-[10px] text-emerald-400">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="font-mono text-[11px] text-zinc-500">@{u.username}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs text-zinc-300">{u.email || "—"}</span>
                              {u.email && (
                                <button
                                  onClick={() => handleCopy(u.email!, `email-${u.id}`)}
                                  className="text-zinc-500 hover:text-zinc-200"
                                >
                                  {copiedId === `email-${u.id}` ? (
                                    <Check className="h-3 w-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {u.partner ? (
                              <div className="flex items-center gap-1.5">
                                <Heart className="h-3 w-3 text-rose-400 shrink-0" />
                                <span className="text-zinc-200">{u.partner.display_name}</span>
                                <span className="font-mono text-[10px] text-zinc-500">
                                  @{u.partner.username}
                                </span>
                              </div>
                            ) : (
                              <span className="text-zinc-500 font-mono text-[11px]">Single</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-zinc-400">
                            {u.timezone || "UTC"}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-emerald-400 tabular-nums">
                            {u.memoriesCount}
                          </td>
                          <td className="px-4 py-3">
                            {u.isAdmin ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                                Admin
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-400">
                                Member
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedUser(u)}
                                className="inline-flex h-7 items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 text-[11px] text-zinc-300 hover:bg-white/[0.08] active:scale-[0.96]"
                              >
                                <Eye className="h-3 w-3" />
                                <span>Dossier</span>
                              </button>
                              {u.email && (
                                <button
                                  onClick={() => void handlePasswordReset(u.email!)}
                                  disabled={actionLoadingId === `pwd-${u.email}`}
                                  className="inline-flex h-7 items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 text-[11px] text-zinc-300 hover:text-amber-300 active:scale-[0.96] disabled:opacity-40"
                                >
                                  <Key className="h-3 w-3" />
                                  <span>Reset</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: COUPLES MATRIX                                        */}
          {/* ============================================================ */}
          {activeTab === "couples" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search vaults by partner name, handle, or UUID"
                    value={relationshipSearch}
                    onChange={(e) => setRelationshipSearch(e.target.value)}
                    className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#131316] pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:border-rose-500/50 focus:outline-none"
                  />
                </div>
                <span className="font-mono text-xs text-zinc-500 tabular-nums">
                  {filteredRelationships.length} coupled vaults
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredRelationships.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-1"
                  >
                    <div className="h-full rounded-[calc(1rem-0.25rem)] bg-[#131316] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                          <div className="flex items-center gap-2">
                            <Heart className="h-4 w-4 text-rose-400" />
                            <span className="font-mono text-xs font-medium text-zinc-200">
                              {r.invite_code || r.id.slice(0, 8)}
                            </span>
                          </div>
                          <button
                            onClick={() => handleCopy(r.id, `rel-${r.id}`)}
                            className="inline-flex items-center gap-1 font-mono text-[10px] text-zinc-500 hover:text-zinc-200"
                          >
                            {copiedId === `rel-${r.id}` ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            <span>UUID</span>
                          </button>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          {r.members.map((m, idx) => (
                            <div key={m.id} className="flex items-center gap-2">
                              {idx > 0 && <span className="text-xs text-zinc-600">&</span>}
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 border border-white/10 text-xs font-semibold text-zinc-200">
                                {m.display_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-medium text-zinc-200">{m.display_name}</p>
                                <p className="font-mono text-[10px] text-zinc-500">@{m.username}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs font-mono">
                          <div>
                            <span className="text-[10px] text-zinc-500 block">Start Date</span>
                            <span className="text-zinc-200">{formatDate(r.start_date)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 block">Together</span>
                            <span className="text-rose-400 tabular-nums">
                              {r.daysTogether !== null ? `${r.daysTogether}d` : "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 block">Cadence</span>
                            <span className="capitalize text-zinc-300">{r.anniversary_type}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-xs">
                        <span className="font-mono text-emerald-400 tabular-nums">
                          {r.memoriesCount} keepsakes · {r.attachmentsCount} files
                        </span>
                        <button
                          onClick={() => {
                            setMemoryCoupleFilter(r.id);
                            setActiveTab("memories");
                          }}
                          className="inline-flex items-center gap-1 text-zinc-300 hover:text-emerald-400"
                        >
                          <span>Inspect</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 4: KEEPSAKES EXPLORER                                    */}
          {/* ============================================================ */}
          {activeTab === "memories" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search keepsakes by title, content or UUID"
                    value={memorySearch}
                    onChange={(e) => setMemorySearch(e.target.value)}
                    className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#131316] pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500/50 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={memoryArchetypeFilter}
                    onChange={(e) => setMemoryArchetypeFilter(e.target.value)}
                    className="h-9 rounded-lg border border-white/[0.08] bg-[#131316] px-2.5 text-xs text-zinc-200 focus:outline-none"
                  >
                    <option value="all">All Archetypes</option>
                    <option value="photo">Photo</option>
                    <option value="letter">Letter</option>
                    <option value="voice">Voice</option>
                    <option value="video">Video</option>
                    <option value="travel">Travel</option>
                    <option value="wish">Wish</option>
                    <option value="gratitude">Gratitude</option>
                    <option value="promise">Promise</option>
                    <option value="random_thought">Thought</option>
                  </select>

                  <select
                    value={memoryStatusFilter}
                    onChange={(e) =>
                      setMemoryStatusFilter(e.target.value as "all" | "active" | "sealed" | "deleted")
                    }
                    className="h-9 rounded-lg border border-white/[0.08] bg-[#131316] px-2.5 text-xs text-zinc-200 focus:outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active Only</option>
                    <option value="sealed">Sealed Capsules</option>
                    <option value="deleted">In Trash</option>
                  </select>

                  <select
                    value={memoryCoupleFilter}
                    onChange={(e) => setMemoryCoupleFilter(e.target.value)}
                    className="h-9 max-w-[12rem] truncate rounded-lg border border-white/[0.08] bg-[#131316] px-2.5 text-xs text-zinc-200 focus:outline-none"
                  >
                    <option value="all">All Couples</option>
                    {enrichedRelationships.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.members.map((m) => m.display_name).join(" & ") || r.id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-1">
                <div className="overflow-x-auto rounded-[calc(1rem-0.25rem)] bg-[#131316]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-[11px] font-medium text-zinc-500">
                        <th className="px-4 py-3">Archetype</th>
                        <th className="px-4 py-3">Title & ID</th>
                        <th className="px-4 py-3">Author</th>
                        <th className="px-4 py-3">Created</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {filteredMemories.map((m) => {
                        const author = profiles.find((p) => p.id === m.created_by);
                        const isDeleted = !!m.deleted_at;
                        return (
                          <tr key={m.id} className="transition-colors hover:bg-white/[0.02]">
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-0.5 font-mono text-[11px] capitalize text-zinc-300">
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    ARCHETYPE_COLORS[m.type.toLowerCase()] ?? "bg-zinc-400"
                                  }`}
                                />
                                {m.type.replace("_", " ")}
                              </span>
                            </td>
                            <td className="px-4 py-3 max-w-xs">
                              <div className="font-medium text-zinc-200 truncate">
                                {m.title || "Untitled Keepsake"}
                              </div>
                              <div className="font-mono text-[10px] text-zinc-500 truncate">
                                {m.id}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-zinc-300">
                              {author ? author.display_name : "Unknown"}
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-zinc-400 tabular-nums">
                              {formatDateTime(m.created_at)}
                            </td>
                            <td className="px-4 py-3">
                              {isDeleted ? (
                                <span className="rounded bg-rose-500/15 px-1.5 py-0.5 font-mono text-[10px] text-rose-400">
                                  Trash
                                </span>
                              ) : m.status === "sealed" ? (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">
                                  <Lock className="h-2.5 w-2.5" />
                                  Sealed
                                </span>
                              ) : (
                                <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] text-emerald-400">
                                  Active
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedMemory(m)}
                                  className="inline-flex h-7 items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 text-[11px] text-zinc-300 hover:bg-white/[0.08] active:scale-[0.96]"
                                >
                                  <Eye className="h-3 w-3" />
                                  <span>Preview</span>
                                </button>
                                {isDeleted ? (
                                  <button
                                    onClick={() => void handleToggleMemoryTrash(m.id, false)}
                                    disabled={actionLoadingId === `trash-${m.id}`}
                                    className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 text-[11px] text-emerald-400 hover:bg-emerald-500/20 active:scale-[0.96]"
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                    <span>Restore</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => void handleToggleMemoryTrash(m.id, true)}
                                    disabled={actionLoadingId === `trash-${m.id}`}
                                    className="inline-flex h-7 items-center gap-1 rounded-md border border-rose-500/20 bg-rose-500/10 px-2 text-[11px] text-rose-400 hover:bg-rose-500/20 active:scale-[0.96]"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    <span>Trash</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 5: STORAGE HYGIENE                                       */}
          {/* ============================================================ */}
          {activeTab === "storage" && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
                {[
                  { label: "Total Storage", value: prettyBytes(totalAttachmentBytes), sub: `${attachments.length} files`, accent: "text-zinc-100" },
                  { label: "Images", value: prettyBytes(mediaTypeBreakdown.imagesBytes), sub: `${mediaTypeBreakdown.imageCount} photos`, accent: "text-sky-400" },
                  { label: "Audio / Voice", value: prettyBytes(mediaTypeBreakdown.audioBytes), sub: `${mediaTypeBreakdown.audioCount} recordings`, accent: "text-amber-400" },
                  { label: "Videos", value: prettyBytes(mediaTypeBreakdown.videoBytes), sub: `${mediaTypeBreakdown.videoCount} clips`, accent: "text-violet-400" },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-1">
                    <div className="rounded-[calc(1rem-0.25rem)] bg-[#131316] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                      <span className="text-xs text-zinc-400">{s.label}</span>
                      <div className={`mt-1.5 font-mono text-2xl font-semibold tabular-nums ${s.accent}`}>
                        {s.value}
                      </div>
                      <span className="mt-1 block font-mono text-[11px] text-zinc-500 tabular-nums">
                        {s.sub}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search storage paths or memory IDs"
                    value={storageSearch}
                    onChange={(e) => setStorageSearch(e.target.value)}
                    className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#131316] pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:border-sky-500/50 focus:outline-none"
                  />
                </div>
                <span className="font-mono text-xs text-zinc-500 tabular-nums">
                  {filteredAttachments.length} files
                </span>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-1">
                <div className="overflow-x-auto rounded-[calc(1rem-0.25rem)] bg-[#131316]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-[11px] font-medium text-zinc-500">
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Size</th>
                        <th className="px-4 py-3">Storage Path</th>
                        <th className="px-4 py-3">Memory ID</th>
                        <th className="px-4 py-3">Uploaded</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05] font-mono">
                      {filteredAttachments.map((a) => (
                        <tr key={a.id} className="transition-colors hover:bg-white/[0.02]">
                          <td className="px-4 py-3">
                            <span className="rounded bg-white/[0.04] px-2 py-0.5 text-[11px] text-zinc-300">
                              {a.file_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sky-400 tabular-nums">
                            {prettyBytes(a.file_size)}
                          </td>
                          <td className="px-4 py-3 text-zinc-400 max-w-xs truncate">
                            {a.file_path}
                          </td>
                          <td className="px-4 py-3 text-zinc-500">{a.memory_id.slice(0, 8)}...</td>
                          <td className="px-4 py-3 text-zinc-500 tabular-nums">
                            {formatDateTime(a.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 6: AUDIT & SYSTEM LOGS                                   */}
          {/* ============================================================ */}
          {activeTab === "audit" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  {
                    title: "Database Engine",
                    icon: Server,
                    accent: "text-emerald-400",
                    lines: ["Supabase PostgreSQL 15", "Multi-tenant RLS active", "Service Role operational"],
                  },
                  {
                    title: "Web Push Service",
                    icon: Smartphone,
                    accent: "text-violet-400",
                    lines: ["Service Worker: /sw.js", `Subscribed Devices: ${pushCount}`, "VAPID Keys: Configured"],
                  },
                  {
                    title: "Security & Retention",
                    icon: Lock,
                    accent: "text-amber-400",
                    lines: [`Admin: ${profile?.email}`, `Sealed Capsules: ${sealedCapsules}`, "Trash Retention: 30 days"],
                  },
                ].map((box) => {
                  const Icon = box.icon;
                  return (
                    <div key={box.title} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-1">
                      <div className="rounded-[calc(1rem-0.25rem)] bg-[#131316] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${box.accent}`} />
                          <span className="text-xs font-semibold text-zinc-200">{box.title}</span>
                        </div>
                        <div className="mt-3 space-y-1 font-mono text-[11px] text-zinc-500">
                          {box.lines.map((l) => (
                            <div key={l}>{l}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-1">
                <div className="rounded-[calc(1rem-0.25rem)] bg-[#131316] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-sky-400" />
                      <h3 className="text-sm font-medium text-zinc-100">
                        System Event Stream ({activityLogs.length})
                      </h3>
                    </div>
                    <span className="font-mono text-xs text-zinc-500">Push & System Events</span>
                  </div>

                  <div className="mt-3 divide-y divide-white/[0.05]">
                    {activityLogs.length === 0 ? (
                      <p className="py-8 text-center text-xs text-zinc-500">No events recorded yet.</p>
                    ) : (
                      activityLogs.map((log) => {
                        const actor = profiles.find((p) => p.id === log.user_id);
                        return (
                          <div key={log.id} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                              <span className="rounded bg-white/[0.05] px-2 py-0.5 font-mono text-[11px] text-zinc-300">
                                {log.action}
                              </span>
                              <span className="text-xs font-medium text-zinc-200">
                                {actor?.display_name || "System"}
                              </span>
                              <span className="font-mono text-[11px] text-zinc-500">
                                {log.target_type}
                              </span>
                            </div>
                            <span className="font-mono text-[11px] text-zinc-500 tabular-nums">
                              {formatDateTime(log.created_at)}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ================================================================ */}
      {/* MODAL: USER DOSSIER                                              */}
      {/* ================================================================ */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#141418] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 border border-white/10 text-base font-semibold text-zinc-100">
                    {selectedUser.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-zinc-100">{selectedUser.display_name}</h3>
                    <p className="font-mono text-xs text-zinc-500">@{selectedUser.username}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 space-y-2.5 text-xs font-mono">
                {[
                  { k: "User UUID", v: selectedUser.id },
                  { k: "Email", v: selectedUser.email || "—" },
                  { k: "Timezone", v: selectedUser.timezone },
                  { k: "Active Vault", v: selectedUser.active_relationship_id || "None" },
                  { k: "Joined", v: formatDate(selectedUser.created_at) },
                  { k: "Keepsakes Created", v: String(memories.filter((m) => m.created_by === selectedUser.id).length) },
                ].map((row) => (
                  <div key={row.k} className="flex justify-between border-b border-white/[0.05] py-1.5">
                    <span className="text-zinc-500">{row.k}</span>
                    <span className="text-zinc-200 truncate max-w-[16rem]">{row.v}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 border-t border-white/[0.07] pt-4">
                {selectedUser.email && (
                  <button
                    onClick={() => {
                      void handlePasswordReset(selectedUser.email!);
                      setSelectedUser(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-zinc-200 hover:border-amber-500/40"
                  >
                    <Key className="h-3.5 w-3.5 text-amber-400" />
                    <span>Send Password Reset</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedUser(null)}
                  className="rounded-lg bg-white/[0.08] px-4 py-2 text-xs font-medium text-zinc-200 hover:bg-white/[0.12]"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================================================================ */}
      {/* MODAL: KEEPSAKE PREVIEW                                          */}
      {/* ================================================================ */}
      <AnimatePresence>
        {selectedMemory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#141418] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
                <div>
                  <span className="inline-flex rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] uppercase text-emerald-400">
                    {selectedMemory.type}
                  </span>
                  <h3 className="mt-1 text-base font-semibold text-zinc-100">
                    {selectedMemory.title || "Untitled Keepsake"}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedMemory(null)}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 max-h-60 overflow-y-auto rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed panel-scroll">
                {selectedMemory.content || "No text content recorded for this keepsake."}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-mono text-zinc-500">
                <div>Created: {formatDateTime(selectedMemory.created_at)}</div>
                <div>Status: {selectedMemory.deleted_at ? "Trash" : selectedMemory.status}</div>
                <div>Vault: {selectedMemory.relationship_id.slice(0, 8)}...</div>
                <div>Author: {selectedMemory.created_by.slice(0, 8)}...</div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-white/[0.07] pt-4">
                {selectedMemory.deleted_at ? (
                  <button
                    onClick={() => void handleToggleMemoryTrash(selectedMemory.id, false)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Restore Keepsake</span>
                  </button>
                ) : (
                  <button
                    onClick={() => void handleToggleMemoryTrash(selectedMemory.id, true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Move to Trash</span>
                  </button>
                )}

                <button
                  onClick={() => setSelectedMemory(null)}
                  className="rounded-lg bg-white/[0.08] px-4 py-2 text-xs font-medium text-zinc-200 hover:bg-white/[0.12]"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================================================================ */}
      {/* MODAL: PURGE TRASH CONFIRMATION                                  */}
      {/* ================================================================ */}
      <AnimatePresence>
        {showPurgeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141418] p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-base font-semibold text-zinc-100">Permanently Purge Trash?</h3>
              </div>
              <p className="mt-3 text-xs text-zinc-400 leading-relaxed">
                This will permanently delete all <strong className="text-zinc-200 font-mono">{deletedMemories} soft-deleted keepsakes</strong> currently in the database trash. This action cannot be undone.
              </p>
              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setShowPurgeModal(false)}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-zinc-300 hover:text-zinc-100"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handlePurgeTrashConfirm()}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-medium text-white hover:bg-rose-500 active:scale-[0.97]"
                >
                  Confirm & Purge
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
