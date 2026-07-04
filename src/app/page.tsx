"use client";

import { useEffect, useState, useRef, useTransition } from "react";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { User, LogOut } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { logoutAction } from "@/app/actions/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// New specialized components
import { GlassJar } from "@/components/jar/GlassJar";
import { FloatingParticles } from "@/components/jar/FloatingParticles";
import { RelationshipCounter } from "@/components/jar/RelationshipCounter";
import { DropMemoryButton } from "@/components/jar/DropMemoryButton";
import { WritingDesk } from "@/components/jar/WritingDesk";
import { JarHeartbeat } from "@/components/jar/JarHeartbeat";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { usePhysics } from "@/providers/physics-provider";
import { memoryService } from "@/services/memory";
import { createClient } from "@/lib/supabase/client";
import { MemoryType } from "@/types/memory";

const MemoryCommandCenter = dynamic(
  () => import("@/components/jar/MemoryCommandCenter").then((mod) => mod.MemoryCommandCenter),
  { ssr: false },
);

const MemoryModal = dynamic(
  () => import("@/components/jar/MemoryModal").then((mod) => mod.MemoryModal),
  { ssr: false },
);

const MemoryViewer = dynamic(
  () => import("@/components/viewer/MemoryViewer").then((mod) => mod.MemoryViewer),
  { ssr: false },
);

