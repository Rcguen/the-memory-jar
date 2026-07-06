import { CoupleDashboardView } from "@/components/experience/CoupleDashboardView";
import { MemoryViewerPortal } from "@/components/viewer/MemoryViewerPortal";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { MemoryModalPortal } from "@/components/jar/MemoryModalPortal";

export default function DashboardPage() {
  return (
    <>
      <CoupleDashboardView />
      <MemoryViewerPortal />
      <MemoryModalPortal />
      <MobileBottomNav />
    </>
  );
}
