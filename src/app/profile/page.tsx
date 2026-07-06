import { MemoryModalPortal } from "@/components/jar/MemoryModalPortal";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { ProfileSettingsPage } from "@/components/profile/ProfileSettingsPage";

export default function ProfilePage() {
  return (
    <>
      <ProfileSettingsPage />
      <MemoryModalPortal />
      <MobileBottomNav />
    </>
  );
}
