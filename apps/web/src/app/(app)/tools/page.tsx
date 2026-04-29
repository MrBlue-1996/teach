'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/ui/page-header';
import { DataTableShell } from '@/components/ui/data-table-shell';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/ui/stat-card';
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Tag,
  Info,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getResourcePack, type ToolResource as Tool, type ToolStatus } from '@/lib/pack-resources';

type ViewMode = 'grid' | 'list';

const statusConfig: Record<
  ToolStatus,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  available: {
    label: 'Available',
    icon: CheckCircle2,
    className: 'text-green-600 bg-green-100 dark:bg-green-900/50 dark:text-green-400',
  },
  'in-use': {
    label: 'In Use',
    icon: Info,
    className: 'text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400',
  },
  maintenance: {
    label: 'Maintenance',
    icon: AlertTriangle,
    className: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/50 dark:text-yellow-400',
  },
  retired: {
    label: 'Retired',
    icon: XCircle,
    className: 'text-red-600 bg-red-100 dark:bg-red-900/50 dark:text-red-400',
  },
};

const toolStatuses: ToolStatus[] = ['available', 'in-use', 'maintenance', 'retired'];

export default function ToolsPage() {
  const searchParams = useSearchParams();
  const resourcePack = getResourcePack(searchParams.get('pack'));
  const tools = resourcePack.tools;
  const categories = ['All', ...Array.from(new Set(tools.map((t) => t.category)))];
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState<ToolStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

  useEffect(() => {
    setCategory('All');
    setStatusFilter('all');
    setSelectedTool(null);
  }, [resourcePack.id]);

  const filteredTools = tools.filter((tool) => {
    const matchesSearch =
      tool.name.toLowerCase().includes(search.toLowerCase()) ||
      tool.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All' || tool.category === category;
    const matchesStatus = statusFilter === 'all' || tool.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const stats = {
    total: tools.length,
    available: tools.filter((t) => t.status === 'available').length,
    inUse: tools.filter((t) => t.status === 'in-use').length,
    maintenance: tools.filter((t) => t.status === 'maintenance').length,
  };

  return (
    <div className="space-y-6 page-transition">
      <PageHeader
        title={resourcePack.pages.tools.title}
        description={resourcePack.pages.tools.description}
        icon={Wrench}
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {resourcePack.pages.tools.action}
          </Button>
        }
      />

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Wrench} label="Total Tools" value={stats.total} color="blue" />
        <StatCard icon={CheckCircle2} label="Available" value={stats.available} color="green" />
        <StatCard icon={Info} label="In Use" value={stats.inUse} color="orange" />
        <StatCard
          icon={AlertTriangle}
          label="Maintenance"
          value={stats.maintenance}
          color="yellow"
        />
      </div>

      {/* Search & Filter */}
      <DataTableShell
        searchPlaceholder="Search tools and equipment..."
        searchValue={search}
        onSearchChange={setSearch}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filters={
          <div className="flex gap-2 overflow-x-auto">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={category === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory(cat)}
                className="whitespace-nowrap"
              >
                {cat}
              </Button>
            ))}
          </div>
        }
      >
        {/* Status Filter Pills */}
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              statusFilter === 'all'
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            All Status
          </button>
          {toolStatuses.map((status) => {
            // Enum-indexed config lookup is constrained by the local status list above.
            // eslint-disable-next-line security/detect-object-injection
            const config = statusConfig[status];
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  statusFilter === status
                    ? config.className
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {config.label}
              </button>
            );
          })}
        </div>

        {/* Tools Grid/List */}
        {filteredTools.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title={resourcePack.pages.tools.emptyTitle}
            description="Try adjusting your search or filters"
          />
        ) : viewMode === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} onSelect={setSelectedTool} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTools.map((tool) => (
              <ToolListItem key={tool.id} tool={tool} onSelect={setSelectedTool} />
            ))}
          </div>
        )}
      </DataTableShell>

      {/* Tool Detail Drawer */}
      {selectedTool && (
        <ToolDetailDrawer tool={selectedTool} onClose={() => setSelectedTool(null)} />
      )}
    </div>
  );
}