export default function Home() {
  const { profile } = useAuth();
  
  const [relationshipStartDate, setRelationshipStartDate] = useState<Date | null>(null);
  const { loadMemory } = usePhysics();
  const [memoryCount, setMemoryCount] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasLoadedJar = useRef(false);

  useEffect(() => {
    if (hasLoadedJar.current) return;
    hasLoadedJar.current = true;

    async function loadJar() {
      const supabase = createClient();
      
      // Fetch relationship start date
      if (profile) {
        const { data: memberData } = await supabase
          .from("relationship_members")
          .select("relationship_id")
          .eq("profile_id", profile.id)
          .limit(1)
          .single();
          
        if (memberData) {
          const { data: settingsData } = await supabase
            .from("relationship_settings")
            .select("start_date")
            .eq("id", memberData.relationship_id)
            .single();
            
          if (settingsData?.start_date) {
            setRelationshipStartDate(new Date(settingsData.start_date));
          }
        }
      }

      // Fetch both visual states and their corresponding memory types, filtering out drafts, archived, and pending_partner
      const { data: memories, error } = await supabase
        .from("memories")
        .select("id, type, status, unlock_at, capsule_style, is_collaborative, memory_visual_state(position_x, position_y, rotation, scale, velocity_x, velocity_y, is_sleeping)")
        .in("status", ["sealed", "unlocked", "opening"])
        .is("deleted_at", null);
        
      if (!error && memories) {
        setMemoryCount(memories.length);
        
        memories.forEach(mem => {
          const vs = mem.memory_visual_state as unknown as import("@/types/memory").MemoryVisualState | import("@/types/memory").MemoryVisualState[]; 
          const stateData = Array.isArray(vs) ? vs[0] : vs;
          
          if (process.env.NODE_ENV === "development" && false) {
            console.log(`Loading memory ${mem.id}: stateData=`, stateData);
          }
          
          if (stateData) {
            loadMemory(mem.id, mem.type as MemoryType, {
              id: mem.id,
              type: mem.type as MemoryType,
              status: mem.status as import("@/lib/physics/EngineCore").NormalizedVisualState["status"],
              capsuleStyle: mem.capsule_style as import("@/lib/physics/EngineCore").NormalizedVisualState["capsuleStyle"],
              unlockAt: mem.unlock_at,
              isCollaborative: mem.is_collaborative,
              x: stateData.position_x,
              y: stateData.position_y,
              rotation: stateData.rotation,
              scale: stateData.scale,
              vx: stateData.velocity_x,
              vy: stateData.velocity_y,
              isSleeping: stateData.is_sleeping
            });
          } else {
            loadMemory(mem.id, mem.type as MemoryType, {
              id: mem.id,
              type: mem.type as MemoryType,
              status: mem.status as import("@/lib/physics/EngineCore").NormalizedVisualState["status"],
              capsuleStyle: mem.capsule_style as import("@/lib/physics/EngineCore").NormalizedVisualState["capsuleStyle"],
              unlockAt: mem.unlock_at,
              isCollaborative: mem.is_collaborative,
              x: 0.5,
              y: 0,
              rotation: 0,
              scale: 1,
              vx: 0,
              vy: 0,
              isSleeping: false
            });
            // Asynchronously initialize missing visual state to ensure persistence
            memoryService.initializeVisualState(mem.id);
          }
        });
      }
    }
    loadJar();
    // Explicitly disabling exhaustive-deps because this effect is intentionally designed
    // to execute exactly once using a ref guard to prevent physics duplication loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-emerald-50/30 dark:bg-emerald-950/20 transition-colors duration-700">
      
      {/* 1. Ambient Background Gradients & Vignette */}
      {/* Radial soft lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-teal-100/40 via-emerald-50/20 to-transparent dark:from-teal-900/20 dark:via-emerald-950/30 dark:to-transparent pointer-events-none z-0" />
      {/* Vignette effect for warmth and focus */}
      <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_200px_rgba(0,0,0,0.8)] pointer-events-none z-0" />
      {/* Tiny light rays coming from top */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-white/20 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none z-0 blur-2xl" />

      {/* 2. Ambient Particles */}
      <FloatingParticles />

      {/* 3. Top Navigation */}
      <header className="absolute top-0 left-0 right-0 p-6 flex justify-end z-20">
        {profile && (
          <DropdownMenu>
            <DropdownMenuTrigger className="relative h-10 flex items-center gap-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 pr-4 pl-1 outline-none transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile.avatar || ""} alt={profile.display_name} />
                <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                  {profile.avatar ? profile.avatar : profile.display_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="font-inter text-sm font-medium hidden sm:inline-block text-zinc-700 dark:text-zinc-300">
                {profile.display_name}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{profile.display_name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      @{profile.username}
                    </p>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer text-rose-600 dark:text-rose-400 focus:text-rose-600 dark:focus:text-rose-400" 
                onClick={() => startTransition(async () => { await logoutAction(); })}
                disabled={isPending}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{isPending ? "Logging out..." : "Log out"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {/* 4. Main Content Area */}
      <div className="relative z-10 container flex flex-col items-center px-4 max-w-2xl mx-auto">
        
        {/* Title / Mood Text */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl md:text-4xl font-light tracking-widest text-zinc-800 dark:text-zinc-200 font-cormorant uppercase opacity-80">
            The Memory Jar
          </h1>
        </motion.div>

        {/* The Physical Glass Jar */}
        {memoryCount !== null && (
          <ErrorBoundary fallbackMessage="The Jar engine crashed. Physics might be temporarily disabled.">
            <GlassJar memoryCount={memoryCount} />
          </ErrorBoundary>
        )}

        {/* Relationship Time Elapsed */}
        {relationshipStartDate && (
          <RelationshipCounter startDate={relationshipStartDate} />
        )}

        {/* The Writing Desk (Staging Area) */}
        <ErrorBoundary fallbackMessage="The Writing Desk encountered an error.">
          <WritingDesk />
        </ErrorBoundary>

        {/* Call to Action */}
        <DropMemoryButton />

      </div>

      <div className="relative z-10 w-full max-w-3xl px-4 xl:absolute xl:left-6 xl:top-24 xl:bottom-6 xl:w-[28rem] xl:max-w-none xl:px-0 2xl:w-[34rem]">
        <ErrorBoundary fallbackMessage="Memory tools failed to load.">
          <MemoryCommandCenter className="xl:mt-0 xl:max-w-none" />
        </ErrorBoundary>
      </div>

      {/* Global Modals & Portals for this route */}
      <ErrorBoundary fallbackMessage="Jar Heartbeat failed to load.">
        <JarHeartbeat />
      </ErrorBoundary>
      <ErrorBoundary fallbackMessage="Memory Creation failed to load.">
        <MemoryModal />
      </ErrorBoundary>
      <ErrorBoundary fallbackMessage="Memory Viewer crashed. Try opening a different memory.">
        <MemoryViewer />
      </ErrorBoundary>
    </main>
  );
}
