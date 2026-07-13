import { useEffect, useState } from "react";
import { useRealtimeContext } from "@/providers/realtime-provider";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { notifyPushEvent } from "@/lib/push/client-events";

export function useKnockState(memoryId: string | null, userId: string | undefined) {
  const { subscribePostgres, unsubscribePostgres } = useRealtimeContext();
  const queryClient = useQueryClient();
  const [hasKnocked, setHasKnocked] = useState(false);
  const [partnerKnocked, setPartnerKnocked] = useState(false);

  // Fetch initial state
  useEffect(() => {
    if (!memoryId || !userId) return;

    let isMounted = true;
    const supabase = createClient();
    supabase
      .from("memory_open_participants")
      .select("user_id")
      .eq("memory_id", memoryId)
      .then(({ data }) => {
        if (!isMounted || !data) return;
        const userK = data.some((p) => p.user_id === userId);
        const partnerK = data.some((p) => p.user_id !== userId);
        setHasKnocked(userK);
        setPartnerKnocked(partnerK);
      });

    return () => {
      isMounted = false;
    };
  }, [memoryId, userId]);

  // Realtime subscription
  useEffect(() => {
    if (!memoryId || !userId) return;

    const channelName = `knock_${memoryId}`;

    const handlePostgresChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      const payload = customEvent.detail;
      
      if (payload.table === 'memory_open_participants' && payload.eventType === 'INSERT') {
        if (payload.new.user_id === userId) {
          setHasKnocked(true);
        } else {
          setPartnerKnocked(true);
        }
      }
      
      if (payload.table === 'memories' && payload.eventType === 'UPDATE') {
        if (payload.new.status === 'opening') {
          window.dispatchEvent(new CustomEvent('memory-opened', { detail: { id: memoryId } }));
          queryClient.invalidateQueries({ queryKey: ['memory', memoryId] });
          queryClient.invalidateQueries({ queryKey: ['memories'] });
        }
      }
    };

    window.addEventListener(`postgres-${channelName}`, handlePostgresChange);

    subscribePostgres(channelName, 'INSERT', 'public', 'memory_open_participants', `memory_id=eq.${memoryId}`);
    subscribePostgres(channelName, 'UPDATE', 'public', 'memories', `id=eq.${memoryId}`);

    return () => {
      window.removeEventListener(`postgres-${channelName}`, handlePostgresChange);
      // We subscribe twice, so we unsubscribe twice to balance refs
      unsubscribePostgres(channelName);
      unsubscribePostgres(channelName);
    };
  }, [memoryId, userId, subscribePostgres, unsubscribePostgres, queryClient]);

  const openMemory = async () => {
    if (!memoryId) return;
    const supabase = createClient();
    await supabase.from("memories").update({ status: "opening" }).eq("id", memoryId);
    window.dispatchEvent(new CustomEvent("memory-opened", { detail: { id: memoryId } }));
    queryClient.invalidateQueries({ queryKey: ["memory", memoryId] });
    queryClient.invalidateQueries({ queryKey: ["memories"] });
  };

  const knock = async (options?: { autoOpen?: boolean }) => {
    if (!memoryId || !userId) return;
    const supabase = createClient();
    await supabase.from("memory_open_participants").insert({
      memory_id: memoryId,
      user_id: userId
    });

    if (!partnerKnocked) {
      notifyPushEvent("collaborative_capsule_waiting", memoryId);
    }
    
    // Fallback: if we just became the second knocker, trigger opening
    if (partnerKnocked && options?.autoOpen !== false) {
      await openMemory();
    }
  };

  return { hasKnocked, partnerKnocked, knock, openMemory };
}
