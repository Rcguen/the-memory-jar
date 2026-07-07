import { createClient } from "@/lib/supabase/client";
import {
  CoupleDashboardStats,
  DashboardMemoryReference,
  ActivityLog,
  Memory,
  MemoryComment,
  MemoryFilter,
  MemoryListOptions,
  MemoryMood,
  MemoryNotification,
  MemoryReaction,
  RelationshipContext,
  ReactionEmoji,
  TimelineMemoryPage,
  UserProfile,
} from "@/types/memory";
import { YearRecapStats, MemoryHighlights } from "@/types/storybook";
import { mapDatabaseMemory } from "@/lib/mappers/memory.mapper";
import { getMonthDayInTimezone, normalizeTimezone, todayDateOnlyInTimezone } from "@/lib/timezone";

const ACTIVE_MEMORY_STATUSES = ["sealed", "unlocked", "opening"];
const REACTION_EMOJIS: ReactionEmoji[] = ["❤️", "🥹", "😂", "😭", "😍", "🔥"];
type CommentAuthor = Pick<UserProfile, "id" | "display_name" | "username" | "avatar">;
type CommentRow = Omit<MemoryComment, "author"> & { profiles?: CommentAuthor | null };

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

function mapComment(row: CommentRow, author?: CommentAuthor | null): MemoryComment {
  return {
    id: row.id,
    memory_id: row.memory_id,
    user_id: row.user_id,
    content: row.content,
    created_at: row.created_at,
    updated_at: row.updated_at,
    author: author ?? row.profiles ?? null,
  };
}

async function getProfilesByIds(ids: string[]): Promise<Map<string, CommentAuthor>> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const supabase = createClient();
  const authorMap = new Map<string, CommentAuthor>();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,display_name,username,avatar")
    .in("id", uniqueIds);

  if (error) {
    console.warn("[comments] profile hydrate failed", error);
  } else {
    for (const profile of data ?? []) {
      authorMap.set(profile.id, profile as CommentAuthor);
    }
  }

  const missingIds = uniqueIds.filter((id) => !authorMap.has(id));
  if (missingIds.length === 0) return authorMap;

  const { data: members, error: memberError } = await supabase
    .from("relationship_members")
    .select("profile_id,display_name")
    .in("profile_id", missingIds);

  if (memberError) {
    console.warn("[comments] relationship member hydrate failed", memberError);
    return authorMap;
  }

  for (const member of members ?? []) {
    const fallbackName = member.display_name?.trim() || "Partner";
    authorMap.set(member.profile_id, {
      id: member.profile_id,
      display_name: fallbackName,
      username: fallbackName,
      avatar: null,
    });
  }

  return authorMap;
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

function applyClientFilter(memory: Memory, filter: MemoryFilter, userId: string | null) {
  const unlockAtMs = memory.unlock_at ? new Date(memory.unlock_at).getTime() : null;
  const isFutureCapsule = typeof unlockAtMs === "number" && Number.isFinite(unlockAtMs) && Date.now() < unlockAtMs;

  if (filter === "photos") return memory.type === "photo";
  if (filter === "videos") return memory.type === "video";
  if (filter === "letters") return memory.type === "letter";
  if (filter === "time_capsules") return !!memory.unlock_at;
  if (filter === "locked") return memory.status === "sealed" || isFutureCapsule;
  if (filter === "unlocked") return memory.status !== "sealed" && !isFutureCapsule;
  if (filter === "mine") return !!userId && memory.created_by === userId;
  if (filter === "partner") return !!userId && memory.created_by !== userId;
  if (filter === "favorites") return memory.is_favorite === true;
  if (filter === "pinned") return memory.is_pinned === true;
  return true;
}

function toDashboardReference(memory: Pick<Memory, "id" | "title" | "type" | "memory_date" | "created_at">): DashboardMemoryReference {
  return {
    id: memory.id,
    title: memory.title,
    type: memory.type,
    memory_date: memory.memory_date,
    created_at: memory.created_at,
  };
}

