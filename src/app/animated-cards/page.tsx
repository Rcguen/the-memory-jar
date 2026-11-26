import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isLettersAuthorized } from "@/lib/permissions";
import { AnimatedLettersExperience } from "@/components/letters/AnimatedLettersExperience";

export default async function AnimatedCardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check user email & id
  if (isLettersAuthorized({ id: user.id, email: user.email })) {
    return <AnimatedLettersExperience />;
  }

  // Query profile username for fallback verification
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, email, id")
    .eq("id", user.id)
    .single();

  if (isLettersAuthorized(profile)) {
    return <AnimatedLettersExperience />;
  }

  // Unauthorized users cannot access this route
  redirect("/");
}
