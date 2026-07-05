import { MemoryViewerPortal } from "@/components/viewer/MemoryViewerPortal";
import { TimelineView } from "@/components/experience/TimelineView";

export default function TimelinePage() {
  return (
    <>
      <TimelineView />
      <MemoryViewerPortal />
    </>
  );
}
