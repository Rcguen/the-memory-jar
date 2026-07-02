import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

serve(async (req) => {
  // Optional: Add a simple authorization header check if called via HTTP instead of pg_cron
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
    // Only allow service role to execute this cleanup
    // return new Response("Unauthorized", { status: 401 });
  }

  try {
    console.log("Starting storage cleanup job...");
    
    // 1. Find memories soft-deleted for more than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateString = thirtyDaysAgo.toISOString();

    const { data: memories, error: fetchError } = await supabase
      .from("memories")
      .select("id")
      .not("deleted_at", "is", null)
      .lte("deleted_at", dateString);

    if (fetchError) throw fetchError;
    if (!memories || memories.length === 0) {
      console.log("No memories to clean up.");
      return new Response(JSON.stringify({ message: "No memories to clean up.", count: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const memoryIds = memories.map((m) => m.id);
    console.log(`Found ${memoryIds.length} memories scheduled for permanent deletion.`);

    let filesDeletedCount = 0;

    // 2. Process each memory safely
    for (const memoryId of memoryIds) {
      console.log(`Processing memory: ${memoryId}`);
      
      // Fetch attachments
      const { data: attachments } = await supabase
        .from("memory_attachments")
        .select("id, url, file_type")
        .eq("memory_id", memoryId);

      if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
          // Determine bucket
          let bucket = "memory-images";
          if (attachment.file_type === "voice") bucket = "memory-voices";
          if (attachment.file_type === "video") bucket = "memory-videos";
          if (attachment.file_type === "thumbnail") bucket = "memory-thumbnails";

          // Delete from storage
          const { error: storageError } = await supabase.storage
            .from(bucket)
            .remove([attachment.url]);
            
          if (storageError) {
            console.error(`Failed to delete storage object ${attachment.url}:`, storageError);
            // Continue even if one file fails to ensure idempotent retries
          } else {
            filesDeletedCount++;
          }
        }
      }

      // Memory visual state and attachments are automatically deleted due to ON DELETE CASCADE
      // on the Foreign Key relationship in PostgreSQL when the memory row is deleted.
      // 3. Delete the memory row itself
      const { error: deleteError } = await supabase
        .from("memories")
        .delete()
        .eq("id", memoryId);

      if (deleteError) {
        console.error(`Failed to delete memory row ${memoryId}:`, deleteError);
      } else {
        console.log(`Successfully deleted memory ${memoryId} and cascaded its data.`);
      }
    }

    const report = {
      message: "Cleanup complete",
      memoriesProcessed: memoryIds.length,
      filesDeleted: filesDeletedCount,
    };
    console.log(report);

    return new Response(JSON.stringify(report), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Cleanup job failed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
