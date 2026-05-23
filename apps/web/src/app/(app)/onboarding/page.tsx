'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  Loader2,
  Monitor,
  Moon,
  PackageOpen,
  Sun,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ApiError, authApi, type OnboardingTrainingRole, type User } from '@/lib/api';
import { cn } from '@/lib/utils';
import { withResourcePack } from '@/lib/pack-resources';
import { resourcePackOptions, type ResourcePackId } from '@/lib/pack-resources';
import { onboardingTrainingRoles } from '@/lib/onboarding';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from 'next-themes';

const USER_DATA_KEY = 'user_data';
const SKIP_BACKEND_OAUTH_BRIDGE_IN_DEV =
  process.env.NODE_ENV !== 'production' &&
  process.env.NEXT_PUBLIC_SKIP_BACKEND_OAUTH_BRIDGE !== 'false';

const steps = [
  { id: 'identity', label: 'Identity', icon: UserRound },
  { id: 'pack', label: 'Pack', icon: PackageOpen },
  { id: 'role', label: 'Role', icon: Briefcase },
] as const;

function getInitialDisplayName(user: ReturnType<typeof useAuth>['user']): string {
  if (user?.displayName !== undefined && user.displayName.trim().length > 0) {
    return user.displayName;
  }

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  if (fullName.length > 0) {
    return fullName;
  }

  return user?.email.split('@')[0] ?? '';
}

