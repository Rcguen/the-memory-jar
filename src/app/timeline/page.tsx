import { MemoryViewerPortal } from "@/components/viewer/MemoryViewerPortal";
import { TimelineView } from "@/components/experience/TimelineView";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { MemoryModalPortal } from "@/components/jar/MemoryModalPortal";

export default function TimelinePage() {
  return (
    <>
      <TimelineView />
      <MemoryViewerPortal />
      <MemoryModalPortal />
      <MobileBottomNav />
    </>
  );
}
