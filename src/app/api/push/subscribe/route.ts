import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(16).max(512),
    auth: z.string().min(8).max(256),
  }),
  deviceLabel: z.string().trim().max(80).optional(),
});

async function getCurrentUserAndRelationship() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) } as const;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("active_relationship_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) return { error: Response.json({ error: "Could not load profile" }, { status: 500 }) } as const;
  if (!profile?.active_relationship_id) return { error: Response.json({ error: "No active relationship" }, { status: 400 }) } as const;

  return { user, relationshipId: profile.active_relationship_id as string } as const;
}

export async function POST(request: Request) {
  const parsed = subscriptionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const context = await getCurrentUserAndRelationship();
  if ("error" in context) return context.error;

  const supabase = createAdminClient();
  const userAgent = request.headers.get("user-agent")?.slice(0, 512) ?? null;

  const { data: existingSubscription, error: existingError } = await supabase
    .from("push_subscriptions")
    .select("user_id")
    .eq("endpoint", parsed.data.endpoint)
    .maybeSingle();

  if (existingError) {
    return Response.json({ error: "Could not verify subscription" }, { status: 500 });
  }

  if (existingSubscription && existingSubscription.user_id !== context.user.id) {
    return Response.json({ error: "Subscription belongs to another user" }, { status: 409 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({
      user_id: context.user.id,
      relationship_id: context.relationshipId,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      device_label: parsed.data.deviceLabel || null,
      user_agent: userAgent,
      disabled_at: null,
      failure_count: 0,
    }, { onConflict: "endpoint" });

  if (error) {
    return Response.json({ error: "Could not save subscription" }, { status: 500 });
  }

  return Response.json({ subscribed: true });
}
