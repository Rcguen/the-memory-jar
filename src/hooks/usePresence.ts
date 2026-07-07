import { useEffect, useState } from "react";
import { useRealtimeContext } from "@/providers/realtime-provider";

export function usePresence(relationshipId: string | null, userId: string | undefined, partnerId: string | null = null) {
  const { subscribePresence, unsubscribePresence, trackPresence, untrackPresence } = useRealtimeContext();
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    if (!relationshipId || !userId) return;

    const channelName = `jar_heartbeat_${relationshipId}`;

    // 1. Listen for the decoupled custom event
    const handlePresenceSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      const state = customEvent.detail;
      
      const uniqueUsers = new Set<string>();
      for (const key in state) {
        const presences = state[key] as Array<{ user?: string }>;
        for (const presence of presences) {
          if (presence.user) {
            uniqueUsers.add(presence.user);
          }
        }
      }

      const count = uniqueUsers.size;
      setOnlineCount(count);
      
      if (partnerId) {
        setPartnerOnline(uniqueUsers.has(partnerId));
      } else {
        setPartnerOnline(uniqueUsers.size >= 2 && Array.from(uniqueUsers).some(id => id !== userId));
      }
    };

    window.addEventListener(`presence-${channelName}`, handlePresenceSync);

    // 2. Subscribe — track presence exactly when channel confirms SUBSCRIBED
    const onChannelReady = () => {
      trackPresence(channelName, { online_at: new Date().toISOString(), user: userId });
    };
    subscribePresence(channelName, onChannelReady);

    // 3. Track visibility
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        await trackPresence(channelName, { online_at: new Date().toISOString(), user: userId });
      } else {
        await untrackPresence(channelName);
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    
    // Attempt immediate untrack on tab close/unload
    const handleUnload = () => {
      void untrackPresence(channelName);
    };
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);

    return () => {
      void untrackPresence(channelName);
      window.removeEventListener(`presence-${channelName}`, handlePresenceSync);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
      unsubscribePresence(channelName);
    };
  }, [relationshipId, userId, partnerId, subscribePresence, unsubscribePresence, trackPresence, untrackPresence]);

  return { partnerOnline, onlineCount };
}
