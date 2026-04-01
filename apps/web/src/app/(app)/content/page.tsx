'use client';

import {
  Search,
  BookOpen,
  Clock,
  Users,
  ChevronRight,
  Star,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { contentApi, learnerApi } from '@/lib/api';
import { cn, getLevelGradientFrom, getLevelName } from '@/lib/utils';

import type { ContentPack, LearnerState } from '@/lib/api';

interface DisplayPack extends ContentPack {
  enrolled: boolean;
  overallMastery: number;
  blocksCompleted: number;
}

export default function ContentPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [packs, setPacks] = useState<DisplayPack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadContent() {
      try {
        // Fetch packs and learner states in parallel
        const [packsRes, statesRes] = await Promise.allSettled([
          contentApi.getPacks({ limit: '100' }),
          learnerApi.getStates(),
        ]);

        const rawPacks = packsRes.status === 'fulfilled' ? packsRes.value.packs : [];
        const states = statesRes.status === 'fulfilled' ? statesRes.value.states : [];

        // Build a map of pack ID -> learner state for quick lookup
        const stateMap = new Map<string, LearnerState>();
        for (const s of states) {
          if (s.contentPack.id) {
            stateMap.set(s.contentPack.id, s);
          }
        }

        // Merge pack data with learner state
        const displayPacks: DisplayPack[] = rawPacks.map((pack) => {
          const state = stateMap.get(pack.id);
          return {
            ...pack,
            enrolled: !!state,
            overallMastery: state ? state.overallMastery : 0,
            blocksCompleted: state ? state.blocksCompleted : 0,
          };
        });

        setPacks(displayPacks);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load content');
        setIsLoading(false);
      }
    }

    loadContent();
  }, []);

  // Derive categories from actual pack data
  const categories = [
    'All',
    ...Array.from(new Set(packs.map((p) => p.certificationTarget).filter(Boolean))),
  ];

  const filteredPacks = packs.filter((pack) => {
    const matchesSearch =
      pack.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pack.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || pack.certificationTarget === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const enrolledPacks = filteredPacks.filter((p) => p.enrolled);
  const availablePacks = filteredPacks.filter((p) => !p.enrolled);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading content library...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading content</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 page-transition">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Content Library</h1>
        <p className="text-muted-foreground">Choose your next learning adventure</p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="whitespace-nowrap"
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Continue Learning */}
      {enrolledPacks.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">Continue Learning</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enrolledPacks.map((pack) => (
              <PackCard key={pack.id} pack={pack} />
            ))}
          </div>
        </div>
      )}

      {/* Available Packs */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">
          {enrolledPacks.length > 0 ? 'Explore More' : 'Available Courses'}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {availablePacks.map((pack) => (
            <PackCard key={pack.id} pack={pack} />
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredPacks.length === 0 && (
        <div className="py-12 text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">No courses found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}

function PackCard({ pack }: { pack: DisplayPack }) {
  const masteryPercent = Math.round(pack.overallMastery * 100);

  return (
    <Link href={pack.enrolled ? `/learn/${pack.id}` : `/content/${pack.id}`}>
      <Card className="card-hover h-full overflow-hidden">
        <CardContent className="p-0">
          {/* Pack Color Header */}
          <div
            className={cn(
              'relative h-32 bg-gradient-to-br to-primary/50',
              getLevelGradientFrom('L1_RECALL')
            )}
          >
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <span className="rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-gray-800">
                {pack.certificationTarget || pack.status}
              </span>
              {pack.enrolled && (
                <span className="flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-xs font-medium text-white">
                  <CheckCircle2 className="h-3 w-3" />
                  Enrolled
                </span>
              )}
            </div>
          </div>

          {/* Pack Info */}
          <div className="p-4">
            <h3 className="mb-1 font-semibold">{pack.title}</h3>
            <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{pack.description}</p>

            {/* Progress (if enrolled) */}
            {pack.enrolled && masteryPercent > 0 && (
              <div className="mb-3">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-muted-foreground">Mastery</span>
                  <span className="font-medium">{masteryPercent}%</span>
                </div>
                <Progress value={masteryPercent} className="h-1.5" />
              </div>
            )}

            {/* Meta */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                {pack.enrolled && (
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {pack.blocksCompleted} blocks done
                  </span>
                )}
                <span className="flex items-center gap-1">v{pack.version}</span>
              </div>
              <span className="text-xs">{pack.status}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
