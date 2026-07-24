import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

// Project defaults (publishable key — safe to expose in the browser; RLS
// protects the data). Env vars override these when set.
const DEFAULT_URL = "https://isosrxrtidbjvmudjgag.supabase.co";
const DEFAULT_ANON_KEY = "sb_publishable_0c-YFczqZgFl8_8yWsTG6A_trxa5jSZ";

/**
 * Returns the Supabase client, or null when no URL/key is available —
 * in that case the app falls back to local-only (localStorage) mode.
 */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;
  client = url && key ? createClient(url, key) : null;
  return client;
}

export function cloudEnabled(): boolean {
  return getSupabase() !== null;
}