function getCurrentMonthlyStreak(dateOnlyValues: string[], timezone: string) {
  if (dateOnlyValues.length === 0) return 0;

  const today = todayDateOnlyInTimezone(timezone);
  const currentYearMonth = today.slice(0, 7);
  const monthSet = new Set(dateOnlyValues.map((value) => value.slice(0, 7)));

  let [year, month] = currentYearMonth.split("-").map(Number);
  let streak = 0;

  while (monthSet.has(`${year}-${String(month).padStart(2, "0")}`)) {
    streak += 1;
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }

  return streak;
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

  async getRelationshipContext(): Promise<RelationshipContext | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: memberData, error: memberError } = await supabase
      .from("relationship_members")
      .select("relationship_id")
      .eq("profile_id", user.id)
      .single();

    if (memberError || !memberData?.relationship_id) return null;

    const relationshipId = memberData.relationship_id;
    const [{ data: settingsData }, { data: membersData }] = await Promise.all([
      supabase
        .from("relationship_settings")
        .select("start_date, relationship_timezone, anniversary_type")
        .eq("id", relationshipId)
        .single(),
      supabase
        .from("relationship_members")
        .select("profile_id, display_name, profiles!inner(avatar)")
        .eq("relationship_id", relationshipId),
    ]);

    const partner = (membersData ?? []).find((member) => member.profile_id !== user.id) ?? null;

    return {
      relationshipId,
      relationshipTimezone: normalizeTimezone(settingsData?.relationship_timezone),
      startDate: settingsData?.start_date ?? null,
      partnerId: partner?.profile_id ?? null,
      partnerName: partner?.display_name ?? null,
      partnerAvatar: ((partner as unknown as { profiles: { avatar: string | null } })?.profiles)?.avatar ?? null,
      anniversaryType: settingsData?.anniversary_type ?? null,
    };
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

    if (options.limit !== undefined) {
      query = query.limit(options.limit);
      if (options.offset !== undefined) {
        query = query.range(options.offset, options.offset + options.limit - 1);
      }
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
    memories = memories.filter((memory) => applyClientFilter(memory, filter, user?.id ?? null));

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

  async getOnThisDayMemories(timezone?: string | null): Promise<Memory[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const relationshipId = await this.getCurrentRelationshipId();
    if (!relationshipId) return [];

    const monthDay = getMonthDayInTimezone(timezone);
    const { data, error } = await supabase
      .from("memories")
      .select("*, memory_attachments(*), memory_tags(tags(*))")
      .eq("relationship_id", relationshipId)
      .is("deleted_at", null)
      .in("status", ACTIVE_MEMORY_STATUSES)
      .order("memory_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rows = (data ?? []).filter((memory) => typeof memory.memory_date === "string" && memory.memory_date.slice(5) === monthDay);
    if (rows.length === 0) return [];

    const memoryIds = rows.map((memory) => memory.id);
    const [{ data: favorites }, { data: reactions }, { data: comments }, { data: creators }] = await Promise.all([
      supabase.from("memory_favorites").select("memory_id,user_id").in("memory_id", memoryIds),
      supabase.from("memory_reactions").select("memory_id,user_id,emoji,created_at").in("memory_id", memoryIds),
      supabase.from("memory_comments").select("memory_id").in("memory_id", memoryIds),
      supabase.from("profiles").select("id,display_name,username,avatar").in("id", [...new Set(rows.map((memory) => memory.created_by))]),
    ]);

    const creatorMap = new Map((creators ?? []).map((creator) => [creator.id, creator]));

    return hydrateMemoryMeta(
      rows.map((row) => {
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
  },

  async listTimelineMemories(
    options: {
      filter?: MemoryFilter;
      offset?: number;
      limit?: number;
      timezone?: string | null;
    } = {}
  ): Promise<TimelineMemoryPage> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const relationshipId = await this.getCurrentRelationshipId();
    if (!relationshipId) {
      return { memories: [], nextOffset: null, hasMore: false };
    }

    const limit = Math.max(1, Math.min(options.limit ?? 24, 48));
    const offset = Math.max(0, options.offset ?? 0);
    const filter = options.filter ?? "all";
    let query = supabase
      .from("memories")
      .select("*")
      .eq("relationship_id", relationshipId)
      .is("deleted_at", null)
      .in("status", ACTIVE_MEMORY_STATUSES)
      .order("memory_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit);

    if (filter === "photos") query = query.eq("type", "photo");
    if (filter === "videos") query = query.eq("type", "video");
    if (filter === "letters") query = query.eq("type", "letter");
    if (filter === "time_capsules") query = query.not("unlock_at", "is", null);
    if (filter === "mine" && user?.id) query = query.eq("created_by", user.id);
    if (filter === "partner" && user?.id) query = query.neq("created_by", user.id);
    if (filter === "pinned") query = query.eq("is_pinned", true);

    if (filter === "favorites" && user?.id) {
      const { data: favoriteRows } = await supabase
        .from("memory_favorites")
        .select("memory_id")
        .eq("user_id", user.id);

      const favoriteIds = (favoriteRows ?? []).map((row) => row.memory_id);
      if (favoriteIds.length === 0) {
        return { memories: [], nextOffset: null, hasMore: false };
      }
      query = query.in("id", favoriteIds);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []).map((row) => mapDatabaseMemory(row)).filter((memory) => applyClientFilter(memory, filter, user?.id ?? null));
    const hasMore = rows.length > limit;
    const pageRows = rows.slice(0, limit);
    const nextOffset = hasMore ? offset + limit : null;

    return {
      memories: pageRows,
      nextOffset,
      hasMore,
    };
  },

  async getCoupleDashboardStats(timezone?: string | null): Promise<CoupleDashboardStats | null> {
    const supabase = createClient();
    const relationship = await this.getRelationshipContext();
    if (!relationship) return null;
    const safeTimezone = normalizeTimezone(timezone ?? relationship.relationshipTimezone);
    const memoriesData: unknown[] = [];
    let offset = 0;
    const limit = 1000;
    while (true) {
      const { data, error } = await supabase
        .from("memories")
        .select("id,title,type,memory_date,created_at,status,unlock_at,is_pinned")
        .eq("relationship_id", relationship.relationshipId)
        .is("deleted_at", null)
        .in("status", ACTIVE_MEMORY_STATUSES)
        .order("memory_date", { ascending: true })
        .order("created_at", { ascending: true })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      if (data) memoriesData.push(...data);
      if (!data || data.length < limit) break;
      offset += limit;
    }

    const memories = memoriesData as Array<{
      id: string;
      title: string | null;
      type: Memory["type"];
      memory_date: string;
      created_at: string;
      status: Memory["status"];
      unlock_at: string | null;
      is_pinned?: boolean | null;
    }>;

    const memoryIds = memories.map((memory) => memory.id);
    const [favoritesResult, reactionsResult, commentsResult] = await Promise.all([
      memoryIds.length > 0
        ? supabase.from("memory_favorites").select("memory_id").in("memory_id", memoryIds)
        : Promise.resolve({ data: [], error: null }),
      memoryIds.length > 0
        ? supabase.from("memory_reactions").select("emoji,memory_id").in("memory_id", memoryIds)
        : Promise.resolve({ data: [], error: null }),
      memoryIds.length > 0
        ? supabase.from("memory_comments").select("id,memory_id").in("memory_id", memoryIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const favoriteCount = new Set((favoritesResult.data ?? []).map((row) => row.memory_id)).size;
    const reactionTallies = new Map<ReactionEmoji, number>();

    for (const reaction of reactionsResult.data ?? []) {
      const emoji = reaction.emoji as ReactionEmoji;
      reactionTallies.set(emoji, (reactionTallies.get(emoji) ?? 0) + 1);
    }

    const mostCommonType = (() => {
      const counts = new Map<Memory["type"], number>();
      for (const memory of memories) {
        counts.set(memory.type, (counts.get(memory.type) ?? 0) + 1);
      }
      return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    })();

    const mostActiveMonth = (() => {
      const counts = new Map<string, number>();
      for (const memory of memories) {
        const yearMonth = memory.memory_date.slice(0, 7);
        counts.set(yearMonth, (counts.get(yearMonth) ?? 0) + 1);
      }
      return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    })();

    const favoriteReaction = [...reactionTallies.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const todayDateOnly = todayDateOnlyInTimezone(safeTimezone);
    const togetherDays = relationship.startDate
      ? Math.max(
          1,
          Math.floor(
            (new Date(todayDateOnly).getTime() - new Date(relationship.startDate).getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1
        )
      : 0;

    return {
      togetherDays,
      totalMemories: memories.length,
      totalPhotos: memories.filter((memory) => memory.type === "photo").length,
      totalVideos: memories.filter((memory) => memory.type === "video").length,
      totalVoices: memories.filter((memory) => memory.type === "voice").length,
      totalLetters: memories.filter((memory) => memory.type === "letter").length,
      totalPinned: memories.filter((memory) => memory.is_pinned === true).length,
      totalCapsules: memories.filter((memory) => !!memory.unlock_at).length,
      totalComments: commentsResult.data?.length ?? 0,
      totalReactions: reactionsResult.data?.length ?? 0,
      waitingCapsules: memories.filter((memory) => {
        const unlockAtMs = memory.unlock_at ? new Date(memory.unlock_at).getTime() : null;
        return typeof unlockAtMs === "number" && Number.isFinite(unlockAtMs) && Date.now() < unlockAtMs;
      }).length,
      favorites: favoriteCount,
      currentStreak: getCurrentMonthlyStreak(memories.map((memory) => memory.memory_date), safeTimezone),
      newestMemory: memories.length > 0 ? toDashboardReference(memories[memories.length - 1]) : null,
      oldestMemory: memories.length > 0 ? toDashboardReference(memories[0]) : null,
      mostCommonMemoryType: mostCommonType,
      mostActiveMonth,
      favoriteReaction,
    };
  },

  async getYearRecapStats(year: number, timezone?: string | null): Promise<YearRecapStats | null> {
    const supabase = createClient();
    const relationship = await this.getRelationshipContext();
    if (!relationship) return null;
    const safeTimezone = normalizeTimezone(timezone ?? relationship.relationshipTimezone);

    // Fetch all memories for the year to accurately compute stats
    // We use a date range for the year
    const startDate = `${year}-01-01T00:00:00.000Z`;
    const endDate = `${year}-12-31T23:59:59.999Z`;

    const memoriesData: unknown[] = [];
    let offset = 0;
    const limit = 500;
    while (true) {
      const { data, error } = await supabase
        .from("memories")
        .select("*, memory_attachments(*)")
        .eq("relationship_id", relationship.relationshipId)
        .is("deleted_at", null)
        .in("status", ACTIVE_MEMORY_STATUSES)
        .gte("memory_date", startDate)
        .lte("memory_date", endDate)
        .order("memory_date", { ascending: true })
        .order("created_at", { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      if (data) memoriesData.push(...data);
      if (!data || data.length < limit) break;
      offset += limit;
    }

    const memories = memoriesData.map(mapDatabaseMemory);

    if (memories.length === 0) {
      return {
        year,
        daysTogether: 0,
        totalMemories: 0,
        totalPhotos: 0,
        totalVideos: 0,
        totalVoices: 0,
        totalLetters: 0,
        openedCapsules: 0,
        totalFavorites: 0,
        totalPinned: 0,
        mostActiveMonth: null,
        longestStreak: 0,
        firstMemory: null,
        lastMemory: null,
        mostCommonMood: null,
        favoriteReaction: null,
      };
    }

    const memoryIds = memories.map((memory) => memory.id);
    const [favoritesResult, reactionsResult] = await Promise.all([
      supabase.from("memory_favorites").select("memory_id").in("memory_id", memoryIds),
      supabase.from("memory_reactions").select("emoji,memory_id").in("memory_id", memoryIds),
    ]);

    const favoriteCount = new Set((favoritesResult.data ?? []).map((row) => row.memory_id)).size;
    
    const reactionTallies = new Map<ReactionEmoji, number>();
    for (const reaction of reactionsResult.data ?? []) {
      const emoji = reaction.emoji as ReactionEmoji;
      reactionTallies.set(emoji, (reactionTallies.get(emoji) ?? 0) + 1);
    }
    const favoriteReaction = [...reactionTallies.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const mostActiveMonth = (() => {
      const counts = new Map<string, number>();
      for (const memory of memories) {
        const yearMonth = memory.memory_date.slice(0, 7);
        counts.set(yearMonth, (counts.get(yearMonth) ?? 0) + 1);
      }
      return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    })();

    const mostCommonMoodId = (() => {
      const counts = new Map<string, number>();
      for (const memory of memories) {
        if (memory.mood_id) {
          counts.set(memory.mood_id, (counts.get(memory.mood_id) ?? 0) + 1);
        }
      }
      return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    })();

    let mostCommonMood = null;
    if (mostCommonMoodId) {
      const { data: moodData } = await supabase.from("memory_moods").select("name,emoji").eq("id", mostCommonMoodId).maybeSingle();
      if (moodData) mostCommonMood = { name: moodData.name, emoji: moodData.emoji };
    }

    const togetherDays = relationship.startDate
      ? (() => {
          const start = new Date(relationship.startDate);
          const yearStart = new Date(`${year}-01-01T00:00:00Z`);
          const yearEnd = new Date(`${year}-12-31T23:59:59Z`);
          
          if (start > yearEnd) return 0; // Not together yet in this year
          
          const effectiveStart = start > yearStart ? start : yearStart;
          const today = new Date(todayDateOnlyInTimezone(safeTimezone));
          const effectiveEnd = today < yearEnd ? today : yearEnd;
          
          return Math.max(1, Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        })()
      : 0;

    return {
      year,
      daysTogether: togetherDays,
      totalMemories: memories.length,
      totalPhotos: memories.filter((memory) => memory.type === "photo").length,
      totalVideos: memories.filter((memory) => memory.type === "video").length,
      totalVoices: memories.filter((memory) => memory.type === "voice").length,
      totalLetters: memories.filter((memory) => memory.type === "letter").length,
      totalPinned: memories.filter((memory) => memory.is_pinned === true).length,
      openedCapsules: memories.filter((memory) => !!memory.unlocked_at).length,
      totalFavorites: favoriteCount,
      mostActiveMonth,
      longestStreak: getCurrentMonthlyStreak(memories.map((memory) => memory.memory_date), safeTimezone),
      firstMemory: memories[0] || null,
      lastMemory: memories[memories.length - 1] || null,
      mostCommonMood,
      favoriteReaction,
    };
  },

  async getMemoryHighlights(_timezone?: string | null): Promise<MemoryHighlights | null> {
    const supabase = createClient();
    const relationship = await this.getRelationshipContext();
    if (!relationship) return null;

    // Fetch all memories
    const memoriesData: unknown[] = [];
    let offset = 0;
    const limit = 500;
    while (true) {
      const { data, error } = await supabase
        .from("memories")
        .select("*, memory_attachments(*)")
        .eq("relationship_id", relationship.relationshipId)
        .is("deleted_at", null)
        .in("status", ACTIVE_MEMORY_STATUSES)
        .order("memory_date", { ascending: true })
        .order("created_at", { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      if (data) memoriesData.push(...data);
      if (!data || data.length < limit) break;
      offset += limit;
    }

    const memories = memoriesData.map(mapDatabaseMemory);

    if (memories.length === 0) {
      return {
        mostLoved: [],
        mostCommented: [],
        mostReacted: [],
        newest: [],
        oldest: [],
        hiddenGems: [],
        waitingCapsules: [],
      };
    }

    const memoryIds = memories.map((memory) => memory.id);
    const [favoritesResult, commentsResult, reactionsResult] = await Promise.all([
      supabase.from("memory_favorites").select("memory_id").in("memory_id", memoryIds),
      supabase.from("memory_comments").select("id,memory_id").in("memory_id", memoryIds),
      supabase.from("memory_reactions").select("id,memory_id").in("memory_id", memoryIds),
    ]);

    const favoriteCounts = new Map<string, number>();
    for (const row of favoritesResult.data ?? []) {
      favoriteCounts.set(row.memory_id, (favoriteCounts.get(row.memory_id) ?? 0) + 1);
    }

    const commentCounts = new Map<string, number>();
    for (const row of commentsResult.data ?? []) {
      commentCounts.set(row.memory_id, (commentCounts.get(row.memory_id) ?? 0) + 1);
    }

    const reactionCounts = new Map<string, number>();
    for (const row of reactionsResult.data ?? []) {
      reactionCounts.set(row.memory_id, (reactionCounts.get(row.memory_id) ?? 0) + 1);
    }

    // Sort functions
    const sortByCountDesc = (map: Map<string, number>) => (a: Memory, b: Memory) => (map.get(b.id) ?? 0) - (map.get(a.id) ?? 0);

    const mostLoved = [...memories].sort(sortByCountDesc(favoriteCounts)).filter(m => (favoriteCounts.get(m.id) ?? 0) > 0).slice(0, 10);
    const mostCommented = [...memories].sort(sortByCountDesc(commentCounts)).filter(m => (commentCounts.get(m.id) ?? 0) > 0).slice(0, 10);
    const mostReacted = [...memories].sort(sortByCountDesc(reactionCounts)).filter(m => (reactionCounts.get(m.id) ?? 0) > 0).slice(0, 10);

    const oldest = memories.slice(0, 10);
    const newest = [...memories].reverse().slice(0, 10);

    const waitingCapsules = memories.filter(m => {
      const unlockAtMs = m.unlock_at ? new Date(m.unlock_at).getTime() : null;
      return typeof unlockAtMs === "number" && Number.isFinite(unlockAtMs) && Date.now() < unlockAtMs;
    });

    // Hidden Gems: Oldest memories with >= 1 favorite or reaction, but not necessarily the highest
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const hiddenGems = memories.filter(m => {
      const isOld = new Date(m.memory_date) < oneYearAgo;
      const hasInteraction = (favoriteCounts.get(m.id) ?? 0) > 0 || (reactionCounts.get(m.id) ?? 0) > 0;
      return isOld && hasInteraction;
    }).sort(() => 0.5 - Math.random()).slice(0, 10); // Randomize hidden gems

    return {
      mostLoved,
      mostCommented,
      mostReacted,
      newest,
      oldest,
      hiddenGems,
      waitingCapsules,
    };
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
        .insert({ memory_id: memoryId, user_id: user.id });
      if (error && error.code !== "23505") throw new Error(describeSupabaseError(error));
    } else {
      const { error } = await supabase
        .from("memory_favorites")
        .delete()
        .eq("memory_id", memoryId)
        .eq("user_id", user.id);
      if (error) throw new Error(describeSupabaseError(error));
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

    if (error) throw new Error(describeSupabaseError(error));
  },

  async getComments(memoryId: string): Promise<MemoryComment[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("memory_comments")
      .select("*, profiles(id,display_name,username,avatar)")
      .eq("memory_id", memoryId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    const rows = (data ?? []) as CommentRow[];
    const authorMap = await getProfilesByIds(rows.map((comment) => comment.user_id));
    return rows.map((comment) => mapComment(comment, authorMap.get(comment.user_id)));
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

    if (!data) return null;

    const authorMap = await getProfilesByIds([data.user_id]);
    return mapComment(data as CommentRow, authorMap.get(data.user_id));
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

    const rows = data ?? [];
    const authorMap = await getProfilesByIds(rows.map((row) => row.actor_id));

    return rows.map((activity) => ({
      id: activity.id,
      relationship_id: activity.relationship_id,
      actor_id: activity.actor_id,
      type: activity.type,
      target_memory_id: activity.target_memory_id,
      metadata: activity.metadata ?? {},
      created_at: activity.created_at,
      actor: authorMap.get(activity.actor_id) ?? (Array.isArray(activity.profiles) ? activity.profiles[0] : activity.profiles) ?? null,
      memory: Array.isArray(activity.memories) ? activity.memories[0] : activity.memories ?? null,
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

    const rows = data ?? [];
    const authorMap = await getProfilesByIds(rows.map((row) => row.actor_id).filter(Boolean) as string[]);

    return rows.map((notification) => ({
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
      actor: (notification.actor_id ? authorMap.get(notification.actor_id) : null) ?? (Array.isArray(notification.profiles) ? notification.profiles[0] : notification.profiles) ?? null,
      memory: Array.isArray(notification.memories) ? notification.memories[0] : notification.memories ?? null,
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

