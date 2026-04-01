'use client';

import { User, Bell, Shield, Palette, Clock, Save, Moon, Sun, Monitor } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type TabType = 'profile' | 'notifications' | 'appearance' | 'learning' | 'security';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Profile state
  const [profile, setProfile] = useState({
    firstName: 'Alex',
    lastName: 'Johnson',
    email: 'alex@example.com',
    timezone: 'America/New_York',
  });

  // Notifications state
  const [notifications, setNotifications] = useState({
    emailProgress: true,
    emailBadges: true,
    emailReminders: false,
    pushEnabled: true,
  });

  // Appearance state
  const [appearance, setAppearance] = useState({
    theme: 'system' as 'light' | 'dark' | 'system',
  });

  // Learning preferences state
  const [learning, setLearning] = useState({
    dailyGoal: 30,
    weeklyGoal: 150,
    reminderTime: '09:00',
    autoPlayNext: true,
  });

  const handleSave = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
    { id: 'learning' as const, label: 'Learning', icon: Clock },
    { id: 'security' as const, label: 'Security', icon: Shield },
  ];

  return (
    <div className="space-y-6 page-transition">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar Navigation */}
        <div className="w-full lg:w-64">
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
        <div className="flex-1">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
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
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
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
              </CardContent>
            </Card>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose how you want to be notified</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <NotificationToggle
                    label="Progress updates"
                    description="Weekly summary of your learning progress"
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
                  <NotificationToggle
                    label="Push notifications"
                    description="Enable browser push notifications"
                    checked={notifications.pushEnabled}
                    onChange={(checked) =>
                      setNotifications({ ...notifications, pushEnabled: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize how the app looks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Theme</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'light' as const, label: 'Light', icon: Sun },
                      { id: 'dark' as const, label: 'Dark', icon: Moon },
                      { id: 'system' as const, label: 'System', icon: Monitor },
                    ].map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => setAppearance({ ...appearance, theme: theme.id })}
                        className={cn(
                          'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors',
                          appearance.theme === theme.id
                            ? 'border-primary bg-primary/5'
                            : 'border-transparent bg-muted hover:bg-muted/80'
                        )}
                      >
                        <theme.icon className="h-6 w-6" />
                        <span className="text-sm font-medium">{theme.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Learning Tab */}
          {activeTab === 'learning' && (
            <Card>
              <CardHeader>
                <CardTitle>Learning Preferences</CardTitle>
                <CardDescription>Customize your learning experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Daily goal (minutes)</label>
                  <Input
                    type="number"
                    min="5"
                    max="120"
                    value={learning.dailyGoal}
                    onChange={(e) =>
                      setLearning({
                        ...learning,
                        dailyGoal: parseInt(e.target.value) || 30,
                      })
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
                      setLearning({
                        ...learning,
                        weeklyGoal: parseInt(e.target.value) || 150,
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
                <NotificationToggle
                  label="Auto-play next lesson"
                  description="Automatically advance to the next lesson when complete"
                  checked={learning.autoPlayNext}
                  onChange={(checked) => setLearning({ ...learning, autoPlayNext: checked })}
                />
              </CardContent>
            </Card>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>Manage your account security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Current Password</label>
                  <Input type="password" placeholder="Enter current password" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Password</label>
                  <Input type="password" placeholder="Enter new password" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirm New Password</label>
                  <Input type="password" placeholder="Confirm new password" />
                </div>
                <div className="pt-4 border-t">
                  <h4 className="mb-2 font-medium text-destructive">Danger Zone</h4>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Once you delete your account, there is no going back.
                  </p>
                  <Button variant="destructive" size="sm">
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Save Button */}
          <div className="mt-6 flex items-center justify-between">
            <div>
              {saved && <p className="text-sm text-success">Settings saved successfully!</p>}
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
