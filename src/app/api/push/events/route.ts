import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToRelationshipPartner } from "@/lib/push/server";

export const runtime = "nodejs";

const eventSchema = z.object({
  type: z.enum(["partner_created_memory", "time_capsule_unlocked", "collaborative_capsule_waiting"]),
  memoryId: z.string().uuid(),
});

const payloadByType = {
  partner_created_memory: {
    body: "Your partner left something new in the jar.",
    tagPrefix: "tmj-memory-created",
  },
  time_capsule_unlocked: {
    body: "A Time Capsule is ready to be opened.",
    tagPrefix: "tmj-capsule-unlocked",
  },
  collaborative_capsule_waiting: {
    body: "Your partner is waiting to open a capsule with you.",
    tagPrefix: "tmj-capsule-waiting",
  },
} as const;

export async function POST(request: Request) {
  const parsed = eventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid event" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: memory, error: memoryError } = await admin
    .from("memories")
    .select("id,relationship_id,created_by,unlock_at,is_collaborative,deleted_at,status")
    .eq("id", parsed.data.memoryId)
    .maybeSingle();

  if (memoryError) return Response.json({ error: "Could not load memory" }, { status: 500 });
  if (!memory || memory.deleted_at) return Response.json({ error: "Memory not found" }, { status: 404 });

  const { data: membership } = await admin
    .from("relationship_members")
    .select("profile_id")
    .eq("relationship_id", memory.relationship_id)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!membership) return Response.json({ error: "Forbidden" }, { status: 403 });

  if (parsed.data.type === "partner_created_memory" && memory.created_by !== user.id) {
    return Response.json({ error: "Only the creator can send this event" }, { status: 403 });
  }

  if (parsed.data.type === "time_capsule_unlocked") {
    const unlockTime = memory.unlock_at ? new Date(memory.unlock_at).getTime() : Number.NaN;
    if (!memory.unlock_at || !Number.isFinite(unlockTime) || Date.now() < unlockTime) {
      return Response.json({ error: "Capsule is not unlocked yet" }, { status: 409 });
    }
  }

  if (parsed.data.type === "collaborative_capsule_waiting" && !memory.is_collaborative) {
    return Response.json({ error: "Memory is not collaborative" }, { status: 409 });
  }

  const copy = payloadByType[parsed.data.type];
  const summary = await sendPushToRelationshipPartner(
    user.id,
    memory.relationship_id,
    {
      title: "The Memory Jar",
      body: copy.body,
      tag: `${copy.tagPrefix}-${memory.id}`,
      type: parsed.data.type,
      url: "/",
    },
    {
      eventKey: parsed.data.type === "time_capsule_unlocked" ? `${parsed.data.type}:${memory.id}` : `${parsed.data.type}:${memory.id}:${user.id}`,
      targetMemoryId: memory.id,
    }
  );

  return Response.json(summary);
}
