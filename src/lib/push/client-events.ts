export type PushEventType = "partner_created_memory" | "time_capsule_unlocked" | "collaborative_capsule_waiting";

export async function notifyPushEvent(type: PushEventType, memoryId: string) {
  try {
    await fetch("/api/push/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ type, memoryId }),
    });
  } catch {
    // Push is best-effort and must never break memory actions.
  }
}
