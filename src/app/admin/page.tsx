import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isAdminAuthorized } from "@/lib/permissions";
import { AdminPanelExperience } from "@/components/admin/AdminPanelExperience";

export const metadata = {
  title: "Admin Console — The Memory Jar",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check user email & id
  if (isAdminAuthorized({ id: user.id, email: user.email })) {
    return <AdminPanelExperience />;
  }

  // Query profile username for fallback verification
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, email, id")
    .eq("id", user.id)
    .single();

  if (isAdminAuthorized(profile)) {
    return <AdminPanelExperience />;
  }

  // Unauthorized users cannot access this route
  redirect("/");
}
