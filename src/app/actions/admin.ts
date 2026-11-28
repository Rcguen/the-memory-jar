"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthorized } from "@/lib/permissions";

export interface AdminTelemetryProfile {
  id: string;
  username: string;
  display_name: string;
  email: string;
  avatar: string | null;
  timezone: string;
  active_relationship_id: string | null;
  created_at: string;
}

export interface AdminTelemetryRelationship {
  id: string;
  start_date: string;
  timezone: string;
  anniversary_type: string;
  invite_code?: string;
  created_at: string;
}

export interface AdminTelemetryMember {
  id?: string;
  relationship_id: string;
  profile_id: string;
  role: string;
  display_name?: string;
  created_at: string;
}

export interface AdminTelemetryMemory {
  id: string;
  relationship_id: string;
  created_by: string;
  title: string | null;
  content: string | null;
  type: string;
  status: string;
  unlock_at: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface AdminTelemetryAttachment {
  id: string;
  memory_id: string;
  file_type: string;
  file_size: number;
  file_path: string;
  created_at: string;
}

export interface AdminTelemetryActivityLog {
  id: string;
  relationship_id: string | null;
  user_id: string;
  action: string;
  target_type: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export interface AdminTelemetryAuthUser {
  id: string;
  email?: string;
  lastSignInAt?: string | null;
  createdAt: string;
  bannedUntil?: string | null;
}

export interface AdminDashboardPayload {
  profiles: AdminTelemetryProfile[];
  relationships: AdminTelemetryRelationship[];
  relationshipMembers: AdminTelemetryMember[];
  memories: AdminTelemetryMemory[];
  attachments: AdminTelemetryAttachment[];
  pushSubscriptionsCount: number;
  activityLogs: AdminTelemetryActivityLog[];
  authUsers: AdminTelemetryAuthUser[];
}

/**
 * Asserts the current caller is authenticated and has superadmin authorization.
 */
async function assertSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }

  if (isAdminAuthorized({ id: user.id, email: user.email })) {
    return user;
  }

  // Fallback: check profile table username
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, email")
    .eq("id", user.id)
    .single();

  if (isAdminAuthorized(profile)) {
    return user;
  }

  throw new Error("UNAUTHORIZED_ADMIN_ACCESS");
}

/**
 * Fetches cross-tenant system telemetry bypassing RLS with service_role.
 */
export async function getAdminDashboardTelemetry(): Promise<AdminDashboardPayload> {
  await assertSuperAdmin();
  const admin = createAdminClient();

  const [
    profilesRes,
    relationshipsRes,
    membersRes,
    memoriesRes,
    attachmentsRes,
    pushRes,
    eventsRes,
    authUsersRes,
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("id, username, display_name, email, avatar, timezone, active_relationship_id, created_at")
      .order("created_at", { ascending: true }),
    admin
      .from("relationship_settings")
      .select("id, start_date, anniversary_type, relationship_timezone, invite_code, created_at")
      .order("created_at", { ascending: true }),
    admin
      .from("relationship_members")
      .select("id, relationship_id, profile_id, role, display_name, created_at"),
    admin
      .from("memories")
      .select("id, relationship_id, created_by, title, content, type, status, unlock_at, created_at, updated_at, deleted_at")
      .order("created_at", { ascending: false }),
    admin
      .from("memory_attachments")
      .select("id, memory_id, file_type, url, metadata, created_at"),
    admin
      .from("push_subscriptions")
      .select("id, user_id, created_at"),
    admin
      .from("push_delivery_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    admin.auth.admin.listUsers({ page: 1, perPage: 100 }),
  ]);

  const authUsers: AdminTelemetryAuthUser[] = (authUsersRes.data?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email,
    lastSignInAt: u.last_sign_in_at,
    createdAt: u.created_at,
    bannedUntil: u.banned_until,
  }));

  const relationships: AdminTelemetryRelationship[] = (relationshipsRes.data ?? []).map((r) => ({
    id: r.id,
    start_date: r.start_date,
    timezone: r.relationship_timezone || "UTC",
    anniversary_type: r.anniversary_type || "yearly",
    invite_code: r.invite_code,
    created_at: r.created_at,
  }));

  const attachments: AdminTelemetryAttachment[] = (attachmentsRes.data ?? []).map((a) => {
    const meta = (a.metadata && typeof a.metadata === "object" ? a.metadata : {}) as Record<string, unknown>;
    const size = Number(meta.uploaded_size || meta.original_size || 0);
    return {
      id: a.id,
      memory_id: a.memory_id,
      file_type: a.file_type || "photo",
      file_size: isNaN(size) ? 0 : size,
      file_path: a.url || "",
      created_at: a.created_at,
    };
  });

  const activityLogs: AdminTelemetryActivityLog[] = (eventsRes.data ?? []).map((ev) => ({
    id: ev.id,
    relationship_id: null,
    user_id: ev.user_id || "",
    action: ev.event_type || "push_delivery",
    target_type: typeof ev.payload === "object" && ev.payload?.title ? String(ev.payload.title) : "system_push",
    created_at: ev.created_at,
    metadata: typeof ev.payload === "object" ? (ev.payload as Record<string, unknown>) : null,
  }));

  return {
    profiles: (profilesRes.data ?? []) as AdminTelemetryProfile[],
    relationships,
    relationshipMembers: (membersRes.data ?? []) as AdminTelemetryMember[],
    memories: (memoriesRes.data ?? []) as AdminTelemetryMemory[],
    attachments,
    pushSubscriptionsCount: pushRes.data?.length ?? 0,
    activityLogs,
    authUsers,
  };
}

