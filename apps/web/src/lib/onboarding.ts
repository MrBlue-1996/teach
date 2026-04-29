import type { OnboardingTrainingRole, User, UserOnboardingMetadata } from '@/lib/api';
import { getResourcePackId, type ResourcePackId } from '@/lib/pack-resources';

export const onboardingTrainingRoles: Array<{
  id: OnboardingTrainingRole;
  label: string;
  shortLabel: string;
}> = [
  { id: 'learner', label: 'Learner', shortLabel: 'Learner' },
  { id: 'staff', label: 'Staff Member', shortLabel: 'Staff' },
  { id: 'manager', label: 'Manager', shortLabel: 'Manager' },
  { id: 'instructor', label: 'Instructor', shortLabel: 'Instructor' },
];

export function getUserOnboarding(user: User | null | undefined): UserOnboardingMetadata | null {
  return user?.metadata?.onboarding ?? null;
}

export function hasCompletedOnboarding(user: User | null | undefined): boolean {
  const onboarding = getUserOnboarding(user);

  return (
    onboarding?.completedAt !== undefined &&
    onboarding.displayName.trim().length > 0 &&
    onboarding.contentPackId !== undefined &&
    onboarding.trainingRole !== undefined
  );
}

export function getUserDefaultPackId(user: User | null | undefined): ResourcePackId {
  const onboardingPackId = getUserOnboarding(user)?.contentPackId;
  return getResourcePackId(onboardingPackId ?? null);
}
