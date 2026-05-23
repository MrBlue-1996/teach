'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import {
  User,
  Bell,
  Shield,
  Palette,
  Clock,
  Save,
  Moon,
  Sun,
  Monitor,
  Settings,
  Globe,
  Database,
  Key,
  Smartphone,
  Mail,
  CreditCard,
  Upload,
  Camera,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { authApi, learnerApi } from '@/lib/api';
import { useTheme } from 'next-themes';

type TabType =
  | 'profile'
  | 'notifications'
  | 'appearance'
  | 'learning'
  | 'security'
  | 'integrations'
  | 'billing';

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [themeReady, setThemeReady] = useState(false);

  // Password change form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved] = useState(false);

  // Profile state — initialised from real auth user
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    bio: '',
    organization: '',
    role: '',
  });

  // Sync profile from auth user once loaded
  useEffect(() => {
    if (user) {
      setProfile((prev) => ({
        ...prev,
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        email: user.email,
      }));
    }
  }, [user]);

  // Notifications state
  const [notifications, setNotifications] = useState({
    emailProgress: true,
    emailBadges: true,
    emailReminders: false,
    emailDigest: true,
    pushEnabled: true,
    pushSessions: false,
    slackIntegration: false,
  });

  const [appearance, setAppearance] = useState({
    theme: 'system' as 'light' | 'dark' | 'system',
    compactMode: false,
    showAnimations: true,
    fontSize: 'medium' as 'small' | 'medium' | 'large',
    sidebarCollapsed: false,
  });

  const [learning, setLearning] = useState({
    dailyGoal: 30,
    weeklyGoal: 150,
    reminderTime: '09:00',
    autoPlayNext: true,
    showHints: true,
    difficultyPreference: 'adaptive' as 'easy' | 'adaptive' | 'challenging',
    sessionLength: 15,
    soundEffects: true,
  });

  // Load weekly goal from backend
  useEffect(() => {
    learnerApi
      .getWeeklyGoal()
      .then((res) => {
        setLearning((prev) => ({ ...prev, weeklyGoal: res.targetMinutes }));
      })
      .catch(() => {
        // Keep defaults
      });
  }, []);

  useEffect(() => {
    setThemeReady(true);
  }, []);

  useEffect(() => {
    if (theme === 'light' || theme === 'dark' || theme === 'system') {
      setAppearance((prev) => ({ ...prev, theme }));
    }
  }, [theme]);

  const handleSave = async () => {
    setIsLoading(true);
    setSaveError(null);
    try {
      if (activeTab === 'profile') {
        await authApi.updateProfile({
          ...(profile.firstName ? { firstName: profile.firstName } : {}),
          ...(profile.lastName ? { lastName: profile.lastName } : {}),
          ...(profile.timezone ? { timezone: profile.timezone } : {}),
        });
      }
      if (activeTab === 'learning') {
        await learnerApi.updateWeeklyGoal(learning.weeklyGoal);
      }
      // Notifications / appearance preferences are stored locally for now
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = () => {
    setPasswordError(null);
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordError('All password fields are required.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    setPasswordLoading(true);
    try {
      // POST /auth/change-password is not yet implemented on the backend.
      // See .github/state/blockers.md — api-engineer blocker #change-password.
      throw new Error('Password change is not available yet. Please use forgot password instead.');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
    { id: 'learning' as const, label: 'Learning', icon: Clock },
    { id: 'security' as const, label: 'Security', icon: Shield },
    { id: 'integrations' as const, label: 'Integrations', icon: Globe },
    { id: 'billing' as const, label: 'Billing', icon: CreditCard },
  ];

  return (
    <div className="space-y-6 page-transition">
      <PageHeader
        title="Settings"
        description="Manage your account and preferences"
        icon={Settings}
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar Navigation */}
        <div className="w-full lg:w-56">
          <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <>
              {/* Avatar Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile Photo</CardTitle>
                  <CardDescription>Update your profile image</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground">
                        {profile.firstName[0]}
                        {profile.lastName[0]}
                      </div>
                      <button
                        type="button"
                        aria-label="Change profile photo"
                        className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border bg-card shadow-sm hover:bg-muted"
                      >
                        <Camera className="h-4 w-4" />
                      </button>
                    </div>
                    <div>
                      <Button variant="outline" size="sm">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Photo
                      </Button>
                      <p className="mt-2 text-xs text-muted-foreground">
                        JPG, PNG or GIF. Max 2MB.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Update your personal details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">First Name</label>
                      <Input
                        value={profile.firstName}
                        onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Last Name</label>
                      <Input
                        value={profile.lastName}
                        onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email</label>
                      <Input
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Phone</label>
                      <Input
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Bio</label>
                    <textarea
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      placeholder="Tell us about yourself..."
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Organization</label>
                      <Input
                        value={profile.organization}
                        onChange={(e) => setProfile({ ...profile, organization: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Timezone</label>
                      <select
                        value={profile.timezone}
                        onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Notifications
                  </CardTitle>
                  <CardDescription>Choose which emails you receive</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <NotificationToggle
                    label="Weekly progress digest"
                    description="Summary of your learning progress each week"
                    checked={notifications.emailDigest}
                    onChange={(checked) =>
                      setNotifications({ ...notifications, emailDigest: checked })
                    }
                  />
                  <NotificationToggle
                    label="Progress updates"
                    description="Notified when you reach new milestones"
                    checked={notifications.emailProgress}
                    onChange={(checked) =>
                      setNotifications({ ...notifications, emailProgress: checked })
                    }
                  />
                  <NotificationToggle
                    label="Badge notifications"
                    description="Get notified when you earn a new badge"
                    checked={notifications.emailBadges}
                    onChange={(checked) =>
                      setNotifications({ ...notifications, emailBadges: checked })
                    }
                  />
                  <NotificationToggle
                    label="Learning reminders"
                    description="Daily reminders to keep your streak going"
                    checked={notifications.emailReminders}
                    onChange={(checked) =>
                      setNotifications({ ...notifications, emailReminders: checked })
                    }
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Push Notifications
                  </CardTitle>
                  <CardDescription>Browser and mobile push settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <NotificationToggle
                    label="Push notifications"
                    description="Enable browser push notifications"
                    checked={notifications.pushEnabled}
                    onChange={(checked) =>
                      setNotifications({ ...notifications, pushEnabled: checked })
                    }
                  />
                  <NotificationToggle
                    label="Session reminders"
                    description="Remind me to start a learning session"
                    checked={notifications.pushSessions}
                    onChange={(checked) =>
                      setNotifications({ ...notifications, pushSessions: checked })
                    }
                  />
                </CardContent>
              </Card>
            </>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Theme</CardTitle>
                  <CardDescription>Select your preferred color scheme</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'light' as const, label: 'Light', icon: Sun },
                      { id: 'dark' as const, label: 'Dark', icon: Moon },
                      { id: 'system' as const, label: 'System', icon: Monitor },
                    ].map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => {
                          setAppearance({ ...appearance, theme: theme.id });
                          setTheme(theme.id);
                        }}
                        disabled={!themeReady}
                        className={cn(
                          'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors',
                          appearance.theme === theme.id
                            ? 'border-primary bg-primary/5'
                            : 'border-transparent bg-muted hover:bg-muted/80',
                          !themeReady && 'opacity-70'
                        )}
                      >
                        <theme.icon className="h-6 w-6" />
                        <span className="text-sm font-medium">{theme.label}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Display</CardTitle>
                  <CardDescription>Customize the interface</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Font Size</label>
                    <div className="flex gap-2">
                      {(['small', 'medium', 'large'] as const).map((size) => (
                        <button
                          key={size}
                          onClick={() => setAppearance({ ...appearance, fontSize: size })}
                          className={cn(
                            'rounded-md border px-4 py-2 text-sm font-medium transition-colors',
                            appearance.fontSize === size
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'text-muted-foreground hover:bg-muted'
                          )}
                        >
                          {size.charAt(0).toUpperCase() + size.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <NotificationToggle
                    label="Compact mode"
                    description="Use a more compact layout with less spacing"
                    checked={appearance.compactMode}
                    onChange={(checked) => setAppearance({ ...appearance, compactMode: checked })}
                  />
                  <NotificationToggle
                    label="Show animations"
                    description="Enable smooth transitions and animations"
                    checked={appearance.showAnimations}
                    onChange={(checked) =>
                      setAppearance({ ...appearance, showAnimations: checked })
                    }
                  />
                  <NotificationToggle
                    label="Collapse sidebar"
                    description="Start with sidebar collapsed by default"
                    checked={appearance.sidebarCollapsed}
                    onChange={(checked) =>
                      setAppearance({ ...appearance, sidebarCollapsed: checked })
                    }
                  />
                </CardContent>
              </Card>
            </>
          )}

          {/* Learning Tab */}
          {activeTab === 'learning' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Goals & Targets</CardTitle>
                  <CardDescription>Set your daily and weekly learning goals</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Daily goal (minutes)</label>
                      <Input
                        type="number"
                        min="5"
                        max="120"
                        value={learning.dailyGoal}
                        onChange={(e) =>
                          setLearning({ ...learning, dailyGoal: parseInt(e.target.value) || 30 })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Weekly goal (minutes)</label>
                      <Input
                        type="number"
                        min="30"
                        max="600"
                        value={learning.weeklyGoal}
                        onChange={(e) =>
                          setLearning({ ...learning, weeklyGoal: parseInt(e.target.value) || 150 })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Preferred session length (minutes)
                      </label>
                      <Input
                        type="number"
                        min="5"
                        max="60"
                        value={learning.sessionLength}
                        onChange={(e) =>
                          setLearning({
                            ...learning,
                            sessionLength: parseInt(e.target.value) || 15,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Reminder time</label>
                      <Input
                        type="time"
                        value={learning.reminderTime}
                        onChange={(e) => setLearning({ ...learning, reminderTime: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Preferences</CardTitle>
                  <CardDescription>Customize how you learn</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Difficulty preference</label>
                    <div className="flex gap-2">
                      {[
                        { id: 'easy' as const, label: 'Easier', desc: 'More hints & explanations' },
                        { id: 'adaptive' as const, label: 'Adaptive', desc: 'AI adjusts to you' },
                        {
                          id: 'challenging' as const,
                          label: 'Challenge',
                          desc: 'Fewer hints, harder questions',
                        },
                      ].map((diff) => (
                        <button
                          key={diff.id}
                          onClick={() =>
                            setLearning({ ...learning, difficultyPreference: diff.id })
                          }
                          className={cn(
                            'flex-1 rounded-lg border-2 p-3 text-left transition-colors',
                            learning.difficultyPreference === diff.id
                              ? 'border-primary bg-primary/5'
                              : 'border-transparent bg-muted hover:bg-muted/80'
                          )}
                        >
                          <p className="text-sm font-medium">{diff.label}</p>
                          <p className="text-xs text-muted-foreground">{diff.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <NotificationToggle
                    label="Auto-play next lesson"
                    description="Automatically advance when complete"
                    checked={learning.autoPlayNext}
                    onChange={(checked) => setLearning({ ...learning, autoPlayNext: checked })}
                  />
                  <NotificationToggle
                    label="Show hints"
                    description="Allow progressive hint system"
                    checked={learning.showHints}
                    onChange={(checked) => setLearning({ ...learning, showHints: checked })}
                  />
                  <NotificationToggle
                    label="Sound effects"
                    description="Play sounds on correct/incorrect answers"
                    checked={learning.soundEffects}
                    onChange={(checked) => setLearning({ ...learning, soundEffects: checked })}
                  />
                </CardContent>
              </Card>
            </>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Change Password
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Current Password</label>
                    <Input
                      type="password"
                      placeholder="Enter current password"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">New Password</label>
                    <Input
                      type="password"
                      placeholder="Enter new password"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Confirm New Password</label>
                    <Input
                      type="password"
                      placeholder="Confirm new password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                      }
                    />
                  </div>
                  {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
                  {passwordSaved && <p className="text-sm text-green-600">Password updated.</p>}
                  <Button
                    variant="outline"
                    onClick={() => void handlePasswordChange()}
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Two-Factor Authentication</CardTitle>
                  <CardDescription>Add an extra layer of security to your account</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">Authenticator App</p>
                      <p className="text-sm text-muted-foreground">
                        Use an authenticator app to generate codes
                      </p>
                    </div>
                    <Button variant="outline">Setup</Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Active Sessions</CardTitle>
                  <CardDescription>Manage your logged-in devices</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      {
                        device: 'Chrome on macOS',
                        location: 'New York, US',
                        current: true,
                        lastActive: 'Now',
                      },
                      {
                        device: 'Safari on iPhone',
                        location: 'New York, US',
                        current: false,
                        lastActive: '2 hours ago',
                      },
                    ].map((session, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <Smartphone className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">
                              {session.device}
                              {session.current && (
                                <span className="ml-2 text-xs text-primary">(This device)</span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {session.location} - {session.lastActive}
                            </p>
                          </div>
                        </div>
                        {!session.current && (
                          <Button variant="ghost" size="sm" className="text-destructive">
                            Revoke
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-destructive/30 p-4">
                    <div>
                      <p className="font-medium">Export Data</p>
                      <p className="text-sm text-muted-foreground">
                        Download all your learning data
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Database className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-destructive/30 p-4">
                    <div>
                      <p className="font-medium text-destructive">Delete Account</p>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete your account and all data
                      </p>
                    </div>
                    <Button variant="destructive" size="sm">
                      Delete Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <Card>
              <CardHeader>
                <CardTitle>Connected Services</CardTitle>
                <CardDescription>Manage external service connections</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    name: 'Google',
                    description: 'Sign in with Google and sync calendar',
                    connected: false,
                    icon: '🔗',
                  },
                  {
                    name: 'Microsoft',
                    description: 'Connect your Microsoft account',
                    connected: false,
                    icon: '🔗',
                  },
                  {
                    name: 'Slack',
                    description: 'Get notifications in Slack channels',
                    connected: false,
                    icon: '💬',
                  },
                  {
                    name: 'GitHub',
                    description: 'Link your GitHub for coding exercises',
                    connected: false,
                    icon: '🐙',
                  },
                  {
                    name: 'LMS Export',
                    description: 'Export progress to your institution LMS',
                    connected: false,
                    icon: '📊',
                  },
                ].map((service) => (
                  <div
                    key={service.name}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{service.icon}</span>
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-muted-foreground">{service.description}</p>
                      </div>
                    </div>
                    <Button variant={service.connected ? 'outline' : 'default'} size="sm">
                      {service.connected ? 'Disconnect' : 'Connect'}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Current Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between rounded-lg border bg-primary/5 p-4">
                    <div>
                      <p className="text-lg font-bold">Free Plan</p>
                      <p className="text-sm text-muted-foreground">
                        1 content pack, basic progress tracking
                      </p>
                    </div>
                    <Button>Upgrade to Pro</Button>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border p-4">
                      <p className="text-2xl font-bold">$0</p>
                      <p className="text-sm text-muted-foreground">Current monthly cost</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-2xl font-bold">1 / 1</p>
                      <p className="text-sm text-muted-foreground">Content packs used</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <CreditCard className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No payment method on file</p>
                    <Button variant="outline" className="mt-4" size="sm">
                      Add Payment Method
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Billing History</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">No billing history available.</p>
                </CardContent>
              </Card>
            </>
          )}

          {/* Save Button */}
          <div className="flex items-center justify-between">
            <div>
              {saved && <p className="text-sm text-success">Settings saved successfully!</p>}
              {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            </div>
            <Button onClick={handleSave} loading={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-muted'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  );
}
