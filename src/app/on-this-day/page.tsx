import { MemoryViewerPortal } from "@/components/viewer/MemoryViewerPortal";
import { OnThisDayView } from "@/components/experience/OnThisDayView";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { MemoryModalPortal } from "@/components/jar/MemoryModalPortal";

export default function OnThisDayPage() {
  return (
    <>
      <OnThisDayView />
      <MemoryViewerPortal />
      <MemoryModalPortal />
      <MobileBottomNav />
    </>
  );
}
