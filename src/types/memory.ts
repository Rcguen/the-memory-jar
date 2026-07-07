export type MemoryType = 
  | "promise" 
  | "letter" 
  | "photo" 
  | "voice" 
  | "video" 
  | "travel" 
  | "wish" 
  | "gratitude" 
  | "random_thought";

export type MemoryStatus = 
  | "draft"
  | "pending_partner"
  | "sealed"
  | "unlocked"
  | "opening"
  | "archived";

export type CapsuleStyle = 
  | "vintage_parcel"
  | "ribbon_box"
  | "wax_capsule"
  | "glass_capsule"
  | "wooden_box"
  | "silk_envelope";

export type MemoryThemeType = 
  | "modern"
  | "vintage"
  | "romantic"
  | "dark"
  | "sakura"
  | "typewriter"
  | "nature"
  | "dream";

export type DecorationID = 
  | "rose" | "heart" | "stamp" | "wax_seal" 
  | "flower" | "butterfly" | "sparkle" | "ribbon" 
  | "postmark" | "polaroid_tape" | "leaf" | "coffee_stain";

export type PaperStyleType = 
  | "letter"
  | "folded_letter"
  | "diary"
  | "postcard"
  | "notebook"
  | "parchment";

export type AnimationPresetType = 
  | "modern"
  | "vintage"
  | "romantic"
  | "dark"
  | "nature"
  | "dream";

export interface MemoryMood {
  id: string;
  emoji: string;
  name: string;
  color: string;
}

export interface Memory {
  id: string;
  relationship_id: string;
  type: MemoryType;
  status: MemoryStatus;
  capsule_style: CapsuleStyle | null;
  version: number;
  title: string | null;
  content: string | null;
  theme: MemoryThemeType | null;
  decorations: DecorationID[] | null;
  paper_style: PaperStyleType | null;
  mood_id: string | null;
  is_collaborative: boolean;
  memory_date: string;
  unlock_at: string | null;
  sealed_at: string | null;
  unlocked_at: string | null;
  opened_at: string | null;
  deleted_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_pinned?: boolean;
  pinned_at?: string | null;
  attachments?: MemoryAttachment[];
  tags?: Tag[];
  creator?: Pick<UserProfile, "id" | "display_name" | "username" | "avatar"> | null;
  is_favorite?: boolean;
  favorite_count?: number;
  reaction_counts?: Record<ReactionEmoji, number>;
  my_reaction?: ReactionEmoji | null;
  comment_count?: number;
}

export interface RelationshipMember {
  id: string;
  relationship_id: string;
  profile_id: string;
  role: string;
  display_name: string;
  created_at: string;
}

export interface MemoryOpenParticipant {
  id: string;
  memory_id: string;
  user_id: string;
  created_at: string;
}

export interface MemoryVisualState {
  id: string;
  memory_id: string;
  position_x: number;
  position_y: number;
  rotation: number;
  scale: number;
  velocity_x: number;
  velocity_y: number;
  is_sleeping: boolean;
  z_index: number;
  created_at: string;
  updated_at: string;
}

export type AttachmentType = "photo" | "voice" | "video" | "thumbnail";

export interface MemoryAttachment {
  id: string;
  memory_id: string;
  file_type: AttachmentType;
  url: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
}

export type ReactionEmoji = "❤️" | "🥹" | "😂" | "😭" | "😍" | "🔥";

export interface MemoryFavorite {
  id: string;
  memory_id: string;
  user_id: string;
  created_at: string;
}

export interface MemoryReaction {
  memory_id: string;
  user_id: string;
  emoji: ReactionEmoji;
  created_at: string;
}

export interface MemoryComment {
  id: string;
  memory_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author?: Pick<UserProfile, "id" | "display_name" | "username" | "avatar"> | null;
}

export type ActivityLogType =
  | "memory_created"
  | "memory_edited"
  | "memory_deleted"
  | "memory_restored"
  | "favorite_added"
  | "favorite_removed"
  | "reaction_added"
  | "reaction_changed"
  | "comment_added"
  | "comment_edited"
  | "comment_deleted"
  | "time_capsule_locked"
  | "time_capsule_unlocked";

export interface ActivityLog {
  id: string;
  relationship_id: string;
  actor_id: string;
  type: ActivityLogType;
  target_memory_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  actor?: Pick<UserProfile, "id" | "display_name" | "username" | "avatar"> | null;
  memory?: Pick<Memory, "id" | "title" | "type" | "deleted_at"> | null;
}

export type NotificationType =
  | "partner_created_memory"
  | "partner_commented"
  | "partner_reacted"
  | "time_capsule_unlocked";

export interface MemoryNotification {
  id: string;
  user_id: string;
  relationship_id: string;
  actor_id: string | null;
  type: NotificationType;
  title: string;
  body: string;
  target_memory_id: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
  actor?: Pick<UserProfile, "id" | "display_name" | "username" | "avatar"> | null;
  memory?: Pick<Memory, "id" | "title" | "type" | "deleted_at"> | null;
}

export type MemoryFilter =
  | "all"
  | "photos"
  | "videos"
  | "letters"
  | "time_capsules"
  | "locked"
  | "unlocked"
  | "mine"
  | "partner"
  | "favorites"
  | "pinned";

export type MemorySort = "newest" | "oldest";

export interface MemoryListOptions {
  search?: string;
  filter?: MemoryFilter;
  sort?: MemorySort;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Full profile including timezone (populated by auto-detection hook).
 * timezone is NULL until the hook writes it after first login.
 */
export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  avatar: string | null;
  email?: string | null;
  created_at?: string | null;
  /** IANA timezone string, e.g. "Asia/Ho_Chi_Minh". NULL until auto-detected. */
  timezone: string | null;
}

/**
 * Relationship-level settings including the shared anniversary timezone.
 */
export interface RelationshipSettings {
  id: string;
  start_date: string;
  anniversary_type: string;
  /** Shared couple timezone for anniversary calculations. */
  relationship_timezone: string;
  created_at: string;
  updated_at: string;
}

export interface RelationshipContext {
  relationshipId: string;
  relationshipTimezone: string;
  startDate: string | null;
  partnerId: string | null;
  partnerName: string | null;
  partnerAvatar: string | null;
  anniversaryType: string | null;
}

export interface TimelineMemoryPage {
  memories: Memory[];
  nextOffset: number | null;
  hasMore: boolean;
}

export interface DashboardMemoryReference {
  id: string;
  title: string | null;
  type: MemoryType;
  memory_date: string;
  created_at: string;
}

export interface CoupleDashboardStats {
  togetherDays: number;
  totalMemories: number;
  totalPhotos: number;
  totalVideos: number;
  totalVoices: number;
  totalLetters: number;
  totalPinned: number;
  totalCapsules: number;
  totalComments: number;
  totalReactions: number;
  waitingCapsules: number;
  favorites: number;
  currentStreak: number;
  newestMemory: DashboardMemoryReference | null;
  oldestMemory: DashboardMemoryReference | null;
  mostCommonMemoryType: MemoryType | null;
  mostActiveMonth: string | null;
  favoriteReaction: ReactionEmoji | null;
}
