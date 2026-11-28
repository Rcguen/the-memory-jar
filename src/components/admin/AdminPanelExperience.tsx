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
  Terminal,
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

  // Show toast helper
  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3800);
  }, []);

  // Copy to clipboard helper
  const handleCopy = useCallback((text: string, id: string) => {
    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1800);
    }
  }, []);

  // Refresh telemetry from Server Action (bypassing RLS with service_role)
  const refreshTelemetry = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAdminDashboardTelemetry();
      setTelemetry(data);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("[AdminPanel] Telemetry fetch failed:", err);
      showToast("Failed to load cross-tenant telemetry. Verify service role permissions.", "error");
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
        console.error("[AdminPanel] Telemetry fetch failed:", err);
        if (isMounted) {
          showToast("Failed to load cross-tenant telemetry. Verify service role permissions.", "error");
          setIsLoading(false);
        }
      }
    }

    void initialFetch();
    return () => {
      isMounted = false;
    };
  }, [profile, showToast]);

  // Derived telemetry records
  const profiles = useMemo(() => telemetry?.profiles ?? [], [telemetry]);
  const relationships = useMemo(() => telemetry?.relationships ?? [], [telemetry]);
  const relationshipMembers = useMemo(() => telemetry?.relationshipMembers ?? [], [telemetry]);
  const memories = useMemo(() => telemetry?.memories ?? [], [telemetry]);
  const attachments = useMemo(() => telemetry?.attachments ?? [], [telemetry]);
  const activityLogs = useMemo(() => telemetry?.activityLogs ?? [], [telemetry]);
  const authUsers = useMemo(() => telemetry?.authUsers ?? [], [telemetry]);
  const pushCount = telemetry?.pushSubscriptionsCount ?? 0;

  // Overview metrics
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
    let otherBytes = 0;
    let imageCount = 0;
    let videoCount = 0;
    let audioCount = 0;

    attachments.forEach((a) => {
      const size = a.file_size || 0;
      const type = (a.file_type || "").toLowerCase();
      if (type.startsWith("image")) {
        imagesBytes += size;
        imageCount++;
      } else if (type.startsWith("video")) {
        videoBytes += size;
        videoCount++;
      } else if (type.startsWith("audio")) {
        audioBytes += size;
        audioCount++;
      } else {
        otherBytes += size;
      }
    });

    return {
      imagesBytes,
      videoBytes,
      audioBytes,
      otherBytes,
      imageCount,
      videoCount,
      audioCount,
    };
  }, [attachments]);

  // Archetype distribution
  const typeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    memories.forEach((m) => {
      const key = m.type || "thought";
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([type, count]) => ({
        type,
        count,
        percentage: totalMemories > 0 ? Math.round((count / totalMemories) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [memories, totalMemories]);

  // Map each user to their partner & couple info
  const usersWithRelationship = useMemo(() => {
    return profiles.map((p) => {
      const authUser = authUsers.find((u) => u.id === p.id);
      const isUserAdmin = isAdminAuthorized({ id: p.id, email: p.email, username: p.username });

      // Find relationship
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

      const userMemoriesCount = memories.filter((m) => m.user_id === p.id).length;

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

  // Filtered users list
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

  // Relationships enriched
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

  // Filtered memories list
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

  // Filtered storage attachments
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

  // Action handlers
  const handlePasswordReset = async (email: string) => {
    if (!email) return;
    setActionLoadingId(`pwd-${email}`);
    try {
      const res = await adminSendPasswordReset(email);
      if (res.success) {
        showToast(res.message, "success");
      } else {
        showToast(res.message, "error");
      }
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
        // Optimistic local state update
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

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--text-primary)] font-sans antialiased selection:bg-emerald-500/20">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)]/95 px-4 py-3 shadow-[var(--shadow-3)] backdrop-blur-xl"
          >
            {toast.type === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
            {toast.type === "error" && <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />}
            {toast.type === "info" && <Sparkles className="h-4 w-4 text-sky-400 shrink-0" />}
            <span className="text-xs font-medium text-[var(--text-primary)]">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-[var(--divider)] bg-[var(--surface-wood)]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--divider)] bg-[var(--surface-raised)] text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-paper)] hover:text-[var(--text-primary)] active:scale-[0.96]"
              aria-label="Return to Jar"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                <Shield className="h-3.5 w-3.5" />
                Super Admin Console
              </span>
              <span className="hidden items-center gap-1.5 font-mono text-xs text-[var(--text-tertiary)] md:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                RLS Bypass Enabled
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void refreshTelemetry()}
              disabled={isLoading}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--divider)] bg-[var(--surface-raised)] px-3 text-xs font-medium text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-paper)] hover:text-[var(--text-primary)] active:scale-[0.97] disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
              <span className="hidden sm:inline">Sync Data</span>
            </button>

            <span className="hidden font-mono text-[11px] text-[var(--text-tertiary)] lg:inline">
              Updated: {lastRefreshed.toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="mx-auto flex max-w-7xl overflow-x-auto px-4 pb-2 pt-1 sm:px-6 panel-scroll">
          <nav className="inline-flex rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)]/70 p-1 text-xs">
            {(
              [
                { key: "overview", label: "Overview", icon: Cpu, count: null },
                { key: "users", label: "Users", icon: Users, count: profiles.length },
                { key: "couples", label: "Couples", icon: Heart, count: relationships.length },
                { key: "memories", label: "Keepsakes", icon: Database, count: totalMemories },
                { key: "storage", label: "Storage", icon: HardDrive, count: attachments.length },
                { key: "audit", label: "Audit & Logs", icon: Activity, count: activityLogs.length },
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
                  {tab.count !== null && (
                    <span
                      className={`ml-1 rounded px-1.5 py-0.2 font-mono text-[10px] ${
                        isActive
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-[var(--surface-wood)] text-[var(--text-tertiary)]"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 page-safe-bottom">
        {/* ============================================================ */}
        {/* TAB 1: OVERVIEW */}
        {/* ============================================================ */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Top Stat Row: 5 High-Utility Metric Cards */}
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
              {/* Card 1 */}
              <div className="rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] p-4 transition-colors hover:border-emerald-500/25">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-tertiary)]">Global Keepsakes</span>
                  <Database className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                    {totalMemories}
                  </span>
                  <span className="font-mono text-xs text-emerald-400">{activeMemories} active</span>
                </div>
                <span className="mt-2 block text-[11px] text-[var(--text-caption)]">
                  {deletedMemories > 0 ? `${deletedMemories} in trash` : "0 in trash"}
                </span>
              </div>

              {/* Card 2 */}
              <div className="rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] p-4 transition-colors hover:border-sky-500/25">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-tertiary)]">Storage Footprint</span>
                  <HardDrive className="h-3.5 w-3.5 text-sky-400" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                    {prettyBytes(totalAttachmentBytes)}
                  </span>
                  <span className="font-mono text-xs text-sky-400">{attachments.length} files</span>
                </div>
                <span className="mt-2 block text-[11px] text-[var(--text-caption)]">
                  Bucket: memories
                </span>
              </div>

              {/* Card 3 */}
              <div className="rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] p-4 transition-colors hover:border-amber-500/25">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-tertiary)]">Registered Users</span>
                  <Users className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                    {profiles.length}
                  </span>
                  <span className="font-mono text-xs text-amber-400">
                    {usersWithRelationship.filter((u) => !!u.partner).length} coupled
                  </span>
                </div>
                <span className="mt-2 block text-[11px] text-[var(--text-caption)]">
                  Across all relationships
                </span>
              </div>

              {/* Card 4 */}
              <div className="rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] p-4 transition-colors hover:border-rose-500/25">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-tertiary)]">Coupled Pairs</span>
                  <Heart className="h-3.5 w-3.5 text-rose-400" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                    {relationships.length}
                  </span>
                  <span className="font-mono text-xs text-rose-400">multi-tenant</span>
                </div>
                <span className="mt-2 block text-[11px] text-[var(--text-caption)]">
                  {sealedCapsules} sealed capsules
                </span>
              </div>

              {/* Card 5 */}
              <div className="rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] p-4 transition-colors hover:border-violet-500/25 col-span-2 sm:col-span-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-tertiary)]">Push Subscriptions</span>
                  <Smartphone className="h-3.5 w-3.5 text-violet-400" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                    {pushCount}
                  </span>
                  <span className="font-mono text-xs text-emerald-400">VAPID active</span>
                </div>
                <span className="mt-2 block text-[11px] text-[var(--text-caption)]">
                  Devices receiving alerts
                </span>
              </div>
            </div>

            {/* Keepsake Archetype Distribution Bar */}
            <div className="rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                    Keepsake distribution by archetype
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                    Relative proportion of memories created across all relationship vaults
                  </p>
                </div>
                <span className="font-mono text-xs text-[var(--text-tertiary)]">{totalMemories} records</span>
              </div>

              {/* Multi-segment colored bar */}
              <div className="mt-4 flex h-3.5 w-full overflow-hidden rounded-full bg-[var(--surface-paper)]">
                {typeDistribution.map((item, idx) => {
                  const colors = [
                    "bg-amber-400",
                    "bg-emerald-500",
                    "bg-sky-400",
                    "bg-rose-400",
                    "bg-violet-400",
                    "bg-amber-300",
                    "bg-pink-400",
                    "bg-indigo-400",
                    "bg-teal-400",
                    "bg-orange-400",
                  ];
                  const color = colors[idx % colors.length];
                  return (
                    <div
                      key={item.type}
                      style={{ width: `${item.percentage}%` }}
                      title={`${item.type}: ${item.count} (${item.percentage}%)`}
                      className={`${color} transition-all duration-300`}
                    />
                  );
                })}
              </div>

              {/* Legend Grid */}
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">
                {typeDistribution.map((item, idx) => {
                  const dots = [
                    "bg-amber-400",
                    "bg-emerald-500",
                    "bg-sky-400",
                    "bg-rose-400",
                    "bg-violet-400",
                    "bg-amber-300",
                    "bg-pink-400",
                    "bg-indigo-400",
                    "bg-teal-400",
                    "bg-orange-400",
                  ];
                  return (
                    <div key={item.type} className="flex items-center gap-1.5 font-mono">
                      <span className={`h-2 w-2 rounded-full ${dots[idx % dots.length]}`} />
                      <span className="capitalize text-[var(--text-secondary)]">{item.type}</span>
                      <span className="text-[var(--text-tertiary)]">
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Two Column Grid: Couples Matrix + Recent Audit Trail */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Left Column: Coupled Relationships Snapshot */}
              <div className="rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] p-5">
                <div className="flex items-center justify-between border-b border-[var(--divider)] pb-3">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-rose-400" />
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      Coupled Accounts ({relationships.length})
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab("couples")}
                    className="text-xs font-medium text-emerald-400 hover:underline"
                  >
                    View all
                  </button>
                </div>

                <div className="mt-3 divide-y divide-[var(--divider)]">
                  {enrichedRelationships.length === 0 ? (
                    <p className="py-6 text-center text-xs text-[var(--text-tertiary)]">
                      No relationships found in database.
                    </p>
                  ) : (
                    enrichedRelationships.slice(0, 4).map((rel) => (
                      <div key={rel.id} className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-2">
                            {rel.members.map((m) => (
                              <div
                                key={m.id}
                                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--surface-raised)] bg-[var(--surface-paper)] text-xs font-semibold text-[var(--text-primary)]"
                              >
                                {m.display_name.charAt(0).toUpperCase()}
                              </div>
                            ))}
                          </div>
                          <div>
                            <div className="text-xs font-medium text-[var(--text-primary)]">
                              {rel.members.map((m) => m.display_name).join(" & ") || "Unnamed Pair"}
                            </div>
                            <div className="font-mono text-[11px] text-[var(--text-tertiary)]">
                              ID: {rel.id.slice(0, 8)}... • {rel.daysTogether !== null ? `${rel.daysTogether} days` : "No start date"}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono text-xs font-medium text-emerald-400">
                            {rel.memoriesCount} keepsakes
                          </span>
                          <span className="block font-mono text-[10px] text-[var(--text-tertiary)]">
                            {rel.timezone}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Live Event Stream / Audit Trail */}
              <div className="rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] p-5">
                <div className="flex items-center justify-between border-b border-[var(--divider)] pb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-sky-400" />
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      Latest Activity Logs ({activityLogs.length})
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab("audit")}
                    className="text-xs font-medium text-sky-400 hover:underline"
                  >
                    View all
                  </button>
                </div>

                <div className="mt-3 divide-y divide-[var(--divider)]">
                  {activityLogs.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[var(--text-tertiary)]">
                      No activity logs recorded yet.
                    </div>
                  ) : (
                    activityLogs.slice(0, 5).map((log) => (
                      <div key={log.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="inline-flex h-5 items-center rounded bg-[var(--surface-paper)] px-1.5 font-mono text-[10px] font-medium text-[var(--text-secondary)]">
                            {log.action}
                          </span>
                          <span className="text-[var(--text-secondary)] truncate">
                            Target: {log.target_type}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-[var(--text-tertiary)] shrink-0">
                          {formatDateTime(log.created_at)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] p-4">
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <Terminal className="h-4 w-4 text-emerald-400" />
                <span>Quick Operations</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowPurgeModal(true)}
                  disabled={deletedMemories === 0 || actionLoadingId === "purge-all"}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 transition-all hover:bg-rose-500/20 active:scale-[0.97] disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Purge Trash ({deletedMemories})</span>
                </button>

                <button
                  onClick={() => void refreshTelemetry()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--divider)] bg-[var(--surface-paper)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-all hover:text-[var(--text-primary)] active:scale-[0.97]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Re-sync Telemetry</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: USERS DIRECTORY */}
        {/* ============================================================ */}
        {activeTab === "users" && (
          <div className="space-y-4">
            {/* Search & Filter Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  placeholder="Search user by display name, username, email or ID..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[var(--divider)] bg-[var(--surface-raised)] pl-9 pr-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-colors focus:border-emerald-500/50 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-lg border border-[var(--divider)] bg-[var(--surface-raised)] p-0.5 text-xs">
                  {(
                    [
                      { key: "all", label: "All Users" },
                      { key: "coupled", label: "Coupled" },
                      { key: "uncoupled", label: "Single" },
                      { key: "admin", label: "Admins" },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setUserRoleFilter(f.key)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                        userRoleFilter === f.key
                          ? "bg-[var(--surface-paper)] text-[var(--text-primary)]"
                          : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Users Data Table */}
            <div className="overflow-hidden rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--divider)] bg-[var(--surface-paper)]/50 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                      <th className="px-4 py-3">User & Handle</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Coupled With</th>
                      <th className="px-4 py-3">Timezone</th>
                      <th className="px-4 py-3">Keepsakes</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--divider)]">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-xs text-[var(--text-tertiary)]">
                          No user records match your search query.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        return (
                          <tr key={u.id} className="transition-colors hover:bg-[var(--surface-paper)]/40">
                            {/* User & Handle */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-paper)] border border-[var(--divider)] text-xs font-semibold text-[var(--text-primary)]">
                                  {u.display_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                                    <span>{u.display_name}</span>
                                    {u.id === profile?.id && (
                                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.2 font-mono text-[10px] text-emerald-400">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <div className="font-mono text-[11px] text-[var(--text-tertiary)]">
                                    @{u.username}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Email */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs text-[var(--text-secondary)]">
                                  {u.email || "—"}
                                </span>
                                {u.email && (
                                  <button
                                    onClick={() => handleCopy(u.email!, `email-${u.id}`)}
                                    className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                                    title="Copy email"
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

                            {/* Coupled Partner */}
                            <td className="px-4 py-3">
                              {u.partner ? (
                                <div className="flex items-center gap-2">
                                  <Heart className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                                  <div>
                                    <span className="font-medium text-[var(--text-primary)]">
                                      {u.partner.display_name}
                                    </span>
                                    <span className="block font-mono text-[10px] text-[var(--text-tertiary)]">
                                      @{u.partner.username}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <span className="rounded bg-[var(--surface-paper)] px-2 py-0.5 font-mono text-[10px] text-[var(--text-tertiary)]">
                                  Single / Uncoupled
                                </span>
                              )}
                            </td>

                            {/* Timezone */}
                            <td className="px-4 py-3 font-mono text-[11px] text-[var(--text-secondary)]">
                              {u.timezone || "UTC"}
                            </td>

                            {/* Keepsakes Count */}
                            <td className="px-4 py-3 font-mono text-xs text-emerald-400 font-medium">
                              {u.memoriesCount}
                            </td>

                            {/* Role Badge */}
                            <td className="px-4 py-3">
                              {u.isAdmin ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                                  <Shield className="h-3 w-3" />
                                  Admin
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full border border-[var(--divider)] bg-[var(--surface-paper)] px-2 py-0.5 text-[11px] text-[var(--text-tertiary)]">
                                  Member
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedUser(u)}
                                  className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--divider)] bg-[var(--surface-paper)] px-2 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-[0.96]"
                                  title="View full user details"
                                >
                                  <Eye className="h-3 w-3" />
                                  <span>Details</span>
                                </button>

                                {u.email && (
                                  <button
                                    onClick={() => void handlePasswordReset(u.email!)}
                                    disabled={actionLoadingId === `pwd-${u.email}`}
                                    className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--divider)] bg-[var(--surface-paper)] px-2 text-[11px] text-[var(--text-secondary)] hover:text-amber-300 active:scale-[0.96] disabled:opacity-40"
                                    title="Send password reset email"
                                  >
                                    <Key className="h-3 w-3" />
                                    <span>Reset</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: COUPLES MATRIX */}
        {/* ============================================================ */}
        {activeTab === "couples" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  placeholder="Search couples by partner names, username, or relationship ID..."
                  value={relationshipSearch}
                  onChange={(e) => setRelationshipSearch(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[var(--divider)] bg-[var(--surface-raised)] pl-9 pr-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-colors focus:border-rose-500/50 focus:outline-none"
                />
              </div>
              <span className="font-mono text-xs text-[var(--text-tertiary)]">
                {filteredRelationships.length} relationships recorded
              </span>
            </div>

            {/* Relationship Cards Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredRelationships.length === 0 ? (
                <div className="col-span-2 rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] p-8 text-center text-xs text-[var(--text-tertiary)]">
                  No relationship records found.
                </div>
              ) : (
                filteredRelationships.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] p-5 transition-all hover:border-[var(--divider-strong)]"
                  >
                    <div className="flex items-center justify-between border-b border-[var(--divider)] pb-3">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-rose-500" />
                        <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                          Vault: {r.id.slice(0, 8)}...
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopy(r.id, `rel-${r.id}`)}
                        className="inline-flex items-center gap-1 font-mono text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                      >
                        {copiedId === `rel-${r.id}` ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        <span>Copy ID</span>
                      </button>
                    </div>

                    {/* Member Avatars and Details */}
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {r.members.map((m, idx) => (
                          <div key={m.id} className="flex items-center gap-2">
                            {idx > 0 && <span className="text-xs text-rose-400/80">&</span>}
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-paper)] border border-[var(--divider)] text-sm font-semibold text-[var(--text-primary)]">
                              {m.display_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-[var(--text-primary)]">
                                {m.display_name}
                              </p>
                              <p className="font-mono text-[10px] text-[var(--text-tertiary)]">
                                @{m.username}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Parameters Grid */}
                    <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg border border-[var(--divider)] bg-[var(--surface-paper)]/50 p-3 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-[var(--text-tertiary)] uppercase block">Start Date</span>
                        <span className="text-[var(--text-primary)] text-xs font-medium">
                          {formatDate(r.start_date)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-tertiary)] uppercase block">Days Count</span>
                        <span className="text-rose-400 text-xs font-medium">
                          {r.daysTogether !== null ? `${r.daysTogether} days` : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-tertiary)] uppercase block">Timezone</span>
                        <span className="text-[var(--text-secondary)] text-xs">
                          {r.timezone}
                        </span>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-4 flex items-center justify-between border-t border-[var(--divider)] pt-3 text-xs">
                      <span className="font-mono text-emerald-400 text-xs">
                        {r.memoriesCount} Keepsakes stored
                      </span>
                      <button
                        onClick={() => {
                          setMemoryCoupleFilter(r.id);
                          setActiveTab("memories");
                        }}
                        className="inline-flex items-center gap-1 font-medium text-emerald-400 hover:underline"
                      >
                        <span>Filter memories</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: KEEPSAKES EXPLORER */}
        {/* ============================================================ */}
        {activeTab === "memories" && (
          <div className="space-y-4">
            {/* Search & Filters */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  placeholder="Search keepsakes by title, note content or ID..."
                  value={memorySearch}
                  onChange={(e) => setMemorySearch(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[var(--divider)] bg-[var(--surface-raised)] pl-9 pr-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-colors focus:border-emerald-500/50 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Archetype Filter */}
                <select
                  value={memoryArchetypeFilter}
                  onChange={(e) => setMemoryArchetypeFilter(e.target.value)}
                  className="h-9 rounded-lg border border-[var(--divider)] bg-[var(--surface-raised)] px-2.5 text-xs text-[var(--text-primary)] focus:outline-none"
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
                  <option value="thought">Thought</option>
                </select>

                {/* Status Filter */}
                <select
                  value={memoryStatusFilter}
                  onChange={(e) => setMemoryStatusFilter(e.target.value as "all" | "active" | "sealed" | "deleted")}
                  className="h-9 rounded-lg border border-[var(--divider)] bg-[var(--surface-raised)] px-2.5 text-xs text-[var(--text-primary)] focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="sealed">Sealed Capsules</option>
                  <option value="deleted">In Trash</option>
                </select>

                {/* Couple Filter */}
                <select
                  value={memoryCoupleFilter}
                  onChange={(e) => setMemoryCoupleFilter(e.target.value)}
                  className="h-9 max-w-[12rem] truncate rounded-lg border border-[var(--divider)] bg-[var(--surface-raised)] px-2.5 text-xs text-[var(--text-primary)] focus:outline-none"
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

            {/* Keepsakes Table */}
            <div className="overflow-hidden rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--divider)] bg-[var(--surface-paper)]/50 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Title / Excerpt</th>
                      <th className="px-4 py-3">Author</th>
                      <th className="px-4 py-3">Relationship Vault</th>
                      <th className="px-4 py-3">Created Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--divider)]">
                    {filteredMemories.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-xs text-[var(--text-tertiary)]">
                          No keepsakes match the current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredMemories.map((m) => {
                        const author = profiles.find((p) => p.id === m.user_id);
                        const isDeleted = !!m.deleted_at;

                        return (
                          <tr key={m.id} className="transition-colors hover:bg-[var(--surface-paper)]/40">
                            {/* Archetype Icon & Name */}
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--divider)] bg-[var(--surface-paper)] px-2.5 py-1 font-mono text-[11px] font-medium capitalize text-[var(--text-secondary)]">
                                {m.type}
                              </span>
                            </td>

                            {/* Title / Excerpt */}
                            <td className="px-4 py-3 max-w-xs">
                              <div className="font-medium text-[var(--text-primary)] truncate">
                                {m.title || "Untitled Keepsake"}
                              </div>
                              <div className="font-mono text-[10px] text-[var(--text-tertiary)] truncate">
                                ID: {m.id}
                              </div>
                            </td>

                            {/* Author */}
                            <td className="px-4 py-3 font-medium text-[var(--text-secondary)]">
                              {author ? author.display_name : "Unknown"}
                            </td>

                            {/* Relationship Vault */}
                            <td className="px-4 py-3 font-mono text-[11px] text-[var(--text-tertiary)]">
                              {m.relationship_id.slice(0, 8)}...
                            </td>

                            {/* Created Date */}
                            <td className="px-4 py-3 font-mono text-[11px] text-[var(--text-secondary)]">
                              {formatDateTime(m.created_at)}
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3">
                              {isDeleted ? (
                                <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-1.5 py-0.5 font-mono text-[10px] text-rose-400">
                                  In Trash
                                </span>
                              ) : m.status === "sealed" ? (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">
                                  <Lock className="h-2.5 w-2.5" />
                                  Sealed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-400">
                                  Active
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedMemory(m)}
                                  className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--divider)] bg-[var(--surface-paper)] px-2 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-[0.96]"
                                  title="Inspect content"
                                >
                                  <Eye className="h-3 w-3" />
                                  <span>Preview</span>
                                </button>

                                {isDeleted ? (
                                  <button
                                    onClick={() => void handleToggleMemoryTrash(m.id, false)}
                                    disabled={actionLoadingId === `trash-${m.id}`}
                                    className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 text-[11px] text-emerald-400 hover:bg-emerald-500/20 active:scale-[0.96] disabled:opacity-40"
                                    title="Restore from trash"
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                    <span>Restore</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => void handleToggleMemoryTrash(m.id, true)}
                                    disabled={actionLoadingId === `trash-${m.id}`}
                                    className="inline-flex h-7 items-center gap-1 rounded-md border border-rose-500/20 bg-rose-500/10 px-2 text-[11px] text-rose-400 hover:bg-rose-500/20 active:scale-[0.96] disabled:opacity-40"
                                    title="Move to trash"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    <span>Trash</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 5: STORAGE HYGIENE */}
        {/* ============================================================ */}
        {activeTab === "storage" && (
          <div className="space-y-6">
            {/* Storage Metric Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] p-4">
                <span className="text-xs text-[var(--text-tertiary)]">Total Stored Assets</span>
                <div className="mt-1 font-mono text-2xl font-semibold text-[var(--text-primary)]">
                  {prettyBytes(totalAttachmentBytes)}
                </div>
                <span className="mt-1 block font-mono text-[11px] text-emerald-400">
                  {attachments.length} attachment records
                </span>
              </div>

              <div className="rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-tertiary)]">Photos & Images</span>
                  <Camera className="h-3.5 w-3.5 text-sky-400" />
                </div>
                <div className="mt-1 font-mono text-2xl font-semibold text-[var(--text-primary)]">
                  {prettyBytes(mediaTypeBreakdown.imagesBytes)}
                </div>
                <span className="mt-1 block font-mono text-[11px] text-sky-400">
                  {mediaTypeBreakdown.imageCount} images
                </span>
              </div>

              <div className="rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-tertiary)]">Audio & Voice Memos</span>
                  <Mic className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <div className="mt-1 font-mono text-2xl font-semibold text-[var(--text-primary)]">
                  {prettyBytes(mediaTypeBreakdown.audioBytes)}
                </div>
                <span className="mt-1 block font-mono text-[11px] text-amber-400">
                  {mediaTypeBreakdown.audioCount} audio files
                </span>
              </div>

              <div className="rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-tertiary)]">Videos</span>
                  <Video className="h-3.5 w-3.5 text-violet-400" />
                </div>
                <div className="mt-1 font-mono text-2xl font-semibold text-[var(--text-primary)]">
                  {prettyBytes(mediaTypeBreakdown.videoBytes)}
                </div>
                <span className="mt-1 block font-mono text-[11px] text-violet-400">
                  {mediaTypeBreakdown.videoCount} video clips
                </span>
              </div>
            </div>

            {/* Storage Files Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <input
                    type="text"
                    placeholder="Search attachment files by path or memory ID..."
                    value={storageSearch}
                    onChange={(e) => setStorageSearch(e.target.value)}
                    className="h-9 w-full rounded-lg border border-[var(--divider)] bg-[var(--surface-raised)] pl-9 pr-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-colors focus:border-sky-500/50 focus:outline-none"
                  />
                </div>
                <span className="font-mono text-xs text-[var(--text-tertiary)]">
                  {filteredAttachments.length} files listed
                </span>
              </div>

              <div className="overflow-hidden rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[var(--divider)] bg-[var(--surface-paper)]/50 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                        <th className="px-4 py-3">File Type</th>
                        <th className="px-4 py-3">File Size</th>
                        <th className="px-4 py-3">Storage Path</th>
                        <th className="px-4 py-3">Linked Memory ID</th>
                        <th className="px-4 py-3">Uploaded Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--divider)]">
                      {filteredAttachments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-xs text-[var(--text-tertiary)]">
                            No attachment files recorded yet.
                          </td>
                        </tr>
                      ) : (
                        filteredAttachments.map((a) => (
                          <tr key={a.id} className="transition-colors hover:bg-[var(--surface-paper)]/40 font-mono">
                            <td className="px-4 py-3">
                              <span className="rounded bg-[var(--surface-paper)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">
                                {a.file_type || "application/octet-stream"}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-sky-400">
                              {prettyBytes(a.file_size)}
                            </td>
                            <td className="px-4 py-3 text-[var(--text-secondary)] max-w-xs truncate">
                              {a.file_path}
                            </td>
                            <td className="px-4 py-3 text-[var(--text-tertiary)]">
                              {a.memory_id.slice(0, 8)}...
                            </td>
                            <td className="px-4 py-3 text-[var(--text-tertiary)]">
                              {formatDateTime(a.created_at)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 6: AUDIT & SYSTEM LOGS */}
        {/* ============================================================ */}
        {activeTab === "audit" && (
          <div className="space-y-6">
            {/* System Diagnostic Status */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] p-4">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Database Telemetry
                  </span>
                </div>
                <div className="mt-3 space-y-1 font-mono text-[11px] text-[var(--text-tertiary)]">
                  <div>Engine: Supabase PostgreSQL 15</div>
                  <div>Multi-tenant isolation: Active</div>
                  <div>Admin Service Role: Operational</div>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] p-4">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-violet-400" />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Web Push Notification
                  </span>
                </div>
                <div className="mt-3 space-y-1 font-mono text-[11px] text-[var(--text-tertiary)]">
                  <div>Service Worker: active (/sw.js)</div>
                  <div>Subscribed Devices: {pushCount}</div>
                  <div>VAPID Keys: Configured</div>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] p-4">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Security & Permissions
                  </span>
                </div>
                <div className="mt-3 space-y-1 font-mono text-[11px] text-[var(--text-tertiary)]">
                  <div>Superadmin User: {profile?.email}</div>
                  <div>Time Capsules: {sealedCapsules} scheduled</div>
                  <div>Trash Retention: 30-day soft delete</div>
                </div>
              </div>
            </div>

            {/* Audit Logs Stream */}
            <div className="rounded-xl border border-[var(--divider)] bg-[var(--surface-raised)] p-5">
              <div className="flex items-center justify-between border-b border-[var(--divider)] pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-sky-400" />
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    Live Audit Trail ({activityLogs.length})
                  </h3>
                </div>
                <span className="font-mono text-xs text-[var(--text-tertiary)]">
                  Past 100 system events
                </span>
              </div>

              <div className="mt-4 divide-y divide-[var(--divider)]">
                {activityLogs.length === 0 ? (
                  <p className="py-8 text-center text-xs text-[var(--text-tertiary)]">
                    No activity logs recorded yet.
                  </p>
                ) : (
                  activityLogs.map((log) => {
                    const actor = profiles.find((p) => p.id === log.user_id);
                    return (
                      <div key={log.id} className="py-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center rounded-md border border-[var(--divider)] bg-[var(--surface-paper)] px-2 py-0.5 font-mono text-[11px] text-[var(--text-secondary)]">
                            {log.action}
                          </span>
                          <span className="text-xs font-medium text-[var(--text-primary)]">
                            {actor?.display_name || "System Actor"}
                          </span>
                          <span className="font-mono text-[11px] text-[var(--text-tertiary)]">
                            Target: {log.target_type}
                          </span>
                        </div>

                        <div className="font-mono text-[11px] text-[var(--text-tertiary)]">
                          {formatDateTime(log.created_at)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* MODAL: USER DOSSIER DETAILS */}
      {/* ============================================================ */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg rounded-2xl border border-[var(--divider)] bg-[var(--surface-dialog)] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[var(--divider)] pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-paper)] border border-[var(--divider)] text-base font-semibold text-[var(--text-primary)]">
                    {selectedUser.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">
                      {selectedUser.display_name}
                    </h3>
                    <p className="font-mono text-xs text-[var(--text-tertiary)]">
                      @{selectedUser.username}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedUser(null)}
                  className="rounded-lg p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--surface-paper)] hover:text-[var(--text-primary)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Dossier fields */}
              <div className="mt-5 space-y-3 text-xs font-mono">
                <div className="flex justify-between py-1.5 border-b border-[var(--divider)]/50">
                  <span className="text-[var(--text-tertiary)]">User UUID:</span>
                  <span className="text-[var(--text-primary)] truncate max-w-[16rem]">
                    {selectedUser.id}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-[var(--divider)]/50">
                  <span className="text-[var(--text-tertiary)]">Email:</span>
                  <span className="text-[var(--text-primary)]">{selectedUser.email || "—"}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-[var(--divider)]/50">
                  <span className="text-[var(--text-tertiary)]">Timezone:</span>
                  <span className="text-[var(--text-secondary)]">{selectedUser.timezone}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-[var(--divider)]/50">
                  <span className="text-[var(--text-tertiary)]">Active Vault ID:</span>
                  <span className="text-[var(--text-secondary)]">
                    {selectedUser.active_relationship_id || "None (Single)"}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-[var(--divider)]/50">
                  <span className="text-[var(--text-tertiary)]">Joined Date:</span>
                  <span className="text-[var(--text-secondary)]">
                    {formatDate(selectedUser.created_at)}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-[var(--divider)]/50">
                  <span className="text-[var(--text-tertiary)]">Keepsakes Created:</span>
                  <span className="text-emerald-400 font-semibold">
                    {memories.filter((m) => m.user_id === selectedUser.id).length}
                  </span>
                </div>
              </div>

              {/* Modal footer actions */}
              <div className="mt-6 flex items-center justify-end gap-2 border-t border-[var(--divider)] pt-4">
                {selectedUser.email && (
                  <button
                    onClick={() => {
                      void handlePasswordReset(selectedUser.email!);
                      setSelectedUser(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--divider)] bg-[var(--surface-paper)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:border-amber-500/50"
                  >
                    <Key className="h-3.5 w-3.5 text-amber-400" />
                    <span>Send Password Reset</span>
                  </button>
                )}

                <button
                  onClick={() => setSelectedUser(null)}
                  className="rounded-lg bg-[var(--surface-raised)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* MODAL: KEEPSAKE PREVIEW */}
      {/* ============================================================ */}
      <AnimatePresence>
        {selectedMemory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg rounded-2xl border border-[var(--divider)] bg-[var(--surface-dialog)] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[var(--divider)] pb-4">
                <div>
                  <span className="inline-flex rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] uppercase text-emerald-400">
                    {selectedMemory.type}
                  </span>
                  <h3 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                    {selectedMemory.title || "Untitled Keepsake"}
                  </h3>
                </div>

                <button
                  onClick={() => setSelectedMemory(null)}
                  className="rounded-lg p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--surface-paper)] hover:text-[var(--text-primary)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Memory content preview */}
              <div className="mt-4 max-h-60 overflow-y-auto rounded-lg border border-[var(--divider)] bg-[var(--surface-paper)] p-4 text-xs text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed panel-scroll">
                {selectedMemory.content || "No text content recorded for this keepsake."}
              </div>

              {/* Metadata */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-mono text-[var(--text-tertiary)]">
                <div>Created: {formatDateTime(selectedMemory.created_at)}</div>
                <div>Status: {selectedMemory.deleted_at ? "In Trash" : selectedMemory.status}</div>
                <div>Vault: {selectedMemory.relationship_id.slice(0, 8)}...</div>
                <div>Author ID: {selectedMemory.user_id.slice(0, 8)}...</div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex items-center justify-between border-t border-[var(--divider)] pt-4">
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
                  className="rounded-lg bg-[var(--surface-raised)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* MODAL: PURGE TRASH CONFIRMATION */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showPurgeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-[var(--divider)] bg-[var(--surface-dialog)] p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  Permanently Purge Trash?
                </h3>
              </div>

              <p className="mt-3 text-xs text-[var(--text-secondary)] leading-relaxed">
                This will permanently delete all <strong className="text-[var(--text-primary)] font-mono">{deletedMemories} soft-deleted keepsakes</strong> currently in the database trash. This action is irreversible.
              </p>

              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setShowPurgeModal(false)}
                  className="rounded-lg border border-[var(--divider)] bg-[var(--surface-paper)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handlePurgeTrashConfirm()}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-rose-500 active:scale-[0.97]"
                >
                  Confirm & Purge Permanently
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
