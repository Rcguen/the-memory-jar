import { createClient } from "@/lib/supabase/client";
import {
  ActivityLog,
  Memory,
  MemoryComment,
  MemoryListOptions,
  MemoryMood,
  MemoryNotification,
  MemoryReaction,
  ReactionEmoji,
} from "@/types/memory";
import { mapDatabaseMemory } from "@/lib/mappers/memory.mapper";

const ACTIVE_MEMORY_STATUSES = ["sealed", "unlocked", "opening"];
const REACTION_EMOJIS: ReactionEmoji[] = ["❤️", "🥹", "😂", "😭", "😍", "🔥"];

function describeSupabaseError(error: { message?: string; details?: string | null; hint?: string | null; code?: string } | null) {
  if (!error) return "Unknown Supabase error";
  return [
    error.message,
    error.details ? `Details: ${error.details}` : null,
    error.hint ? `Hint: ${error.hint}` : null,
    error.code ? `Code: ${error.code}` : null,
  ].filter(Boolean).join(" ");
}

function getStorageBucket(fileType: string): "memory-images" | "memory-voices" | "memory-videos" | "memory-thumbnails" {
  if (fileType === "voice") return "memory-voices";
  if (fileType === "video") return "memory-videos";
  if (fileType === "thumbnail") return "memory-thumbnails";
  return "memory-images";
}

function hydrateMemoryMeta(memories: Memory[], userId: string | null, favorites: { memory_id: string; user_id: string }[], reactions: MemoryReaction[], comments: { memory_id: string }[]) {
  const favoriteCounts = new Map<string, number>();
  const reactionCounts = new Map<string, Record<ReactionEmoji, number>>();
  const commentCounts = new Map<string, number>();
  const myFavorites = new Set<string>();
  const myReactions = new Map<string, ReactionEmoji>();

  for (const favorite of favorites) {
    favoriteCounts.set(favorite.memory_id, (favoriteCounts.get(favorite.memory_id) ?? 0) + 1);
    if (userId && favorite.user_id === userId) myFavorites.add(favorite.memory_id);
  }

  for (const reaction of reactions) {
    const counts = reactionCounts.get(reaction.memory_id) ?? { "❤️": 0, "🥹": 0, "😂": 0, "😭": 0, "😍": 0, "🔥": 0 };
    counts[reaction.emoji] += 1;
    reactionCounts.set(reaction.memory_id, counts);
    if (userId && reaction.user_id === userId) myReactions.set(reaction.memory_id, reaction.emoji);
  }

  for (const comment of comments) {
    commentCounts.set(comment.memory_id, (commentCounts.get(comment.memory_id) ?? 0) + 1);
  }

  return memories.map((memory) => ({
    ...memory,
    is_favorite: myFavorites.has(memory.id),
    favorite_count: favoriteCounts.get(memory.id) ?? 0,
    reaction_counts: reactionCounts.get(memory.id) ?? { "❤️": 0, "🥹": 0, "😂": 0, "😭": 0, "😍": 0, "🔥": 0 },
    my_reaction: myReactions.get(memory.id) ?? null,
    comment_count: commentCounts.get(memory.id) ?? 0,
  }));
}

