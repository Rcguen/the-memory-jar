"use client";

import { createContext, useContext, useEffect, useRef, useMemo } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface ChannelEntry {
  channel: RealtimeChannel;
  refs: number;
  presenceRefs: number;
}

type PresencePayload = Record<string, unknown>;

interface RealtimeContextType {
  subscribePresence: (channelName: string, onReady?: () => void) => void;
  unsubscribePresence: (channelName: string) => void;
  trackPresence: (channelName: string, payload: PresencePayload) => Promise<void>;
  untrackPresence: (channelName: string) => Promise<void>;
  
  subscribePostgres: (channelName: string, event: PostgresChangeEvent, schema: string, table: string, filter?: string) => void;
  unsubscribePostgres: (channelName: string) => void;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const channelsRef = useRef<Map<string, ChannelEntry>>(new Map());

  useEffect(() => {
    const currentMap = channelsRef.current;
    return () => {
      Array.from(currentMap.values()).forEach(({ channel }) => {
        supabase.removeChannel(channel);
      });
      currentMap.clear();
    };
  }, [supabase]);

  const getOrCreateChannel = (name: string): ChannelEntry => {
    let entry = channelsRef.current.get(name);
    if (!entry) {
      entry = { channel: supabase.channel(name), refs: 0, presenceRefs: 0 };
      channelsRef.current.set(name, entry);
    }
    return entry;
  };

  const handleRelease = (name: string) => {
    setTimeout(() => {
      const entry = channelsRef.current.get(name);
      if (entry) {
        entry.refs -= 1;
        if (entry.refs <= 0) {
          supabase.removeChannel(entry.channel);
          channelsRef.current.delete(name);
        }
      }
    }, 150); // Debounce to survive React StrictMode unmount/remount
  };

  const subscribePresence = (channelName: string, onReady?: () => void) => {
    const entry = getOrCreateChannel(channelName);
    if (entry.refs === 0) {
      entry.channel.on('presence', { event: 'sync' }, () => {
        window.dispatchEvent(new CustomEvent(`presence-${channelName}`, { 
          detail: entry.channel.presenceState() 
        }));
      });
      entry.channel.on('presence', { event: 'join' }, () => {
        window.dispatchEvent(new CustomEvent(`presence-${channelName}`, { 
          detail: entry.channel.presenceState() 
        }));
      });
      entry.channel.on('presence', { event: 'leave' }, () => {
        window.dispatchEvent(new CustomEvent(`presence-${channelName}`, { 
          detail: entry.channel.presenceState() 
        }));
      });
      if (entry.channel.state !== 'joined' && entry.channel.state !== 'joining') {
        entry.channel.subscribe((status) => {
          if (status === 'SUBSCRIBED' && onReady) {
            onReady();
          }
        });
      } else if (entry.channel.state === 'joined' && onReady) {
        // Already joined — fire callback immediately
        onReady();
      } else if (entry.channel.state === 'joining' && onReady) {
        // Will be joined soon — wait for it
        const checkInterval = setInterval(() => {
          if (entry.channel.state === 'joined') {
            clearInterval(checkInterval);
            onReady();
          }
        }, 100);
      }
    } else if (entry.channel.state === 'joined') {
      // Already joined, dispatch current state for new subscriber
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent(`presence-${channelName}`, { 
          detail: entry.channel.presenceState() 
        }));
      }, 50);
      if (onReady) onReady();
    }
    entry.refs += 1;
  };

  const trackPresence = async (channelName: string, payload: PresencePayload) => {
    const entry = channelsRef.current.get(channelName);
    if (!entry) return;

    entry.presenceRefs += 1;

    if (entry.presenceRefs === 1) {
      if (entry.channel.state === 'joined') {
        await entry.channel.track(payload);
      } else if (entry.channel.state === 'joining') {
        // Retry in 500ms if channel is currently joining
        setTimeout(() => {
          if (entry.presenceRefs > 0) {
            entry.channel.track(payload).catch(console.error);
          }
        }, 500);
      }
    }
  };

  const untrackPresence = async (channelName: string) => {
    const entry = channelsRef.current.get(channelName);
    if (entry) {
      entry.presenceRefs = Math.max(0, entry.presenceRefs - 1);
      if (entry.presenceRefs === 0 && entry.channel.state === 'joined') {
        await entry.channel.untrack();
      }
    }
  };

  const subscribePostgres = (channelName: string, event: PostgresChangeEvent, schema: string, table: string, filter?: string) => {
    const entry = getOrCreateChannel(channelName);
    if (entry.refs === 0) {
      entry.channel.on('postgres_changes', { event, schema, table, filter }, (payload) => {
        window.dispatchEvent(new CustomEvent(`postgres-${channelName}`, { detail: payload }));
      });
      if (entry.channel.state !== 'joined' && entry.channel.state !== 'joining') {
        entry.channel.subscribe();
      }
    }
    entry.refs += 1;
  };

  const contextValue = useMemo(() => ({
    subscribePresence,
    unsubscribePresence: handleRelease,
    trackPresence,
    untrackPresence,
    subscribePostgres,
    unsubscribePostgres: handleRelease
  }), []);

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeContext() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error("useRealtimeContext must be used within RealtimeProvider");
  return ctx;
}
