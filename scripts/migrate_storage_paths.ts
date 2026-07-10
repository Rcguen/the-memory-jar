import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load .env.local only as fallback, do not override existing shell variables
dotenv.config({ path: ".env.local", override: false });

// Make sure to set these environment variables when running this script
const SUPABASE_URL =
  process.env.SUPABASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  "";

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.SUPABASE_SECRET_KEY?.trim() ||
  "";

const DRY_RUN = process.env.DRY_RUN !== "false"; // Default to true for safety

console.log(`[INIT] SUPABASE_URL present: ${!!SUPABASE_URL}`);
console.log(`[INIT] service key present: ${!!SUPABASE_SERVICE_ROLE_KEY}`);
console.log(`[INIT] service key length: ${SUPABASE_SERVICE_ROLE_KEY.length}`);
console.log(`[INIT] DRY_RUN value: ${DRY_RUN}`);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const BUCKETS = ["memory-images", "memory-voices", "memory-videos", "memory-thumbnails"];

async function run() {
  console.log("Starting Storage Path Migration...");
  console.log(`DRY RUN MODE: ${DRY_RUN ? "ON (no changes will be made)" : "OFF (changes WILL be made)"}`);

  // 1. Fetch all memory attachments
  const { data: attachments, error } = await supabase
    .from("memory_attachments")
    .select("*");

  if (error) {
    console.error("Failed to fetch memory_attachments:", error);
    process.exit(1);
  }

  console.log(`Found ${attachments.length} attachments to process.`);

  let copied = 0;
  let skipped = 0;
  let failed = 0;

  for (const attachment of attachments) {
    const { id, url, memory_id, relationship_id, file_type } = attachment;

    if (!relationship_id) {
      console.warn(`[SKIPPED] Attachment ${id} has no relationship_id. Ensure backfill has run.`);
      skipped++;
      continue;
    }

    // Check if it's already in the new format: relationship_id/memory_id/filename
    const pathParts = url.split("/");
    if (pathParts.length >= 3 && pathParts[0] === relationship_id) {
      console.log(`[SKIPPED] Attachment ${id} is already in the correct format: ${url}`);
      skipped++;
      continue;
    }

    // Determine the bucket
    let bucket = "memory-images";
    if (file_type === "voice") bucket = "memory-voices";
    if (file_type === "video") bucket = "memory-videos";
    if (file_type === "thumbnail") bucket = "memory-thumbnails";

    const filename = pathParts[pathParts.length - 1]; // e.g. photo-1-12345.jpg or memoryId/photo-1-12345.jpg
    const newPath = `${relationship_id}/${memory_id}/${filename}`;

    console.log(`[PROCESS] Copying ${url} to ${newPath} in bucket ${bucket}`);

    if (DRY_RUN) {
      console.log(`[DRY RUN] Would copy ${url} to ${newPath}`);
      console.log(`[DRY RUN] Would update attachment ${id} URL to ${newPath}`);
      copied++;
      continue;
    }

    // 2. Copy the file to the new path
    const { error: copyError } = await supabase.storage
      .from(bucket)
      .copy(url, newPath);

    if (copyError) {
      console.error(`[FAILED] Error copying ${url} to ${newPath}:`, copyError.message);
      failed++;
      continue;
    }

    // 3. Update the URL in the database
    const { error: updateError } = await supabase
      .from("memory_attachments")
      .update({ url: newPath })
      .eq("id", id);

    if (updateError) {
      console.error(`[FAILED] Error updating DB for attachment ${id}:`, updateError.message);
      failed++;
      continue;
    }

    console.log(`[SUCCESS] Migrated attachment ${id}`);
    copied++;
  }

  console.log("-----------------------------------------");
  console.log(`Migration Complete.`);
  console.log(`Total: ${attachments.length} | Copied: ${copied} | Skipped: ${skipped} | Failed: ${failed}`);
  console.log("Old files have NOT been deleted.");
  console.log("-----------------------------------------");
}

run().catch((e) => {
  console.error("Unhandled error:", e);
  process.exit(1);
});
