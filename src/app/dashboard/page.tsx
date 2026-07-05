import { CoupleDashboardView } from "@/components/experience/CoupleDashboardView";
import { MemoryViewerPortal } from "@/components/viewer/MemoryViewerPortal";

export default function DashboardPage() {
  return (
    <>
      <CoupleDashboardView />
      <MemoryViewerPortal />
    </>
  );
}
