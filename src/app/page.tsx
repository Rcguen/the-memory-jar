"use client";

import { useEffect, useState, useRef, useTransition } from "react";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { Compass, LayoutDashboard, LogOut, User, BookOpen } from "lucide-react";
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

import { GlassJar } from "@/components/jar/GlassJar";
import { CouplePresenceAvatars } from "@/components/jar/CouplePresenceAvatars";
import { AmbientParticles } from "@/components/ui/AmbientParticles";
import { RelationshipCounter } from "@/components/jar/RelationshipCounter";
import { DropMemoryButton } from "@/components/jar/DropMemoryButton";
import { WritingDesk } from "@/components/jar/WritingDesk";
import { JarHeartbeat } from "@/components/jar/JarHeartbeat";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { usePhysics } from "@/providers/physics-provider";
import { memoryService } from "@/services/memory";
import { createClient } from "@/lib/supabase/client";
import { MemoryType } from "@/types/memory";
import { useRelationshipContext } from "@/hooks/useRelationshipContext";
import { useRoutePrefetch } from "@/hooks/useRoutePrefetch";
import { RelationshipAmbientBackdrop } from "@/components/experience/RelationshipAmbientBackdrop";
import { OnThisDayCard } from "@/components/experience/OnThisDayCard";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";

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
  const { data: relationship } = useRelationshipContext();
  const { loadMemory } = usePhysics();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [memoryCount, setMemoryCount] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasLoadedJar = useRef(false);

  useRoutePrefetch(["/timeline", "/dashboard", "/on-this-day", "/trash", "/profile"]);

  useEffect(() => {
    if (hasLoadedJar.current) return;
    hasLoadedJar.current = true;

    async function loadJar() {
      const supabase = createClient();

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

  useEffect(() => {
    if (!relationship?.relationshipTimezone) return;

    queryClient.prefetchInfiniteQuery({
      queryKey: ["timeline-memories", "all"],
      queryFn: ({ pageParam }) => memoryService.listTimelineMemories({ filter: "all", offset: pageParam as number }),
      initialPageParam: 0,
      staleTime: 1000 * 30,
    });

    queryClient.prefetchQuery({
      queryKey: ["dashboard-stats", relationship.relationshipTimezone],
      queryFn: () => memoryService.getCoupleDashboardStats(relationship.relationshipTimezone),
      staleTime: 1000 * 60,
    });

    queryClient.prefetchQuery({
      queryKey: ["on-this-day", relationship.relationshipTimezone],
      queryFn: () => memoryService.getOnThisDayMemories(relationship.relationshipTimezone),
      staleTime: 1000 * 60 * 10,
    });
  }, [queryClient, relationship?.relationshipTimezone]);

  const prefetchTimeline = () => router.prefetch("/timeline");
  const prefetchDashboard = () => router.prefetch("/dashboard");
  const prefetchBook = () => router.prefetch("/memory-book");

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-start overflow-x-hidden bg-emerald-50/30 dark:bg-emerald-950/20 transition-colors duration-700 xl:justify-center">
      
      {/* 1. Ambient Background Gradients & Vignette */}
      {relationship?.relationshipTimezone && (
        <RelationshipAmbientBackdrop timezone={relationship.relationshipTimezone} />
      )}
      {/* Radial soft lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-teal-100/40 via-emerald-50/20 to-transparent dark:from-teal-900/20 dark:via-emerald-950/30 dark:to-transparent pointer-events-none z-0" />
      {/* Vignette effect for warmth and focus */}
      <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_200px_rgba(0,0,0,0.8)] pointer-events-none z-0" />
      {/* Tiny light rays coming from top */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-white/20 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none z-0 blur-2xl" />

      {/* 2. Ambient Particles */}
      <AmbientParticles />

      {/* 3. Top Navigation */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-3 sm:p-6">
        <div className="flex items-start justify-between gap-3">
        <div className="pointer-events-auto hidden items-center gap-2 md:flex">
            <Link
              href="/timeline"
              onMouseEnter={prefetchTimeline}
              onTouchStart={prefetchTimeline}
              onFocus={prefetchTimeline}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950/35 px-4 py-2 text-sm text-zinc-200 shadow-lg backdrop-blur-xl transition-colors hover:bg-zinc-950/55"
            >
            <Compass className="h-4 w-4 text-emerald-400" />
            Timeline
          </Link>
            <Link
              href="/dashboard"
              onMouseEnter={prefetchDashboard}
              onTouchStart={prefetchDashboard}
              onFocus={prefetchDashboard}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950/35 px-4 py-2 text-sm text-zinc-200 shadow-lg backdrop-blur-xl transition-colors hover:bg-zinc-950/55"
            >
            <LayoutDashboard className="h-4 w-4 text-rose-300" />
            Dashboard
          </Link>
            <Link
              href="/memory-book"
              onMouseEnter={prefetchBook}
              onTouchStart={prefetchBook}
              onFocus={prefetchBook}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950/35 px-4 py-2 text-sm text-zinc-200 shadow-lg backdrop-blur-xl transition-colors hover:bg-zinc-950/55"
            >
              <BookOpen className="h-4 w-4 text-amber-200" />
              Memory Book
            </Link>
        </div>
        {profile && (
          <div className="pointer-events-auto ml-auto flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950/28 px-1.5 py-1 shadow-lg backdrop-blur-xl sm:gap-3 sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none">
          <NotificationBell />
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
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => router.push("/profile")}
              >
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
          </div>
        )}
        </div>
      </header>

      {/* 4. Main Content Area */}
      <div className="relative z-10 flex w-full max-w-[23rem] flex-col items-center px-3 pb-36 pt-16 sm:max-w-2xl sm:px-4 sm:pb-10 sm:pt-24">
        
        {/* Title / Mood Text */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="mb-6 w-full text-center sm:mb-10"
        >
          <h1 className="font-cormorant text-[2rem] leading-none tracking-[0.18em] text-zinc-800 opacity-80 sm:text-3xl sm:tracking-widest md:text-4xl dark:text-zinc-200">
            The Memory Jar
          </h1>
          <p className="mt-2 text-[10px] uppercase tracking-[0.28em] text-zinc-500/90 dark:text-zinc-400/80 sm:hidden">
            Keep your little moments close
          </p>
          <div className="mt-4 grid w-full grid-cols-2 gap-2 md:hidden">
            <Link
              href="/timeline"
              onMouseEnter={prefetchTimeline}
              onTouchStart={prefetchTimeline}
              onFocus={prefetchTimeline}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-zinc-950/35 px-4 py-2.5 text-sm text-zinc-200 shadow-lg backdrop-blur-xl transition-colors hover:bg-zinc-950/55"
            >
              <Compass className="h-4 w-4 text-emerald-400" />
              Timeline
            </Link>
            <Link
              href="/dashboard"
              onMouseEnter={prefetchDashboard}
              onTouchStart={prefetchDashboard}
              onFocus={prefetchDashboard}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-zinc-950/35 px-4 py-2.5 text-sm text-zinc-200 shadow-lg backdrop-blur-xl transition-colors hover:bg-zinc-950/55"
            >
              <LayoutDashboard className="h-4 w-4 text-rose-300" />
              Dashboard
            </Link>
            <Link
              href="/memory-book"
              onMouseEnter={prefetchBook}
              onTouchStart={prefetchBook}
              onFocus={prefetchBook}
              className="col-span-2 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-zinc-950/35 px-4 py-2.5 text-sm text-zinc-200 shadow-lg backdrop-blur-xl transition-colors hover:bg-zinc-950/55"
            >
              <BookOpen className="h-4 w-4 text-amber-200" />
              Open Memory Book
            </Link>
          </div>
        </motion.div>

        {/* Couple Presence Avatars */}
        <CouplePresenceAvatars />

        {/* The Physical Glass Jar */}
        {memoryCount !== null && (
          <div className="relative">
            <ErrorBoundary fallbackMessage="The Jar engine crashed. Physics might be temporarily disabled.">
              <GlassJar memoryCount={memoryCount} />
            </ErrorBoundary>
          </div>
        )}

        {/* Relationship Time Elapsed */}
        {relationship?.startDate && (
          <RelationshipCounter 
            startDate={new Date(relationship.startDate)} 
            className="mt-0 sm:mt-0 md:-mt-2 mb-6 sm:mb-8" 
          />
        )}

        <OnThisDayCard className="mt-8" />

        {/* The Writing Desk (Staging Area) */}
        <ErrorBoundary fallbackMessage="The Writing Desk encountered an error.">
          <WritingDesk />
        </ErrorBoundary>

        {/* Call to Action */}
        <div className="hidden sm:block mt-2 relative z-10">
          <DropMemoryButton />
        </div>

      </div>

      <div className="relative z-10 mt-8 w-full max-w-[23rem] px-3 pb-32 sm:max-w-3xl sm:px-4 xl:absolute xl:bottom-6 xl:left-6 xl:top-24 xl:mt-0 xl:w-[28rem] xl:max-w-none xl:px-0 xl:pb-0 2xl:w-[34rem]">
        <ErrorBoundary fallbackMessage="Memory tools failed to load.">
          <MemoryCommandCenter className="xl:mt-0 xl:max-w-none" />
        </ErrorBoundary>
      </div>

      <MobileBottomNav />

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
