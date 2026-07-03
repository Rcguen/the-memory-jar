"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Memory } from "@/types/memory";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";
import { ScrollText, PenTool, CheckCircle2 } from "lucide-react";
import { usePhysics } from "@/providers/physics-provider";
import { usePendingMemories } from "@/hooks/useMemoryData";
import { useRealtimeMemory } from "@/hooks/useRealtimeMemory";
import { useQueryClient } from "@tanstack/react-query";

export function WritingDesk() {
  const { profile } = useAuth();
  const { dropMemory } = usePhysics();
  const { data: pendingMemories = [] } = usePendingMemories();
  const [partnerName, setPartnerName] = useState<string>("your partner");
  const [relationshipId, setRelationshipId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useRealtimeMemory(relationshipId); // Subscribes to realtime and invalidates queries

  useEffect(() => {
    async function loadPartner() {
      if (!profile) return;
      const supabase = createClient();
      
      const { data: members } = await supabase
        .from("relationship_members")
        .select("relationship_id")
        .eq("profile_id", profile.id)
        .single();

        if (members && members.relationship_id) {
          setRelationshipId(members.relationship_id);
          const { data: partnerData } = await supabase
            .from("relationship_members")
            .select("display_name")
            .eq("relationship_id", members.relationship_id)
            .neq("profile_id", profile.id)
            .single();
          
        if (partnerData) {
          setPartnerName(partnerData.display_name);
        }
      }
    }
    loadPartner();
  }, [profile]);

  const handleSeal = async (memory: Memory) => {
    // In a full implementation, this might open a modal for the partner to add their message
    // For now, we simulate them sealing it
    const supabase = createClient();
    const { error } = await supabase
      .from("memories")
      .update({ 
        status: "sealed", 
        sealed_at: new Date().toISOString() 
      })
      .eq("id", memory.id);

    if (error) {
      toast.error("Failed to seal memory");
      return;
    }

    // Invalidate queries instead of manually filtering local state
    queryClient.invalidateQueries({ queryKey: ['memories', 'pending_partner'] });
    
    // Play an animation and drop it into the jar!
    toast.success("The memory has been sealed together.", {
      className: "font-cormorant text-lg bg-zinc-900 text-white border-zinc-800",
    });
    
    setTimeout(() => {
      dropMemory(memory.id, memory.type, {
        status: "sealed",
        capsuleStyle: memory.capsule_style,
        unlockAt: memory.unlock_at,
        isCollaborative: memory.is_collaborative,
      });
      window.dispatchEvent(new CustomEvent("memory-saved", { detail: { memory } }));
    }, 500);
  };

  if (pendingMemories.length === 0) return null;

  return (
    <div className="w-full max-w-md mx-auto mt-16 mb-8 relative">
      <div className="absolute inset-0 bg-amber-900/5 dark:bg-amber-950/20 blur-3xl -z-10 rounded-full" />
      
      <div className="flex items-center justify-center gap-2 mb-4 text-amber-800/60 dark:text-amber-500/50">
        <PenTool className="w-4 h-4" />
        <h3 className="font-cormorant text-lg uppercase tracking-widest text-center">The Writing Desk</h3>
      </div>
      
      <div className="space-y-4">
        <AnimatePresence>
          {pendingMemories.map(memory => {
            const isCreator = memory.created_by === profile?.id;
            
            return (
              <motion.div
                key={memory.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl p-5 border border-amber-900/10 dark:border-amber-700/20 shadow-xl shadow-amber-900/5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-700 dark:text-amber-400">
                      <ScrollText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-800 dark:text-zinc-200">{memory.title || "Untitled Memory"}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Waiting to be sealed...
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-900/10 dark:border-amber-700/20 flex items-center justify-between">
                  <p className="text-sm italic text-amber-800/70 dark:text-amber-500/70 font-cormorant">
                    {isCreator ? `Waiting for ${partnerName}...` : `${partnerName} left this for you.`}
                  </p>
                  
                  {!isCreator && (
                    <button
                      onClick={() => handleSeal(memory)}
                      className="flex items-center gap-1.5 text-xs font-medium bg-amber-700 hover:bg-amber-800 text-white px-3 py-1.5 rounded-full transition-colors shadow-md shadow-amber-900/20"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Seal Together
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
