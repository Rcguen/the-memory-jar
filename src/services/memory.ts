import { createClient } from "@/lib/supabase/client";
import { Memory, MemoryAttachment, MemoryMood, MemoryType } from "@/types/memory";
import { mapDatabaseMemory } from "@/lib/mappers/memory.mapper";

export const memoryService = {
  async getMoods(): Promise<MemoryMood[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from("memory_moods").select("*");
    if (error) throw error;
    return data as MemoryMood[];
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

    const memoryPayload: any = { 
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
    const { data, error } = await supabase
      .from("memories")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null)
      .select("id");

    if (error) {
      console.error("Supabase Memory Delete Error:", error);
      throw error;
    }

    // If no rows returned, the update was blocked (RLS or already deleted)
    if (!data || data.length === 0) {
      console.error("deleteMemory: 0 rows updated for id", id, "— possible RLS violation or row not found");
      throw new Error("Delete failed: no rows updated. You may not have permission.");
    }
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
    let bucket = "memory-images";
    if (attachment.file_type === "voice") bucket = "memory-voices";
    if (attachment.file_type === "video") bucket = "memory-videos";

    await supabase.storage.from(bucket).remove([attachment.url]);

    // 3. Delete from DB
    await supabase.from("memory_attachments").delete().eq("id", attachmentId);
  },

  async uploadAttachment(
    file: File, 
    memoryId: string, 
    bucket: "memory-images" | "memory-voices" | "memory-videos",
    index: number = 1
  ): Promise<string> {
    const supabase = createClient();
    const fileExt = file.name.split('.').pop();
    
    let prefix = "file";
    if (bucket === "memory-images") prefix = "photo";
    if (bucket === "memory-voices") prefix = "voice";
    if (bucket === "memory-videos") prefix = "video";
    
    const fileName = `${memoryId}/${prefix}-${index}.${fileExt}`;

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
    let bucket = "memory-images";
    let isPublic = true;
    
    if (fileType === "voice") { bucket = "memory-voices"; isPublic = false; }
    if (fileType === "video") { bucket = "memory-videos"; isPublic = false; }
    
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
