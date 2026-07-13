import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const unsubscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
});

export async function POST(request: Request) {
  const parsed = unsubscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("push_subscriptions")
    .update({ disabled_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("endpoint", parsed.data.endpoint);

  if (error) return Response.json({ error: "Could not disable subscription" }, { status: 500 });
  return Response.json({ subscribed: false });
}
