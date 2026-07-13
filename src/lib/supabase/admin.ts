import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

class ServerSupabaseConfigurationError extends Error {
  constructor() {
    super("Server Supabase configuration is unavailable.");
    this.name = "ServerSupabaseConfigurationError";
  }
}

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new ServerSupabaseConfigurationError();
  }

  return createSupabaseClient(supabaseUrl.replace(/\/rest\/v1\/?$/, ""), serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
