import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Server-only Supabase client utilizing the service role key.
 * 
 * CRITICAL SECURITY NOTICE:
 * This client bypasses Row Level Security (RLS) policies.
 * NEVER import or invoke this module within Client Components or expose its credentials to the browser.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error(
      "SECURITY VIOLATION: createAdminClient cannot and must not be called in a browser environment."
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in server environment."
    );
  }

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
