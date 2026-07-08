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
      let partnerIsFresh = false;

      for (const key in state) {
        const presences = state[key] ?? [];
        for (const presence of presences) {
          if (!presence.user) continue;
          uniqueUsers.add(presence.user);

          if (partnerId && presence.user === partnerId) {
            partnerIsFresh = true;
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

    let visibilityTimeout: number | null = null;

    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        if (visibilityTimeout !== null) {
          window.clearTimeout(visibilityTimeout);
          visibilityTimeout = null;
        }
        await trackPresence(channelName, { online_at: new Date().toISOString(), user: userId });
        evaluatePresenceState(presenceStateRef.current);
      } else {
        visibilityTimeout = window.setTimeout(async () => {
          await untrackPresence(channelName);
        }, 45_000);
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);

    const handleUnload = () => {
      void untrackPresence(channelName);
    };
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);

    return () => {
      if (visibilityTimeout !== null) {
        window.clearTimeout(visibilityTimeout);
      }
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

