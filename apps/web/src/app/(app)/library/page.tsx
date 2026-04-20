'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/ui/page-header';
import { ImagePlaceholder } from '@/components/ui/image-placeholder';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

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

const mockLibrary: LibraryItem[] = [
  {
    id: '1',
    title: 'CompTIA Network+ Study Guide',
    description: 'Comprehensive study guide covering all N10-009 exam objectives.',
    type: 'course',
    category: 'Networking',
    bookmarked: true,
    downloaded: true,
    addedAt: '2026-01-15',
    lastAccessed: '2026-04-04',
    progress: 65,
  },
  {
    id: '2',
    title: 'Linux Command Line Reference',
    description: 'Quick reference guide for essential Linux commands and scripting.',
    type: 'document',
    category: 'Linux',
    bookmarked: true,
    downloaded: false,
    addedAt: '2026-02-20',
    lastAccessed: '2026-04-03',
    notes: 'Great for quick lookups during lab exercises',
  },
  {
    id: '3',
    title: 'Subnetting Made Easy',
    description: 'Step-by-step video tutorial on IP subnetting and CIDR notation.',
    type: 'video',
    category: 'Networking',
    bookmarked: false,
    downloaded: true,
    addedAt: '2026-03-01',
    lastAccessed: '2026-03-28',
  },
  {
    id: '4',
    title: 'Wireshark Packet Analysis Lab',
    description: 'Hands-on lab guide for network traffic analysis with Wireshark.',
    type: 'document',
    category: 'Security',
    bookmarked: true,
    downloaded: false,
    addedAt: '2026-03-10',
  },
  {
    id: '5',
    title: 'OSPF Configuration Tutorial',
    description: 'External link to Cisco OSPF configuration best practices.',
    type: 'link',
    category: 'Routing',
    bookmarked: false,
    downloaded: false,
    addedAt: '2026-03-15',
  },
  {
    id: '6',
    title: 'Linux+ Certification Prep',
    description: 'Full certification preparation course with practice exams.',
    type: 'course',
    category: 'Linux',
    bookmarked: true,
    downloaded: true,
    addedAt: '2026-02-01',
    lastAccessed: '2026-04-05',
    progress: 42,
  },
];

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

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<LibraryTab>('all');
  const [search, setSearch] = useState('');

  const filteredItems = mockLibrary.filter((item) => {
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
    { id: 'all' as const, label: 'All Resources', count: mockLibrary.length },
    {
      id: 'bookmarked' as const,
      label: 'Bookmarked',
      count: mockLibrary.filter((i) => i.bookmarked).length,
    },
    {
      id: 'downloads' as const,
      label: 'Downloads',
      count: mockLibrary.filter((i) => i.downloaded).length,
    },
    { id: 'notes' as const, label: 'With Notes', count: mockLibrary.filter((i) => i.notes).length },
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
      {filteredItems.length === 0 ? (
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
        <ImagePlaceholder
          type={item.type === 'video' ? 'video' : 'image'}
          aspectRatio="video"
          label={item.category}
          className="rounded-none border-0"
        />
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
