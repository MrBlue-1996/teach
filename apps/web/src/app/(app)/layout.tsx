'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import {
  getResourcePack,
  getResourcePackId,
  resourcePackOptions,
  withResourcePack,
  type ResourcePackId,
} from '@/lib/pack-resources';
import {
  Zap,
  LayoutDashboard,
  Award,
  Settings,
  Menu,
  X,
  LogOut,
  User,
  ChevronDown,
  ChevronLeft,
  Wrench,
  Cog,
  FlaskConical,
  GraduationCap,
  BarChart3,
  Users,
  FolderOpen,
  Bell,
  HelpCircle,
  Loader2,
} from 'lucide-react';

interface NavSection {
  title: string;
  items: NavItem[];
}

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: string;
}

const staticNavSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Learning',
    items: [
      { name: 'Courses', href: '/content', icon: GraduationCap },
      { name: 'Achievements', href: '/achievements', icon: Award },
      { name: 'My Library', href: '/library', icon: FolderOpen },
    ],
  },
  {
    title: 'Manage',
    items: [
      { name: 'Instructor Panel', href: '/instructor', icon: Users },
      { name: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user: authUser, logout, isAuthenticated, isLoading } = useAuth();
  const selectedPackId = getResourcePackId(searchParams.get('pack'));
  const selectedPack = getResourcePack(searchParams.get('pack'));

  const setSelectedPack = (packId: ResourcePackId) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('pack', packId);
    router.replace(`${pathname}?${nextParams.toString()}`);
  };

  const resourceSection: NavSection = {
    title: selectedPack.sidebarTitle,
    items: [
      {
        name: selectedPack.nav.tools,
        href: withResourcePack('/tools', selectedPackId),
        icon: Wrench,
      },
      {
        name: selectedPack.nav.machines,
        href: withResourcePack('/machines', selectedPackId),
        icon: Cog,
      },
      {
        name: selectedPack.nav.ingredients,
        href: withResourcePack('/ingredients', selectedPackId),
        icon: FlaskConical,
      },
    ],
  };

  const navSections = [
    ...staticNavSections.slice(0, 2),
    resourceSection,
    ...staticNavSections.slice(2),
  ];

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Restoring your learning session...
        </div>
      </div>
    );
  }

  const user = {
    name:
      authUser?.firstName && authUser?.lastName
        ? `${authUser.firstName} ${authUser.lastName}`
        : (authUser?.email ?? 'User'),
    email: authUser?.email ?? '',
    initials:
      authUser?.firstName && authUser?.lastName
        ? `${authUser.firstName[0]}${authUser.lastName[0]}`.toUpperCase()
        : (authUser?.email?.[0] ?? 'U').toUpperCase(),
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          {/* Left: Logo + Mobile Toggle */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">
                Top<span className="text-primary">Shelf</span>
              </span>
            </Link>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Help">
              <HelpCircle className="h-5 w-5" />
            </Button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-full p-1 hover:bg-muted"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                  {user.initials}
                </div>
                <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-md border bg-card p-1 shadow-lg">
                    <div className="border-b px-3 py-2">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                    <div className="border-t">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          logout();
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-muted"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Overlay (Mobile) */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            'fixed left-0 top-14 z-40 h-[calc(100vh-3.5rem)] border-r bg-card transition-all duration-300',
            'lg:sticky lg:z-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
            sidebarCollapsed ? 'w-16' : 'w-64'
          )}
        >
          <div className="flex h-full flex-col">
            {/* Nav Sections */}
            <nav className="flex-1 overflow-y-auto p-3">
              {!sidebarCollapsed && (
                <div className="mb-4 rounded-md border bg-muted/30 p-2">
                  <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Active Pack
                  </p>
                  <div className="grid gap-1">
                    {resourcePackOptions.map((pack) => {
                      const PackIcon = pack.icon;
                      const isSelected = pack.id === selectedPackId;
                      return (
                        <button
                          key={pack.id}
                          type="button"
                          onClick={() => setSelectedPack(pack.id)}
                          className={cn(
                            'flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                            isSelected
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
                          )}
                        >
                          <PackIcon className="h-4 w-4" />
                          <span>{pack.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {navSections.map((section) => (
                <div key={section.title} className="mb-4">
                  {!sidebarCollapsed && (
                    <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {section.title}
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const isActive =
                        pathname === item.href || pathname.startsWith(item.href + '/');
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          title={sidebarCollapsed ? item.name : undefined}
                          className={cn(
                            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-primary/10 text-primary'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                            sidebarCollapsed && 'justify-center px-2'
                          )}
                        >
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          {!sidebarCollapsed && (
                            <>
                              <span className="flex-1">{item.name}</span>
                              {item.badge && (
                                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                  {item.badge}
                                </span>
                              )}
                            </>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {/* Collapse Toggle (Desktop only) */}
            <div className="hidden border-t p-3 lg:block">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft
                  className={cn('h-4 w-4 transition-transform', sidebarCollapsed && 'rotate-180')}
                />
                {!sidebarCollapsed && <span>Collapse</span>}
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main id="main-content" className="flex-1 transition-all duration-300">
          <div className="container max-w-7xl py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
