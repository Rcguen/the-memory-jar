import "server-only";

import webpush, { WebPushError } from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRomanticNotificationCopy } from "@/lib/notifications/romantic-copy";

type PushPayloadType = "partner_created_memory" | "time_capsule_unlocked" | "collaborative_capsule_waiting" | "test";

export type SafePushPayload = {
  title?: string;
  body?: string;
  tag?: string;
  type?: PushPayloadType;
  url?: string;
};

type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  failure_count: number;
};

export type PushDeliverySummary = {
  sent: number;
  expired: number;
  failed: number;
};

const DEFAULT_ROMANTIC_COPY = getRomanticNotificationCopy({ category: "unknown" });

const DEFAULT_PUSH_PAYLOAD: Required<Pick<SafePushPayload, "title" | "body" | "url">> = {
  ...DEFAULT_ROMANTIC_COPY,
  url: "/",
};

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();

  if (!publicKey || !privateKey || !subject) {
    throw new Error("Web push VAPID configuration is unavailable.");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

function sanitizePayload(payload: SafePushPayload): SafePushPayload {
  const safeUrl = typeof payload.url === "string" && payload.url.startsWith("/") && !payload.url.startsWith("//")
    ? payload.url
    : DEFAULT_PUSH_PAYLOAD.url;

  return {
    title: payload.title?.slice(0, 80) || DEFAULT_PUSH_PAYLOAD.title,
    body: payload.body?.slice(0, 160) || DEFAULT_PUSH_PAYLOAD.body,
    tag: payload.tag?.slice(0, 120),
    type: payload.type,
    url: safeUrl,
  };
}

async function getActiveSubscriptionsForUsers(userIds: string[]): Promise<PushSubscriptionRow[]> {
  if (userIds.length === 0) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth,failure_count")
    .in("user_id", userIds)
    .is("disabled_at", null);

  if (error) throw error;
  return (data ?? []) as PushSubscriptionRow[];
}

async function updateDeliveryResult(subscriptionId: string, result: "success" | "expired" | "failed") {
  const supabase = createAdminClient();

  if (result === "success") {
    await supabase
      .from("push_subscriptions")
      .update({ last_success_at: new Date().toISOString(), failure_count: 0 })
      .eq("id", subscriptionId);
    return;
  }

  if (result === "expired") {
    await supabase
      .from("push_subscriptions")
      .update({ disabled_at: new Date().toISOString() })
      .eq("id", subscriptionId);
    return;
  }

  const { data } = await supabase
    .from("push_subscriptions")
    .select("failure_count")
    .eq("id", subscriptionId)
    .maybeSingle();

  await supabase
    .from("push_subscriptions")
    .update({ failure_count: Math.max(0, Number(data?.failure_count ?? 0)) + 1 })
    .eq("id", subscriptionId);
}

async function sendToSubscriptions(subscriptions: PushSubscriptionRow[], payload: SafePushPayload): Promise<PushDeliverySummary> {
  configureWebPush();
  const safePayload = sanitizePayload(payload);
  const body = JSON.stringify(safePayload);

  const results = await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        }, body);
        await updateDeliveryResult(subscription.id, "success");
        return "sent" as const;
      } catch (error) {
        const statusCode = error instanceof WebPushError ? error.statusCode : undefined;
        if (statusCode === 404 || statusCode === 410) {
          await updateDeliveryResult(subscription.id, "expired");
          return "expired" as const;
        }
        await updateDeliveryResult(subscription.id, "failed");
        return "failed" as const;
      }
    })
  );

  return results.reduce<PushDeliverySummary>((summary, result) => {
    if (result.status === "fulfilled") {
      summary[result.value] += 1;
    } else {
      summary.failed += 1;
    }
    return summary;
  }, { sent: 0, expired: 0, failed: 0 });
}

export async function sendPushToUser(userId: string, payload: SafePushPayload): Promise<PushDeliverySummary> {
  const subscriptions = await getActiveSubscriptionsForUsers([userId]);
  return sendToSubscriptions(subscriptions, payload);
}

export async function sendPushToRelationshipPartner(
  actorUserId: string,
  relationshipId: string,
  payload: SafePushPayload,
  options: { eventKey?: string; targetMemoryId?: string | null } = {}
): Promise<PushDeliverySummary & { duplicate: boolean }> {
  const supabase = createAdminClient();

  const { data: actorMembership, error: actorError } = await supabase
    .from("relationship_members")
    .select("profile_id")
    .eq("relationship_id", relationshipId)
    .eq("profile_id", actorUserId)
    .maybeSingle();

  if (actorError) throw actorError;
  if (!actorMembership) throw new Error("Actor is not a relationship member.");

  const { data: partners, error: partnerError } = await supabase
    .from("relationship_members")
    .select("profile_id")
    .eq("relationship_id", relationshipId)
    .neq("profile_id", actorUserId);

  if (partnerError) throw partnerError;
  const recipientIds = (partners ?? []).map((partner) => partner.profile_id).filter(Boolean);

  if (options.eventKey) {
    const { error: deliveryError } = await supabase
      .from("push_delivery_events")
      .insert({
        event_key: options.eventKey,
        relationship_id: relationshipId,
        actor_id: actorUserId,
        event_type: payload.type ?? "test",
        target_memory_id: options.targetMemoryId ?? null,
      });

    if (deliveryError?.code === "23505") {
      return { sent: 0, expired: 0, failed: 0, duplicate: true };
    }
    if (deliveryError) throw deliveryError;
  }

  const subscriptions = await getActiveSubscriptionsForUsers(recipientIds);
  const summary = await sendToSubscriptions(subscriptions, payload);

  if (options.eventKey) {
    await supabase
      .from("push_delivery_events")
      .update({ sent: summary.sent, expired: summary.expired, failed: summary.failed })
      .eq("event_key", options.eventKey);
  }

  return { ...summary, duplicate: false };
}
