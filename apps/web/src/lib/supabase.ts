'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

type SupabaseSchema = {
  Tables: Record<string, never>;
  Views: Record<string, never>;
  Functions: Record<string, never>;
  Enums: Record<string, never>;
  CompositeTypes: Record<string, never>;
};

type SupabaseDatabase = {
  public: SupabaseSchema;
};

type BrowserSupabaseClient = SupabaseClient<SupabaseDatabase>;

let browserClient: BrowserSupabaseClient | undefined;

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables.');
  }

  return { supabaseUrl, supabaseAnonKey };
}

export function createSupabaseBrowserClient(): BrowserSupabaseClient {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  return createBrowserClient<SupabaseDatabase>(supabaseUrl, supabaseAnonKey);
}

export function getSupabaseBrowserClient(): BrowserSupabaseClient {
  if (!browserClient) {
    browserClient = createSupabaseBrowserClient();
  }

  return browserClient;
}