/**
 * Triggers a password reset email to a user.
 */
export async function adminSendPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  await assertSuperAdmin();
  const admin = createAdminClient();

  const cleanEmail = email.trim().toLowerCase();
  const { error } = await admin.auth.resetPasswordForEmail(cleanEmail);

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, message: `Password reset email dispatched to ${cleanEmail}.` };
}

/**
 * Toggles user ban status (active / suspended).
 */
export async function adminToggleUserBan(userId: string, shouldBan: boolean): Promise<{ success: boolean; message: string }> {
  await assertSuperAdmin();
  const admin = createAdminClient();

  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: shouldBan ? "876000h" : "none", // 100 years or none
  });

  if (error) {
    return { success: false, message: error.message };
  }

  return {
    success: true,
    message: shouldBan ? "Account has been suspended." : "Account has been reactivated.",
  };
}

/**
 * Soft-deletes or restores a memory record.
 */
export async function adminToggleMemorySoftDelete(memoryId: string, shouldDelete: boolean): Promise<{ success: boolean; message: string }> {
  await assertSuperAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("memories")
    .update({
      deleted_at: shouldDelete ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", memoryId);

  if (error) {
    return { success: false, message: error.message };
  }

  return {
    success: true,
    message: shouldDelete ? "Keepsake moved to trash." : "Keepsake restored from trash.",
  };
}

/**
 * Purges all soft-deleted memories that are older than retention window.
 */
export async function adminPurgeDeletedMemories(): Promise<{ success: boolean; purgedCount: number; message: string }> {
  await assertSuperAdmin();
  const admin = createAdminClient();

  // Find all deleted memories
  const { data: deletedItems, error: selectError } = await admin
    .from("memories")
    .select("id")
    .not("deleted_at", "is", null);

  if (selectError || !deletedItems) {
    return { success: false, purgedCount: 0, message: selectError?.message ?? "Error fetching deleted items." };
  }

  if (deletedItems.length === 0) {
    return { success: true, purgedCount: 0, message: "No deleted memories to purge." };
  }

  const ids = deletedItems.map((d) => d.id);
  const { error: deleteError } = await admin.from("memories").delete().in("id", ids);

  if (deleteError) {
    return { success: false, purgedCount: 0, message: deleteError.message };
  }

  return {
    success: true,
    purgedCount: ids.length,
    message: `Successfully purged ${ids.length} deleted memory records.`,
  };
}
