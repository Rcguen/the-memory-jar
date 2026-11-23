"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

// Rate limiting store (in-memory)
type RateLimitRecord = {
  count: number;
  resetAt: number;
};

const loginAttempts = new Map<string, RateLimitRecord>();
const resetAttempts = new Map<string, RateLimitRecord>();

function checkRateLimit(
  store: Map<string, RateLimitRecord>,
  key: string,
  maxAttempts: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const record = store.get(key);

  if (store.size > 1000) {
    for (const [k, v] of store.entries()) {
      if (now > v.resetAt) {
        store.delete(k);
      }
    }
  }

  if (!record || now > record.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (record.count >= maxAttempts) {
    const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  record.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

function clearRateLimit(store: Map<string, RateLimitRecord>, key: string) {
  store.delete(key);
}

async function getClientIdentifier(fallbackName: string): Promise<string> {
  try {
    const headerList = await headers();
    const forwardedFor = headerList.get("x-forwarded-for");
    const realIp = headerList.get("x-real-ip");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : realIp || "unknown";
    return `${ip}:${fallbackName.toLowerCase().trim()}`;
  } catch {
    return `unknown:${fallbackName.toLowerCase().trim()}`;
  }
}

class ServerAuthConfigurationError extends Error {
  constructor() {
    super("Server authentication configuration is unavailable.");
    this.name = "ServerAuthConfigurationError";
  }
}

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new ServerAuthConfigurationError();
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function lookupEmailOnServer(username: string): Promise<string | null> {
  const supabaseAdmin = createAdminClient();
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .eq("username", username)
    .maybeSingle();
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
  const clientId = await getClientIdentifier(username);

  // 5 failed attempts per 15 minutes
  const limit = checkRateLimit(loginAttempts, clientId, 5, 15 * 60 * 1000);
  if (!limit.allowed) {
    return {
      error: `Too many login attempts. Please wait ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s) before trying again.`,
    };
  }

  try {
    // 1. Lookup username on the server using service role
    const email = await lookupEmailOnServer(username);

    if (!email) {
      return { error: "The jar doesn't recognize that name or key." };
    }

    // 2. Authenticate using Supabase Auth
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: "The jar doesn't recognize that name or key." };
    }

    // Clear rate limit on successful authentication
    clearRateLimit(loginAttempts, clientId);
  } catch (error) {
    if (error instanceof ServerAuthConfigurationError) {
      console.error("[auth] Missing server authentication configuration.");
      return { error: "The jar cannot be opened right now. Please try again shortly." };
    }
    console.error("[auth] Login action failed.");
    return { error: "The jar doesn't recognize that name or key." };
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
  const username = formData.get("username")?.toString()?.trim();
  if (!username) return { error: "Please enter your name." };

  const clientId = await getClientIdentifier(username);
  // Rate limit: 3 requests per 10 minutes
  const limit = checkRateLimit(resetAttempts, clientId, 3, 10 * 60 * 1000);
  if (!limit.allowed) {
    return {
      error: `Too many requests. Please wait ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s) before trying again.`,
    };
  }

  try {
    const email = await lookupEmailOnServer(username);
    if (!email) {
      // Prevent username enumeration: do not reveal whether username exists
      await new Promise((resolve) => setTimeout(resolve, 300));
      return { success: true };
    }

    const supabase = await createClient();
    // Using localhost or window.location.origin in production
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/update-password`,
    });

    if (error) {
      console.error("[auth] resetPasswordForEmail error:", error.message);
      return { error: "Could not send the reset link. Please try again." };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof ServerAuthConfigurationError) {
      console.error("[auth] Missing server authentication configuration.");
      // Do not reveal configuration state to the user in a way that differs from generic errors if possible, 
      // but returning a generic error is safer here.
      return { error: "Could not send the reset link. Please try again." };
    }
    console.error("[auth] Reset password request failed.");
    return { error: "Could not send the reset link. Please try again." };
  }
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
    console.error("[auth] Update password failed:", updateError.message);
    return { error: "Failed to update password. It may be too weak or the link has expired." };
  }

  redirect("/");
}