export default function OnboardingPage() {
  const { user, isLoading } = useAuth();
  const setAuthUser = useAuthStore((store) => store.setUser);
  const { theme, setTheme } = useTheme();
  const [stepIndex, setStepIndex] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [contentPackId, setContentPackId] = useState<ResourcePackId>('uncle-julios');
  const [trainingRole, setTrainingRole] = useState<OnboardingTrainingRole>('learner');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [themeReady, setThemeReady] = useState(false);

  const themeOptions = [
    { id: 'light' as const, label: 'Light', icon: Sun },
    { id: 'dark' as const, label: 'Dark', icon: Moon },
    { id: 'system' as const, label: 'System', icon: Monitor },
  ];

  useEffect(() => {
    setThemeReady(true);
  }, []);

  useEffect(() => {
    if (user !== null) {
      setDisplayName(getInitialDisplayName(user));
      setContentPackId('uncle-julios');
      setTrainingRole(user.metadata?.onboarding?.trainingRole ?? 'learner');
    }
  }, [user]);

  const canContinue = useMemo(() => {
    if (stepIndex === 0) {
      return displayName.trim().length > 0;
    }

    return true;
  }, [displayName, stepIndex]);

  // eslint-disable-next-line security/detect-object-injection
  const activeStep = steps[stepIndex];

  const goNext = () => {
    if (!canContinue) {
      setError('Enter your name to continue.');
      return;
    }

    setError('');
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  const goBack = () => {
    setError('');
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  const completeOnboarding = async () => {
    if (!canContinue || displayName.trim().length === 0) {
      setError('Enter your name to continue.');
      setStepIndex(0);
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await authApi.completeOnboarding({
        displayName: displayName.trim(),
        contentPackId,
        trainingRole,
      });

      localStorage.setItem(USER_DATA_KEY, JSON.stringify(response.user));
      setAuthUser(response.user);
      window.location.replace(withResourcePack('/dashboard', contentPackId));
      return;
    } catch (err) {
      const isDevBridgeAuthError =
        SKIP_BACKEND_OAUTH_BRIDGE_IN_DEV &&
        err instanceof ApiError &&
        err.status === 401 &&
        err.code === 'AUTHENTICATION_ERROR';
      const isNetworkError =
        err instanceof ApiError
          ? err.code === 'NETWORK_ERROR'
          : err instanceof TypeError && /fetch/i.test(err.message);

      // Allow local-dev click-through when API is unreachable.
      if ((isNetworkError || isDevBridgeAuthError) && user !== null) {
        const fallbackUser: User = {
          ...user,
          displayName: displayName.trim(),
          metadata: {
            ...(user.metadata ?? {}),
            onboarding: {
              displayName: displayName.trim(),
              contentPackId,
              trainingRole,
              completedAt: new Date().toISOString(),
            },
          },
        };

        localStorage.setItem(USER_DATA_KEY, JSON.stringify(fallbackUser));
        setAuthUser(fallbackUser);
        window.location.replace(withResourcePack('/dashboard', contentPackId));
        return;
      }

      setError(err instanceof Error ? err.message : 'Failed to save onboarding.');
    }

    setSaving(false);
  };

  if (isLoading || user === null || activeStep === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading onboarding...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-3xl items-center py-4">
      <Card className="w-full overflow-hidden">
        <CardHeader className="border-b bg-muted/25">
          <div className="mb-5 flex items-center gap-2">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === stepIndex;
              const isDone = index < stepIndex;

              return (
                <div key={step.id} className="flex flex-1 items-center gap-2">
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-sm transition-colors',
                      isActive && 'border-primary bg-primary text-primary-foreground',
                      isDone && 'border-primary/30 bg-primary/10 text-primary',
                      !isActive && !isDone && 'bg-background text-muted-foreground'
                    )}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                  </div>
                  <span
                    className={cn(
                      'hidden text-sm font-medium sm:inline',
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </span>
                  {index < steps.length - 1 && <div className="h-px flex-1 bg-border" />}
                </div>
              );
            })}
          </div>
          <CardTitle className="text-2xl">Set up your workspace</CardTitle>
          <CardDescription>Tell us where to drop you in after sign-in.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          {stepIndex === 0 && (
            <div className="space-y-3">
              <label htmlFor="displayName" className="text-sm font-medium">
                Your name
              </label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(event) => {
                  setDisplayName(event.target.value);
                  setError('');
                }}
                placeholder="Name"
                autoFocus
              />
            </div>
          )}

          {stepIndex === 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {resourcePackOptions.map((pack) => {
                const PackIcon = pack.icon;
                const isSelected = pack.id === contentPackId;

                return (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => setContentPackId(pack.id)}
                    className={cn(
                      'flex min-h-28 items-start gap-3 rounded-md border p-4 text-left transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'bg-background text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-md border',
                        isSelected ? 'border-primary/30 bg-primary/10 text-primary' : 'bg-muted'
                      )}
                    >
                      <PackIcon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block font-medium">{pack.title}</span>
                      <span className="mt-1 block text-sm">
                        Kitchen tools, line stations, and ingredients
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {stepIndex === 2 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-sm font-medium">Training role</p>
                <p className="text-xs text-muted-foreground">
                  This picks your default learning path. It does not grant admin permissions.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {onboardingTrainingRoles.map((role) => {
                    const isSelected = role.id === trainingRole;

                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setTrainingRole(role.id)}
                        className={cn(
                          'flex h-16 items-center justify-between rounded-md border px-4 text-left transition-colors',
                          isSelected
                            ? 'border-primary bg-primary/5 text-foreground'
                            : 'bg-background text-muted-foreground hover:bg-muted/50'
                        )}
                      >
                        <span className="font-medium">{role.label}</span>
                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Appearance</p>
                <p className="text-xs text-muted-foreground">
                  Choose Light, Dark, or System to follow your device setting.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {themeOptions.map((option) => {
                    const OptionIcon = option.icon;
                    const isSelected = theme === option.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setTheme(option.id)}
                        disabled={!themeReady}
                        className={cn(
                          'flex min-h-11 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                          isSelected
                            ? 'border-primary bg-primary/5 text-foreground'
                            : 'bg-background text-muted-foreground hover:bg-muted/50',
                          !themeReady && 'opacity-70'
                        )}
                      >
                        <OptionIcon className="h-4 w-4" />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {error.length > 0 && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <div className="flex items-center justify-between border-t pt-5">
            <Button
              type="button"
              variant="ghost"
              onClick={goBack}
              disabled={stepIndex === 0 || saving}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            {stepIndex < steps.length - 1 ? (
              <Button type="button" onClick={goNext} disabled={!canContinue || saving}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={completeOnboarding} loading={saving}>
                Finish
                {!saving && <Check className="ml-2 h-4 w-4" />}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
