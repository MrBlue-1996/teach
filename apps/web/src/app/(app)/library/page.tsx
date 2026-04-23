'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import {
  FolderOpen,
  BookOpen,
  Bookmark,
  Download,
  Clock,
  Search,
  FileText,
  Video,
  Link2,
  Plus,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { learnerApi } from '@/lib/api';

type LibraryTab = 'all' | 'bookmarked' | 'downloads' | 'notes';
type ResourceType = 'course' | 'document' | 'video' | 'link';

interface LibraryItem {
  id: string;
  title: string;
  description: string;
  type: ResourceType;
  category: string;
  bookmarked: boolean;
  downloaded: boolean;
  addedAt: string;
  lastAccessed?: string;
  progress?: number;
  notes?: string;
}

const typeIcons: Record<ResourceType, typeof BookOpen> = {
  course: BookOpen,
  document: FileText,
  video: Video,
  link: Link2,
};

const typeColors: Record<ResourceType, string> = {
  course: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400',
  document: 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400',
  video: 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400',
  link: 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400',
};

const typeCardBg: Record<ResourceType, string> = {
  course: 'bg-blue-50 text-blue-400 dark:bg-blue-950/40 dark:text-blue-600',
  document: 'bg-green-50 text-green-400 dark:bg-green-950/40 dark:text-green-600',
  video: 'bg-purple-50 text-purple-400 dark:bg-purple-950/40 dark:text-purple-600',
  link: 'bg-orange-50 text-orange-400 dark:bg-orange-950/40 dark:text-orange-600',
};

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<LibraryTab>('all');
  const [search, setSearch] = useState('');
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    learnerApi
      .getStates()
      .then(({ states }) => {
        const items: LibraryItem[] = states.map((s) => ({
          id: s.id,
          title: s.contentPack.title,
          description: s.contentPack.certificationTarget
            ? `Certification: ${s.contentPack.certificationTarget}`
            : 'Learning pack',
          type: 'course' as const,
          category: s.contentPack.certificationTarget || 'Course',
          bookmarked: false,
          downloaded: false,
          addedAt: s.lastActivityAt,
          lastAccessed: s.lastActivityAt,
          progress: Math.round(s.overallMastery * 100),
        }));
        setLibraryItems(items);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const filteredItems = libraryItems.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'bookmarked' && item.bookmarked) ||
      (activeTab === 'downloads' && item.downloaded) ||
      (activeTab === 'notes' && item.notes);
    return matchesSearch && matchesTab;
  });

  const tabs = [
    { id: 'all' as const, label: 'All Resources', count: libraryItems.length },
    {
      id: 'bookmarked' as const,
      label: 'Bookmarked',
      count: libraryItems.filter((i) => i.bookmarked).length,
    },
    {
      id: 'downloads' as const,
      label: 'Downloads',
      count: libraryItems.filter((i) => i.downloaded).length,
    },
    {
      id: 'notes' as const,
      label: 'With Notes',
      count: libraryItems.filter((i) => i.notes).length,
    },
  ];

  return (
    <div className="space-y-6 page-transition">
      <PageHeader
        title="My Library"
        description="Your saved courses, documents, and learning resources"
        icon={FolderOpen}
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Resource
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search your library..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Library Items */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No items found"
          description={
            activeTab === 'all'
              ? 'Your library is empty. Save courses and resources here.'
              : 'No items match your current filter.'
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <LibraryCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function LibraryCard({ item }: { item: LibraryItem }) {
  const TypeIcon = typeIcons[item.type];

  return (
    <Card className="card-hover overflow-hidden">
      <CardContent className="p-0">
        <div
          className={cn(
            'flex aspect-video items-center justify-center rounded-none',
            typeCardBg[item.type]
          )}
        >
          <TypeIcon className="h-12 w-12 opacity-30" />
        </div>
        <div className="p-4">
          <div className="mb-2 flex items-start justify-between">
            <span
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                typeColors[item.type]
              )}
            >
              <TypeIcon className="h-3 w-3" />
              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </span>
            <div className="flex gap-1">
              {item.bookmarked && <Bookmark className="h-4 w-4 fill-primary text-primary" />}
              {item.downloaded && <Download className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
          <h3 className="mb-1 font-semibold">{item.title}</h3>
          <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>

          {item.progress !== undefined && (
            <div className="mb-3">
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{item.progress}%</span>
              </div>
              <Progress value={item.progress} className="h-1.5" />
            </div>
          )}

          {item.notes && (
            <div className="mb-3 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground italic">
              "{item.notes}"
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Added {new Date(item.addedAt).toLocaleDateString()}</span>
            {item.lastAccessed && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(item.lastAccessed).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
