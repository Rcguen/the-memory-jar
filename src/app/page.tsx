"use client";

import { useEffect, useState, useRef, useTransition } from "react";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { Compass, LayoutDashboard, LogOut, User, BookOpen, Loader2 } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { logoutAction } from "@/app/actions/auth";
import { clearPrivateClientData } from "@/lib/cache-cleanup";
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
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { usePhysics } from "@/providers/physics-provider";
import { memoryService } from "@/services/memory";
import { createClient } from "@/lib/supabase/client";
import { MemoryType } from "@/types/memory";
import { useRelationshipContext } from "@/hooks/useRelationshipContext";
import { useAvatarUrl } from "@/hooks/useAvatarUrl";
import { useRoutePrefetch } from "@/hooks/useRoutePrefetch";
import { RelationshipAmbientBackdrop } from "@/components/experience/RelationshipAmbientBackdrop";
import { OnThisDayCard } from "@/components/experience/OnThisDayCard";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { TodayCard } from "@/components/home/TodayCard";
import { DailyReflection } from "@/components/home/DailyReflection";
import { ContinueReadingCard } from "@/components/home/ContinueReadingCard";
import { NextMomentCard } from "@/components/home/NextMomentCard";
import { MemoryReel } from "@/components/home/MemoryReel";
import { LittleMoments } from "@/components/home/LittleMoments";
import { RelationshipPlant } from "@/components/home/RelationshipPlant";
import { CozyDetails } from "@/components/home/CozyDetails";
import { DeskCat } from "@/components/home/DeskCat";
import { AmbientManager } from "@/components/home/AmbientManager";
import { JarWeather } from "@/components/home/JarWeather";
import { MemoryWhisper } from "@/components/home/MemoryWhisper";
import { MemoryOfTheDay } from "@/components/home/MemoryOfTheDay";
import { TodaysLetter } from "@/components/home/TodaysLetter";
import { LivingMemoryShelf } from "@/components/home/LivingMemoryShelf";
import { RelationshipOnboarding } from "@/components/onboarding/RelationshipOnboarding";

