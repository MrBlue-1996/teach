'use client';

import { createBrowserClient } from '@supabase/ssr';

type BrowserSupabaseClient = ReturnType<typeof createBrowserClient>;

let browserClient: BrowserSupabaseClient | undefined;

function getSupabaseConfig() {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseAnonKey) {
		throw new Error('Missing Supabase environment variables.');
	}

	return { supabaseUrl, supabaseAnonKey };
}

export function createSupabaseBrowserClient() {
	const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
	return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export function getSupabaseBrowserClient() {
	if (!browserClient) {
		browserClient = createSupabaseBrowserClient();
	}

	return browserClient;
}
