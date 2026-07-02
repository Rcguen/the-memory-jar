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
  attachments?: MemoryAttachment[];
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
