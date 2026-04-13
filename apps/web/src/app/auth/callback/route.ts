import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next');
  const redirectPath = next?.startsWith('/') ? next : '/dashboard';
  let errorMessage =
    requestUrl.searchParams.get('error_description') ?? 'Unable to sign in with Google.';

  if (code) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
    }

    errorMessage = error.message;
  }

  const loginUrl = new URL('/auth/login', requestUrl.origin);
  loginUrl.searchParams.set('error', errorMessage);
  return NextResponse.redirect(loginUrl);
}
