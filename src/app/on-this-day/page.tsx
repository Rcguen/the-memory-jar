import { MemoryViewerPortal } from "@/components/viewer/MemoryViewerPortal";
import { OnThisDayView } from "@/components/experience/OnThisDayView";

export default function OnThisDayPage() {
  return (
    <>
      <OnThisDayView />
      <MemoryViewerPortal />
    </>
  );
}
