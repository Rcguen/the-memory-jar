import { Memory, MemoryThemeType, PaperStyleType, MemoryType } from "@/types/memory";
import { z } from "zod";

const AttachmentSchema = z.object({
  id: z.string().uuid(),
  memory_id: z.string().uuid(),
  file_type: z.enum(["photo", "voice", "video", "thumbnail"]),
  url: z.string(),
  metadata: z.record(z.string(), z.any()).optional().default({}),
  created_at: z.string()
}).passthrough();

const DecorationSchema = z.string();

const MemorySchema = z.object({
  id: z.string().uuid(),
  relationship_id: z.string().uuid(),
  type: z.enum(["promise", "letter", "photo", "voice", "video", "travel", "wish", "gratitude", "random_thought"] as const),
  status: z.enum(["draft", "pending_partner", "sealed", "unlocked", "opening", "archived"] as const),
  capsule_style: z.enum(["vintage_parcel", "ribbon_box", "wax_capsule", "glass_capsule", "wooden_box", "silk_envelope"]).nullable(),
  version: z.number().default(1),
  title: z.string().nullable(),
  content: z.string().nullable(),
  theme: z.enum(["modern", "vintage", "romantic", "playful", "dark"]).default("modern"),
  paper_style: z.enum(["letter", "polaroid", "postcard", "torn_edge"]).default("letter"),
  decorations: z.array(DecorationSchema).default([]),
  mood_id: z.string().nullable(),
  is_collaborative: z.boolean().default(false),
  memory_date: z.string(),
  unlock_at: z.string().nullable(),
  sealed_at: z.string().nullable(),
  unlocked_at: z.string().nullable(),
  opened_at: z.string().nullable(),
  deleted_at: z.string().nullable(),
  created_by: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
  is_pinned: z.boolean().optional().default(false),
  pinned_at: z.string().nullable().optional().default(null),
  attachments: z.array(AttachmentSchema).default([])
});

export function mapDatabaseMemory(data: any): Memory {
  // Gracefully provide fallbacks for missing DB-level default fields before Zod validation
  const preProcessed = {
    ...data,
    theme: data.theme || 'modern',
    paper_style: data.paper_style || 'letter',
    decorations: Array.isArray(data.decorations) ? data.decorations : [],
    attachments: Array.isArray(data.memory_attachments) ? data.memory_attachments : [],
  };

  const parsed = MemorySchema.safeParse(preProcessed);

  if (!parsed.success) {
    console.warn("Memory validation failed, using fallback mapper. Errors:", parsed.error.issues, data);
    // Fallback: forcefully map what we can to avoid crashing the Viewer
    return {
      ...preProcessed,
      type: preProcessed.type as MemoryType,
      theme: (preProcessed.theme as MemoryThemeType) || 'modern',
      paper_style: (preProcessed.paper_style as PaperStyleType) || 'letter',
      decorations: preProcessed.decorations || [],
      attachments: preProcessed.attachments || [],
    } as Memory;
  }

  return parsed.data as Memory;
}