const MotionLink = motion.create(Link);

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
  const { data: avatarUrl } = useAvatarUrl(profile?.avatar);
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

  if (profile && !profile.active_relationship_id) {
    return <RelationshipOnboarding />;
  }

  return (
    <main className="relative min-h-screen xl:h-[100dvh] xl:overflow-hidden flex flex-col items-center justify-start home-room transition-colors duration-700 xl:justify-center w-full pb-36 sm:pb-8 xl:pb-0">
      
      <AnimatePresence>
        {memoryCount === null && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-emerald-50/95 dark:bg-emerald-950/95 backdrop-blur-xl"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-200/30 via-transparent to-transparent dark:from-emerald-800/20 pointer-events-none" />
            <div className="relative flex flex-col items-center justify-center p-8 z-10">
              <div className="relative flex w-16 h-16 items-center justify-center mb-8">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-emerald-300/30 dark:border-emerald-700/30 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-emerald-400/20 dark:border-emerald-600/20 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_0.5s]" />
                <div className="relative z-10 flex w-full h-full items-center justify-center bg-white/40 dark:bg-zinc-900/40 rounded-full border border-white/50 dark:border-zinc-800/50 shadow-2xl backdrop-blur-md">
                  <Loader2 className="w-7 h-7 animate-spin text-emerald-600/80 dark:text-emerald-400/80" />
                </div>
              </div>
              <h2 className="font-cormorant text-3xl md:text-4xl tracking-[0.2em] text-zinc-800 dark:text-zinc-200 mb-3 opacity-90">
                The Memory Jar
              </h2>
              <div className="flex items-center gap-3">
                <div className="w-12 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
                <span className="text-[10px] tracking-[0.3em] uppercase text-emerald-700/60 dark:text-emerald-400/60 font-medium">
                  Gathering Memories
                </span>
                <div className="w-12 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            <MotionLink
              href="/timeline"
              onMouseEnter={prefetchTimeline}
              onTouchStart={prefetchTimeline}
              onFocus={prefetchTimeline}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--divider)] bg-[var(--surface-wood)]/60 px-4 py-2 text-sm text-[var(--text-primary)] shadow-[var(--shadow-2)] backdrop-blur-xl transition-colors hover:bg-[var(--surface-wood)]/80 focus-ring-premium"
            >
            <Compass className="h-4 w-4 text-emerald-400" />
            Timeline
          </MotionLink>
            <MotionLink
              href="/dashboard"
              onMouseEnter={prefetchDashboard}
              onTouchStart={prefetchDashboard}
              onFocus={prefetchDashboard}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--divider)] bg-[var(--surface-wood)]/60 px-4 py-2 text-sm text-[var(--text-primary)] shadow-[var(--shadow-2)] backdrop-blur-xl transition-colors hover:bg-[var(--surface-wood)]/80 focus-ring-premium"
            >
            <LayoutDashboard className="h-4 w-4 text-rose-300" />
            Dashboard
          </MotionLink>
            <MotionLink
              href="/memory-book"
              onMouseEnter={prefetchBook}
              onTouchStart={prefetchBook}
              onFocus={prefetchBook}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--divider)] bg-[var(--surface-wood)]/60 px-4 py-2 text-sm text-[var(--text-primary)] shadow-[var(--shadow-2)] backdrop-blur-xl transition-colors hover:bg-[var(--surface-wood)]/80 focus-ring-premium"
            >
              <BookOpen className="h-4 w-4 text-amber-200" />
              Memory Book
            </MotionLink>
        </div>
        {profile && (
          <div className="pointer-events-auto ml-auto flex items-center gap-2 rounded-full border border-[var(--divider)] bg-[var(--surface-wood)]/50 px-1.5 py-1 shadow-[var(--shadow-2)] backdrop-blur-xl sm:gap-3 sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none sm:border-transparent">
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger className="relative h-10 flex items-center gap-2 rounded-full hover:bg-[var(--surface-raised)]/20 active:scale-[0.96] transition-[transform,background-color,border-color,box-shadow] pr-4 pl-1 outline-none focus-ring-premium">
              <Avatar className="h-8 w-8">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={profile.display_name} />}
                <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                  {profile.display_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="font-inter text-sm font-medium hidden sm:inline-block text-[var(--text-primary)]">
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
                onClick={() => startTransition(async () => { await clearPrivateClientData(); await logoutAction(); })}
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
      <div className="relative z-10 flex w-full max-w-[23rem] flex-col items-center px-3 pb-8 pt-20 sm:max-w-2xl sm:px-4 sm:pb-10 sm:pt-24 lg:pt-12 xl:pt-8">
        
        {/* Title / Mood Text */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="mb-4 w-full text-center sm:mb-6 lg:mb-4"
        >
          <h1 className="font-cormorant text-[2rem] leading-none tracking-[0.18em] text-zinc-800 opacity-80 sm:text-3xl sm:tracking-widest md:text-4xl dark:text-zinc-200">
            The Memory Jar
          </h1>
          <p className="mt-2 text-[10px] uppercase tracking-[0.28em] text-zinc-500/90 dark:text-zinc-400/80 sm:hidden">
            Keep your little moments close
          </p>
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
            className="-mt-4 sm:-mt-6 md:-mt-10 lg:-mt-12 mb-4 sm:mb-6" 
          />
        )}

        <OnThisDayCard className="mt-8" />

        {/* The Writing Desk (Staging Area) */}
        <ErrorBoundary fallbackMessage="The Writing Desk encountered an error.">
          <WritingDesk />
        </ErrorBoundary>

        {/* Call to Action */}
        <div className="hidden sm:block mt-0 relative z-10">
          <DropMemoryButton />
        </div>

      </div>

      {/* LEFT PANEL: Memory Shelf (Primary Actions) */}
      <div className="relative z-10 mt-8 w-full max-w-[23rem] px-3 sm:max-w-3xl sm:px-4 xl:absolute xl:bottom-6 xl:left-6 xl:top-24 xl:mt-0 xl:w-[24rem] xl:max-w-none xl:px-0 xl:pb-0 2xl:w-[34rem] xl:overflow-y-auto xl:[scrollbar-width:none] xl:[&::-webkit-scrollbar]:hidden">
        <div className="flex flex-col relative z-10 xl:pr-3 xl:pb-12 min-h-full">
          <LivingMemoryShelf className="home-shelf relative min-h-[500px] flex-1">
            <DeskCat />
            <ErrorBoundary fallbackMessage="Memory tools failed to load.">
              <MemoryCommandCenter className="xl:mt-0 xl:max-w-none h-full" />
            </ErrorBoundary>
          </LivingMemoryShelf>
        </div>
      </div>

      {/* RIGHT PANEL: Storytelling & Ambient Cards */}
      <div className="relative z-10 mt-4 w-full max-w-[23rem] px-3 pb-32 sm:max-w-3xl sm:px-4 xl:absolute xl:bottom-6 xl:right-6 xl:top-24 xl:mt-0 xl:w-[24rem] xl:max-w-none xl:px-0 xl:pb-0 2xl:w-[32rem] xl:overflow-y-auto xl:[scrollbar-width:none] xl:[&::-webkit-scrollbar]:hidden">
        <CozyDetails />
        <AmbientManager />
        
        <div className="home-desk grid grid-cols-1 gap-3 sm:gap-4 relative z-10 xl:grid-cols-2 xl:pl-3 xl:pr-2 xl:pb-12 min-h-full">
          
          <div className="flex justify-between items-end mb-1">
            <JarWeather />
          </div>

          <div className="xl:col-span-2"><MemoryWhisper /></div>
          <div className="xl:col-span-2"><MemoryOfTheDay /></div>
          <div className="grid gap-2.5 sm:grid-cols-[1fr_0.72fr] xl:col-span-2">
            <ContinueReadingCard />
            <NextMomentCard />
          </div>
          <div className="hidden xl:block xl:col-span-2"><TodaysLetter /></div>
          <div className="hidden xl:block xl:col-span-2"><DailyReflection /></div>
          <div className="xl:col-span-2"><MemoryReel /></div>
          <div className="grid gap-2.5 sm:grid-cols-[1fr_auto] xl:col-span-2">
            <LittleMoments />
            <RelationshipPlant />
          </div>
        </div>
      </div>

      <MobileBottomNav />

      {/* Global Modals & Portals for this route */}      <ErrorBoundary fallbackMessage="Memory Creation failed to load.">
        <MemoryModal />
      </ErrorBoundary>
      <ErrorBoundary fallbackMessage="Memory Viewer crashed. Try opening a different memory.">
        <MemoryViewer />
      </ErrorBoundary>
    </main>
  );
}
