"use server";

import { createClient } from "@/lib/supabase/server";
import { lookupEmailByUsername } from "@/services/auth";
import { redirect } from "next/navigation";
import { z } from "zod";

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

  // 1. Lookup username
  const email = await lookupEmailByUsername(username);

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
  redirect("/");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
