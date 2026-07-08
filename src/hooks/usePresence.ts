import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRealtimeContext } from "@/providers/realtime-provider";

type PresenceState = Record<string, Array<{ user?: string; online_at?: string }>>;

export function usePresence(relationshipId: string | null, userId: string | undefined, partnerId: string | null = null) {
  const { subscribePresence, unsubscribePresence, trackPresence, untrackPresence } = useRealtimeContext();
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const presenceStateRef = useRef<PresenceState>({});

  const channelName = useMemo(
    () => (relationshipId ? `jar_heartbeat_${relationshipId}` : null),
    [relationshipId],
  );

  const evaluatePresenceState = useCallback(
    (state: PresenceState) => {
      const uniqueUsers = new Set<string>();
      const freshnessWindowMs = 6_500;
      const now = Date.now();
      let partnerIsFresh = false;

      for (const key in state) {
        const presences = state[key] ?? [];
        for (const presence of presences) {
          if (!presence.user) continue;
          uniqueUsers.add(presence.user);

          if (partnerId && presence.user === partnerId) {
            const trackedAt = presence.online_at ? new Date(presence.online_at).getTime() : 0;
            if (Number.isFinite(trackedAt) && now - trackedAt <= freshnessWindowMs) {
              partnerIsFresh = true;
            }
          }
        }
      }

      setOnlineCount(uniqueUsers.size);

      if (partnerId) {
        setPartnerOnline(partnerIsFresh);
        return;
      }

      const otherUsers = Array.from(uniqueUsers).filter((id) => id !== userId);
      setPartnerOnline(otherUsers.length > 0);
    },
    [partnerId, userId],
  );

  useEffect(() => {
    if (!channelName || !userId) return;

    const handlePresenceSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      const state = (customEvent.detail ?? {}) as PresenceState;
      presenceStateRef.current = state;
      evaluatePresenceState(state);
    };

    window.addEventListener(`presence-${channelName}`, handlePresenceSync);

    const onChannelReady = () => {
      void trackPresence(channelName, { online_at: new Date().toISOString(), user: userId });
    };
    subscribePresence(channelName, onChannelReady);

    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        await trackPresence(channelName, { online_at: new Date().toISOString(), user: userId });
        evaluatePresenceState(presenceStateRef.current);
      } else {
        await untrackPresence(channelName);
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);

    const handleUnload = () => {
      void untrackPresence(channelName);
    };
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);

    const heartbeatInterval = window.setInterval(() => {
      if (document.hidden) return;
      void trackPresence(channelName, { online_at: new Date().toISOString(), user: userId });
    }, 3_000);

    const freshnessInterval = window.setInterval(() => {
      evaluatePresenceState(presenceStateRef.current);
    }, 1_000);

    return () => {
      window.clearInterval(heartbeatInterval);
      window.clearInterval(freshnessInterval);
      void untrackPresence(channelName);
      window.removeEventListener(`presence-${channelName}`, handlePresenceSync);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
      unsubscribePresence(channelName);
    };
  }, [channelName, userId, subscribePresence, unsubscribePresence, trackPresence, untrackPresence, evaluatePresenceState]);

  return { partnerOnline, onlineCount };
}

