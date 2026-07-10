"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function lookupEmailOnServer(username: string): Promise<string | null> {
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .eq("username", username)
    .single();
  return data?.email || null;
}


const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginState = {
  error?: string;
  success?: boolean;
};

export async function loginAction(
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parseResult = loginSchema.safeParse(Object.fromEntries(formData));

  if (!parseResult.success) {
    return { error: "Please enter both username and password." };
  }

  const { username, password } = parseResult.data;

  // 1. Lookup username on the server using service role
  const email = await lookupEmailOnServer(username);

  if (!email) {
    return { error: "The jar doesn't recognize this name." };
  }

  // 2. Authenticate using Supabase Auth
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.includes("Invalid login credentials")) {
      return { error: "The key doesn't fit." };
    }
    return { error: "The memories are sleeping. Please try again." };
  }

  // Login successful, Next.js requires redirect to be called outside try/catch 
  // or before returning standard values.
  revalidatePath("/", "layout");
  redirect("/");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export type ActionState = {
  error?: string;
  success?: boolean;
};

export async function resetPasswordRequestAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const username = formData.get("username")?.toString();
  if (!username) return { error: "Please enter your name." };

  const email = await lookupEmailOnServer(username);
  if (!email) return { error: "The jar doesn't recognize this name." };

  const supabase = await createClient();
  // Using localhost or window.location.origin in production
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/update-password`,
  });

  if (error) {
    return { error: "Could not send the reset link. Please try again." };
  }

  return { success: true };
}

export async function signOutAllAction(): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: 'others' });
  if (error) return { error: "Failed to sign out other devices." };
  return { success: true };
}

export async function changePasswordAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const currentPassword = formData.get("currentPassword")?.toString();
  const newPassword = formData.get("newPassword")?.toString();

  if (!currentPassword || !newPassword) {
    return { error: "Please fill in all fields." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { error: "Not authenticated." };
  }

  // Verify current password
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) {
    return { error: "Current password is incorrect." };
  }

  // Update to new password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return { error: "Failed to update password. It may be too weak." };
  }

  return { success: true };
}

export async function updatePasswordAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const newPassword = formData.get("newPassword")?.toString();

  if (!newPassword) {
    return { error: "Please enter a new password." };
  }

  const supabase = await createClient();
  
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return { error: updateError.message || "Failed to update password." };
  }

  redirect("/");
}
