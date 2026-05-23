'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Mail, Lock, Globe } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getSupabaseBrowserClient } from '@/lib/supabase';

function LoginForm() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    const authError = searchParams.get('error');

    if (authError) {
      setError(authError);
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await login(formData.email, formData.password);
      // useAuth.login handles navigation to /dashboard on success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo = new URL('/auth/callback', window.location.origin);
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo.toString(),
        },
      });

      if (authError) {
        throw authError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google login failed.');
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to continue learning</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Google login */}
        <Button
          variant="outline"
          className="w-full"
          type="button"
          onClick={handleGoogleLogin}
          loading={isLoading}
        >
          <Globe className="mr-2 h-4 w-4" />
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Email"
              className="pl-10"
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              className="pl-10"
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>

          <div className="flex justify-end">
            <Link
              href="/auth/forgot-password"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full" loading={isLoading}>
            Sign In
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>

        <div className="text-center text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="font-medium text-primary hover:underline">
            Sign up free
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
        </Card>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
