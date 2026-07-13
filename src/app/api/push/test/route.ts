import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push/server";

export const runtime = "nodejs";

const testNotificationTimes = new Map<string, number>();
const TEST_NOTIFICATION_WINDOW_MS = 60_000;

export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const now = Date.now();
  const lastSentAt = testNotificationTimes.get(user.id) ?? 0;
  if (now - lastSentAt < TEST_NOTIFICATION_WINDOW_MS) {
    return Response.json({ error: "Please wait before sending another test." }, { status: 429 });
  }
  testNotificationTimes.set(user.id, now);

  const summary = await sendPushToUser(user.id, {
    title: "The Memory Jar",
    body: "Notifications are ready.",
    tag: "tmj-test-notification",
    type: "test",
    url: "/profile",
  });

  return Response.json(summary);
}