function ToolCard({ tool, onSelect }: { tool: Tool; onSelect: (t: Tool) => void }) {
  const status = statusConfig[tool.status];
  const StatusIcon = status.icon;

  return (
    <Card
      className="card-hover cursor-pointer overflow-hidden"
      onClick={() => onSelect(tool)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(tool);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <CardContent className="p-0">
        <div className="flex aspect-video items-center justify-center rounded-none bg-muted/40">
          <Wrench className="h-14 w-14 text-muted-foreground/30" />
        </div>
        <div className="p-4">
          <div className="mb-2 flex items-start justify-between">
            <h3 className="font-semibold">{tool.name}</h3>
            <span
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                status.className
              )}
            >
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </span>
          </div>
          <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{tool.description}</p>
          <div className="mb-3">
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-muted-foreground">Condition</span>
              <span className="font-medium">{tool.condition}%</span>
            </div>
            <Progress value={tool.condition} className="h-1.5" />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              {tool.category}
            </span>
            <span>{tool.location}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ToolListItem({ tool, onSelect }: { tool: Tool; onSelect: (t: Tool) => void }) {
  const status = statusConfig[tool.status];
  const StatusIcon = status.icon;

  return (
    <Card className="card-hover cursor-pointer" onClick={() => onSelect(tool)}>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="hidden h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-muted sm:flex">
          <Wrench className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{tool.name}</h3>
            <span
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
                status.className
              )}
            >
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground truncate">{tool.description}</p>
          <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
            <span>{tool.category}</span>
            <span>{tool.location}</span>
            <span>Condition: {tool.condition}%</span>
          </div>
        </div>
        <ExternalLink className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

function ToolDetailDrawer({ tool, onClose }: { tool: Tool; onClose: () => void }) {
  const status = statusConfig[tool.status];
  const StatusIcon = status.icon;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-lg overflow-y-auto border-l bg-card shadow-lg">
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold">Tool Details</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <XCircle className="h-5 w-5" />
            </Button>
          </div>

          <div className="mb-6 flex aspect-video items-center justify-center rounded-lg bg-muted/40">
            <Wrench className="h-16 w-16 text-muted-foreground/30" />
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">{tool.name}</h3>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium mt-1',
                  status.className
                )}
              >
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </span>
            </div>

            <p className="text-sm text-muted-foreground">{tool.description}</p>

            <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
              <div>
                <p className="text-xs text-muted-foreground">Category</p>
                <p className="font-medium">{tool.category}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="font-medium">{tool.location}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last Serviced</p>
                <p className="font-medium">{new Date(tool.lastServiced).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Condition</p>
                <div className="flex items-center gap-2">
                  <Progress value={tool.condition} className="h-1.5 flex-1" />
                  <span className="text-sm font-medium">{tool.condition}%</span>
                </div>
              </div>
            </div>

            {tool.assignedTo && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Currently assigned to:
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">{tool.assignedTo}</p>
              </div>
            )}

            {tool.specifications && (
              <div>
                <h4 className="mb-2 text-sm font-semibold">Specifications</h4>
                <ul className="space-y-1">
                  {tool.specifications.map((spec, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-primary" />
                      {spec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tool.safetyNotes && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950">
                <div className="flex items-center gap-2 text-sm font-medium text-yellow-700 dark:text-yellow-300">
                  <AlertTriangle className="h-4 w-4" />
                  Safety Notes
                </div>
                <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-400">
                  {tool.safetyNotes}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button className="flex-1" disabled={tool.status !== 'available'}>
                {tool.status === 'available' ? 'Reserve Tool' : 'Not Available'}
              </Button>
              <Button variant="outline">Report Issue</Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
