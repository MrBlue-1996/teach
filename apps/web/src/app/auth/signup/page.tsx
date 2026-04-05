'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Mail, Lock, User, Chrome } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

function SignupForm() {
  const { signup } = useAuth();
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan');

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) { newErrors.name = 'Name is required'; }
    if (!formData.email.trim()) { newErrors.email = 'Email is required'; }
    else if (!/\S+@\S+\.\S+/.test(formData.email)) { newErrors.email = 'Invalid email'; }
    if (!formData.password) { newErrors.password = 'Password is required'; }
    else if (formData.password.length < 8) { newErrors.password = 'Min 8 characters'; }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) { return; }

    setIsLoading(true);
    try {
      // Split name into firstName/lastName for the backend
      const nameParts = formData.name.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;

      await signup(formData.email, formData.password, firstName, lastName);
      // useAuth.signup handles navigation to /dashboard on success
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signup failed. Please try again.';
      setErrors({ form: message });
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    // TODO: Google OAuth not implemented on backend
    setErrors({ form: 'Google signup is not yet available' });
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>
          {plan === 'pro' ? 'Start your 14-day free trial' : 'Start learning for free'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Google signup - fastest path */}
        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignup}
          disabled={isLoading}
        >
          <Chrome className="mr-2 h-4 w-4" />
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

        {/* Email signup form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {errors.form && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {errors.form}
            </div>
          )}

          <div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="name"
                placeholder="Full name"
                className="pl-10"
                value={formData.name}
                onChange={handleChange}
                error={!!errors.name}
                disabled={isLoading}
              />
            </div>
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
          </div>

          <div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="email"
                type="email"
                placeholder="Email"
                className="pl-10"
                value={formData.email}
                onChange={handleChange}
                error={!!errors.email}
                disabled={isLoading}
              />
            </div>
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
          </div>

          <div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="password"
                type="password"
                placeholder="Password (8+ characters)"
                className="pl-10"
                value={formData.password}
                onChange={handleChange}
                error={!!errors.password}
                disabled={isLoading}
              />
            </div>
            {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password}</p>}
          </div>

          <Button type="submit" className="w-full" loading={isLoading}>
            Create Account
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          By signing up, you agree to our{' '}
          <Link href="/terms" className="text-primary hover:underline">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>

        <div className="text-center text-sm">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
        </Card>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