export const memoryService = {
  async getCurrentRelationshipId(): Promise<string | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("relationship_members")
      .select("relationship_id")
      .eq("profile_id", user.id)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data?.relationship_id ?? null;
  },

  async getMoods(): Promise<MemoryMood[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from("memory_moods").select("*");
    if (error) throw error;
    return data as MemoryMood[];
  },

  async listMemories(options: MemoryListOptions = {}): Promise<Memory[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const relationshipId = await this.getCurrentRelationshipId();
    if (!relationshipId) return [];

    const includeDeleted = options.includeDeleted === true;
    let query = supabase
      .from("memories")
      .select("*, memory_attachments(*), memory_tags(tags(*))")
      .eq("relationship_id", relationshipId);

    if (includeDeleted) {
      query = query.not("deleted_at", "is", null);
    } else {
      query = query.is("deleted_at", null).in("status", ACTIVE_MEMORY_STATUSES);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;

    const memoryRows = data ?? [];
    const memoryIds = memoryRows.map((memory) => memory.id);
    if (memoryIds.length === 0) return [];

    const [{ data: favorites }, { data: reactions }, { data: comments }, { data: creators }] = await Promise.all([
      supabase.from("memory_favorites").select("memory_id,user_id").in("memory_id", memoryIds),
      supabase.from("memory_reactions").select("memory_id,user_id,emoji,created_at").in("memory_id", memoryIds),
      supabase.from("memory_comments").select("memory_id").in("memory_id", memoryIds),
      supabase.from("profiles").select("id,display_name,username,avatar").in("id", [...new Set(memoryRows.map((memory) => memory.created_by))]),
    ]);

    const creatorMap = new Map((creators ?? []).map((creator) => [creator.id, creator]));
    let memories = hydrateMemoryMeta(
      memoryRows.map((row) => {
        const tags = (row.memory_tags ?? [])
          .map((tagLink: { tags?: { id: string; name: string } | null }) => tagLink.tags)
          .filter(Boolean);

        return {
          ...mapDatabaseMemory(row),
          tags,
          creator: creatorMap.get(row.created_by) ?? null,
        } as Memory;
      }),
      user?.id ?? null,
      favorites ?? [],
      (reactions ?? []) as MemoryReaction[],
      comments ?? [],
    );

    const normalizedSearch = options.search?.trim().toLowerCase();
    if (normalizedSearch) {
      memories = memories.filter((memory) => {
        const haystack = [
          memory.title,
          memory.content,
          memory.type,
          memory.creator?.display_name,
          memory.creator?.username,
          ...(memory.tags ?? []).map((tag) => tag.name),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      });
    }

    const filter = options.filter ?? "all";
    memories = memories.filter((memory) => {
      const unlockAtMs = memory.unlock_at ? new Date(memory.unlock_at).getTime() : null;
      const isFutureCapsule = typeof unlockAtMs === "number" && Number.isFinite(unlockAtMs) && Date.now() < unlockAtMs;

      if (filter === "photos") return memory.type === "photo";
      if (filter === "videos") return memory.type === "video";
      if (filter === "letters") return memory.type === "letter";
      if (filter === "time_capsules") return !!memory.unlock_at;
      if (filter === "locked") return memory.status === "sealed" || isFutureCapsule;
      if (filter === "unlocked") return memory.status !== "sealed" && !isFutureCapsule;
      if (filter === "mine") return !!user && memory.created_by === user.id;
      if (filter === "partner") return !!user && memory.created_by !== user.id;
      if (filter === "favorites") return memory.is_favorite === true;
      if (filter === "pinned") return memory.is_pinned === true;
      return true;
    });

    const oldest = options.sort === "oldest";
    return memories.sort((a, b) => {
      if ((a.is_pinned ?? false) !== (b.is_pinned ?? false)) return a.is_pinned ? -1 : 1;
      return oldest
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  },

  async listDeletedMemories(): Promise<Memory[]> {
    return this.listMemories({ includeDeleted: true, sort: "newest" });
  },

  async saveMemory(memoryData: Partial<Memory>, tags: string[] = []): Promise<Memory> {
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: memberData } = await supabase
      .from("relationship_members")
      .select("relationship_id")
      .eq("profile_id", user.id)
      .limit(1)
      .maybeSingle();

    const memoryPayload: Partial<Memory> & { version: number; created_by: string; relationship_id?: string } = { 
      ...memoryData, 
      version: 1,
      created_by: user.id
    };

    if (memberData) {
      memoryPayload.relationship_id = memberData.relationship_id;
    }

    // 1. Insert memory
    const { data: memory, error: memoryError } = await supabase
      .from("memories")
      .insert([memoryPayload])
      .select()
      .single();
      
    if (memoryError) {
      console.error("Supabase Memory Insert Error:", memoryError, "Payload:", memoryPayload);
      throw memoryError;
    }

    // 1.5. Insert initial visual state
    const { error: visualStateError } = await supabase
      .from("memory_visual_state")
      .insert([{
        memory_id: memory.id,
        position_x: 0.5,
        position_y: 0,
        rotation: 0,
        scale: 1,
        velocity_x: 0,
        velocity_y: 0,
        is_sleeping: false,
        z_index: 1
      }]);

    if (visualStateError) {
      // Rollback memory
      console.error("Failed to insert visual state, rolling back memory creation:", visualStateError);
      await supabase.from("memories").delete().eq("id", memory.id);
      throw visualStateError;
    }

    // 2. Insert tags and link
    if (tags.length > 0) {
      for (const tagName of tags) {
        // Upsert tag
        const { data: tag, error: tagError } = await supabase
          .from("tags")
          .upsert([{ name: tagName }], { onConflict: "name" })
          .select()
          .single();
          
        if (tagError) continue; // Skip on error to avoid blocking memory save
        
        // Link tag to memory
        await supabase.from("memory_tags").insert([
          { memory_id: memory.id, tag_id: tag.id }
        ]);
      }
    }

    return memory as Memory;
  },

  async updateMemory(id: string, payload: Partial<Memory>): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("memories")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null);

    if (error) {
      console.error("Supabase Memory Update Error:", error);
      throw error;
    }
  },

  async deleteMemory(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.rpc("soft_delete_memory", { p_memory_id: id });

    if (error) {
      console.error("Supabase Memory Delete Error:", error);
      throw new Error(error.message ?? JSON.stringify(error));
    }
  },

  async restoreMemory(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.rpc("restore_memory", { p_memory_id: id });
    if (error) throw error;
  },

  async permanentlyDeleteMemory(id: string): Promise<void> {
    const supabase = createClient();
    const { data: attachments, error: attachmentError } = await supabase
      .from("memory_attachments")
      .select("*")
      .eq("memory_id", id);

    if (attachmentError) throw attachmentError;

    const pathsByBucket = new Map<string, string[]>();
    for (const attachment of attachments ?? []) {
      const bucket = getStorageBucket(attachment.file_type);
      pathsByBucket.set(bucket, [...(pathsByBucket.get(bucket) ?? []), attachment.url]);
    }

    for (const [bucket, paths] of pathsByBucket.entries()) {
      const { error } = await supabase.storage.from(bucket).remove(paths);
      if (error) throw error;
    }

    const { error } = await supabase.rpc("permanently_delete_memory", { p_memory_id: id });
    if (error) throw error;
  },

  async setFavorite(memoryId: string, favorite: boolean): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    if (favorite) {
      const { error } = await supabase
        .from("memory_favorites")
        .upsert({ memory_id: memoryId, user_id: user.id }, { onConflict: "memory_id,user_id" });
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("memory_favorites")
        .delete()
        .eq("memory_id", memoryId)
        .eq("user_id", user.id);
      if (error) throw error;
    }
  },

  async setPinned(memoryId: string, pinned: boolean): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
      .from("memories")
      .update({
        is_pinned: pinned,
        pinned_at: pinned ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", memoryId)
      .eq("created_by", user.id);

    if (error) throw error;
  },

  async setReaction(memoryId: string, emoji: ReactionEmoji): Promise<void> {
    if (!REACTION_EMOJIS.includes(emoji)) throw new Error("Unsupported reaction");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
      .from("memory_reactions")
      .upsert({ memory_id: memoryId, user_id: user.id, emoji }, { onConflict: "memory_id,user_id" });

    if (error) throw error;
  },

  async getComments(memoryId: string): Promise<MemoryComment[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("memory_comments")
      .select("*, profiles(id,display_name,username,avatar)")
      .eq("memory_id", memoryId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []).map((comment) => ({
      id: comment.id,
      memory_id: comment.memory_id,
      user_id: comment.user_id,
      content: comment.content,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      author: comment.profiles ?? null,
    }));
  },

  async createComment(memoryId: string, content: string): Promise<MemoryComment | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const trimmed = content.trim();
    if (!trimmed) return null;

    const { data, error } = await supabase
      .from("memory_comments")
      .insert({ memory_id: memoryId, user_id: user.id, content: trimmed })
      .select("*, profiles(id,display_name,username,avatar)")
      .single();

    if (error) {
      console.error("[comments] create failed", {
        memoryId,
        userId: user.id,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw new Error(describeSupabaseError(error));
    }

    return data ? {
      id: data.id,
      memory_id: data.memory_id,
      user_id: data.user_id,
      content: data.content,
      created_at: data.created_at,
      updated_at: data.updated_at,
      author: data.profiles ?? null,
    } : null;
  },

  async updateComment(commentId: string, content: string): Promise<void> {
    const trimmed = content.trim();
    if (!trimmed) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("memory_comments")
      .update({ content: trimmed })
      .eq("id", commentId);

    if (error) throw error;
  },

  async deleteComment(commentId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("memory_comments").delete().eq("id", commentId);
    if (error) throw error;
  },

  async getActivityFeed(limit = 30, before?: string): Promise<ActivityLog[]> {
    const supabase = createClient();
    const relationshipId = await this.getCurrentRelationshipId();
    if (!relationshipId) return [];

    let query = supabase
      .from("activity_logs")
      .select("*, profiles(id,display_name,username,avatar), memories(id,title,type,deleted_at)")
      .eq("relationship_id", relationshipId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (before) query = query.lt("created_at", before);

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map((activity) => ({
      id: activity.id,
      relationship_id: activity.relationship_id,
      actor_id: activity.actor_id,
      type: activity.type,
      target_memory_id: activity.target_memory_id,
      metadata: activity.metadata ?? {},
      created_at: activity.created_at,
      actor: activity.profiles ?? null,
      memory: activity.memories ?? null,
    })) as ActivityLog[];
  },

  async listNotifications(limit = 20): Promise<MemoryNotification[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("*, profiles(id,display_name,username,avatar), memories(id,title,type,deleted_at)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data ?? []).map((notification) => ({
      id: notification.id,
      user_id: notification.user_id,
      relationship_id: notification.relationship_id,
      actor_id: notification.actor_id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      target_memory_id: notification.target_memory_id,
      metadata: notification.metadata ?? {},
      read_at: notification.read_at,
      created_at: notification.created_at,
      actor: notification.profiles ?? null,
      memory: notification.memories ?? null,
    })) as MemoryNotification[];
  },

  async getUnreadNotificationCount(): Promise<number> {
    const supabase = createClient();
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null);

    if (error) throw error;
    return count ?? 0;
  },

  async markNotificationRead(notificationId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .is("read_at", null);

    if (error) throw error;
  },

  async markAllNotificationsRead(): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.rpc("mark_all_notifications_read");
    if (error) throw error;
  },

  async deleteAttachment(attachmentId: string): Promise<void> {
    const supabase = createClient();
    
    // 1. Get attachment details
    const { data: attachment } = await supabase
      .from("memory_attachments")
      .select("*")
      .eq("id", attachmentId)
      .single();
      
    if (!attachment) return;

    // 2. Delete from storage
    const bucket = getStorageBucket(attachment.file_type);

    await supabase.storage.from(bucket).remove([attachment.url]);

    // 3. Delete from DB
    await supabase.from("memory_attachments").delete().eq("id", attachmentId);
  },

  async uploadAttachment(
    file: File, 
    memoryId: string, 
    bucket: "memory-images" | "memory-voices" | "memory-videos" | "memory-thumbnails",
    index: number = 1
  ): Promise<string> {
    const supabase = createClient();
    const fileExt = file.name.split('.').pop();
    
    let prefix = "file";
    if (bucket === "memory-images") prefix = "photo";
    if (bucket === "memory-voices") prefix = "voice";
    if (bucket === "memory-videos") prefix = "video";
    if (bucket === "memory-thumbnails") prefix = "thumbnail";
    
    const fileName = `${memoryId}/${prefix}-${index}-${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (error) throw error;

    return fileName;
  },

  async linkAttachmentToMemory(
    memoryId: string, 
    fileType: "photo" | "voice" | "video" | "thumbnail", 
    path: string, 
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("memory_attachments")
      .insert([{
        memory_id: memoryId,
        file_type: fileType,
        url: path,
        metadata
      }]);
      
    if (error) throw error;
  },

  async getAttachmentUrlAsync(fileType: string, path: string): Promise<string> {
    const bucket = getStorageBucket(fileType);
    const isPublic = bucket === "memory-images" || bucket === "memory-thumbnails";
    
    const supabase = createClient();
    if (isPublic) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    } else {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
      if (error) throw error;
      return data.signedUrl;
    }
  },

  async saveVisualState(state: Omit<import("@/types/memory").MemoryVisualState, "id" | "created_at" | "updated_at">): Promise<void> {
    console.log("saveVisualState called with:", state);
    const supabase = createClient();
    const { error } = await supabase
      .from("memory_visual_state")
      .upsert([state], { onConflict: "memory_id" });
      
    if (error) {
      console.error("Failed to save visual state:", error);
    } else {
      console.log("saveVisualState succeeded for memory:", state.memory_id);
    }
  },

  async getVisualStates(): Promise<import("@/types/memory").MemoryVisualState[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("memory_visual_state")
      .select("*");
      
    if (error) {
      console.error("Failed to fetch visual states:", error);
      return [];
    }
    return data as import("@/types/memory").MemoryVisualState[];
  },

  async getVisualState(memoryId: string): Promise<import("@/types/memory").MemoryVisualState | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("memory_visual_state")
      .select("*")
      .eq("memory_id", memoryId)
      .maybeSingle();
      
    if (error) {
      console.error("Failed to fetch visual state for memory:", memoryId, error);
      return null;
    }
    return data as import("@/types/memory").MemoryVisualState | null;
  },

  async initializeVisualState(memoryId: string): Promise<void> {
    const supabase = createClient();
    // Attempt an insert. If the row already exists (memory_id is unique), onConflict do nothing ensures no duplicates.
    // Wait, Supabase insert doesn't do "ON CONFLICT DO NOTHING" by default. 
    // We can use UPSERT with ignoreDuplicates: true, OR just upsert which updates it. 
    // But the user specifically requested: "performs an INSERT ONLY IF NOT EXISTS... The helper must never create duplicate rows."
    // Actually, upsert with ignoreDuplicates: true is equivalent to ON CONFLICT DO NOTHING.
    const { error } = await supabase
      .from("memory_visual_state")
      .upsert([{
        memory_id: memoryId,
        position_x: 0.5,
        position_y: 0,
        rotation: 0,
        scale: 1,
        velocity_x: 0,
        velocity_y: 0,
        is_sleeping: false,
        z_index: 1
      }], { onConflict: "memory_id", ignoreDuplicates: true });
      
    if (error) {
      console.error(`Failed to initialize visual state for memory ${memoryId}:`, error);
    }
  },

  async getMemoryById(memoryId: string): Promise<Memory | null> {
    // Handle dummy memories used for empty state preview
    if (["m1", "m2", "m3"].includes(memoryId)) {
      return {
        id: memoryId,
        relationship_id: "dummy",
        type: memoryId === "m3" ? "photo" : "letter",
        title: "A sample memory",
        content: "This is a placeholder memory since your jar was empty. Try dropping a real one!",
        status: "unlocked",
        capsule_style: null,
        theme: "modern",
        decorations: [],
        paper_style: "letter",
        version: 1,
        is_collaborative: false,
        memory_date: new Date().toISOString(),
        unlock_at: null,
        sealed_at: new Date().toISOString(),
        unlocked_at: new Date().toISOString(),
        opened_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: "system",
        mood_id: null,
        deleted_at: null
      } as Memory;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("memories")
      .select("*, memory_attachments(*)")
      .eq("id", memoryId)
      .is("deleted_at", null)
      .single();

    if (error) {
      console.error("Error fetching memory by ID:", error);
      return null;
    }
    return mapDatabaseMemory(data);
  }
};
