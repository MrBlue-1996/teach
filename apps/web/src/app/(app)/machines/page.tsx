'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/ui/page-header';
import { DataTableShell } from '@/components/ui/data-table-shell';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/ui/stat-card';
import {
  Cog,
  Activity,
  AlertTriangle,
  XCircle,
  Clock,
  Thermometer,
  Gauge,
  Zap,
  Plus,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type MachineStatus = 'running' | 'idle' | 'maintenance' | 'offline';

interface Machine {
  id: string;
  name: string;
  type: string;
  model: string;
  status: MachineStatus;
  location: string;
  health: number;
  uptime: string;
  lastMaintenance: string;
  nextMaintenance: string;
  metrics: {
    temperature?: number;
    power?: number;
    speed?: number;
    load?: number;
  };
  description: string;
  operator?: string;
}

const mockMachines: Machine[] = [
  {
    id: '1',
    name: 'CNC Mill Alpha',
    type: 'CNC Machine',
    model: 'Haas VF-2SS',
    status: 'running',
    location: 'Shop Floor - Bay 1',
    health: 94,
    uptime: '1,247 hrs',
    lastMaintenance: '2026-03-01',
    nextMaintenance: '2026-04-15',
    metrics: { temperature: 42, power: 78, speed: 12000, load: 65 },
    description: 'High-speed vertical machining center for precision parts production.',
    operator: 'Team A - Shift 1',
  },
  {
    id: '2',
    name: 'Laser Cutter Pro',
    type: 'Laser Cutter',
    model: 'Trotec Speedy 400',
    status: 'idle',
    location: 'Shop Floor - Bay 3',
    health: 88,
    uptime: '856 hrs',
    lastMaintenance: '2026-02-15',
    nextMaintenance: '2026-04-20',
    metrics: { temperature: 28, power: 5, load: 0 },
    description: '100W CO2 laser cutter for cutting and engraving various materials.',
  },
  {
    id: '3',
    name: '3D Printer Farm - Rack A',
    type: '3D Printer',
    model: 'Prusa MK4 (x8)',
    status: 'running',
    location: 'Prototyping Lab',
    health: 91,
    uptime: '2,103 hrs',
    lastMaintenance: '2026-03-10',
    nextMaintenance: '2026-05-01',
    metrics: { temperature: 65, power: 45, load: 87 },
    description: 'Bank of 8 Prusa MK4 printers for rapid prototyping and production runs.',
    operator: 'Auto-Queue System',
  },
  {
    id: '4',
    name: 'Hydraulic Press',
    type: 'Press',
    model: 'Dake 75H',
    status: 'maintenance',
    location: 'Shop Floor - Bay 5',
    health: 52,
    uptime: '3,891 hrs',
    lastMaintenance: '2026-03-28',
    nextMaintenance: '2026-04-05',
    metrics: { temperature: 22, power: 0, load: 0 },
    description: '75-ton hydraulic press. Currently undergoing seal replacement.',
  },
  {
    id: '5',
    name: 'Welding Station B',
    type: 'Welder',
    model: 'Miller Dynasty 400',
    status: 'offline',
    location: 'Welding Shop - Station B',
    health: 15,
    uptime: '4,567 hrs',
    lastMaintenance: '2025-11-20',
    nextMaintenance: 'Overdue',
    metrics: {},
    description: 'AC/DC TIG welder. Offline pending major service overhaul.',
  },
  {
    id: '6',
    name: 'Surface Grinder',
    type: 'Grinder',
    model: 'Okamoto ACC-1224DX',
    status: 'idle',
    location: 'Shop Floor - Bay 2',
    health: 96,
    uptime: '672 hrs',
    lastMaintenance: '2026-03-20',
    nextMaintenance: '2026-06-01',
    metrics: { temperature: 25, power: 3 },
    description: 'Precision surface grinder for flat surface finishing operations.',
  },
];

const statusConfig: Record<
  MachineStatus,
  { label: string; icon: typeof Activity; className: string; dotClass: string }
> = {
  running: {
    label: 'Running',
    icon: Activity,
    className: 'text-green-600 bg-green-100 dark:bg-green-900/50 dark:text-green-400',
    dotClass: 'bg-green-500 animate-pulse',
  },
  idle: {
    label: 'Idle',
    icon: Clock,
    className: 'text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400',
    dotClass: 'bg-blue-500',
  },
  maintenance: {
    label: 'Maintenance',
    icon: AlertTriangle,
    className: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/50 dark:text-yellow-400',
    dotClass: 'bg-yellow-500',
  },
  offline: {
    label: 'Offline',
    icon: XCircle,
    className: 'text-red-600 bg-red-100 dark:bg-red-900/50 dark:text-red-400',
    dotClass: 'bg-red-500',
  },
};

export default function MachinesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<MachineStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);

  const filteredMachines = mockMachines.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.type.toLowerCase().includes(search.toLowerCase()) ||
      m.model.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: mockMachines.length,
    running: mockMachines.filter((m) => m.status === 'running').length,
    idle: mockMachines.filter((m) => m.status === 'idle').length,
    needsAttention: mockMachines.filter((m) => m.status === 'maintenance' || m.status === 'offline')
      .length,
  };

  return (
    <div className="space-y-6 page-transition">
      <PageHeader
        title="Machines"
        description="Monitor and manage workshop machines and production equipment"
        icon={Cog}
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Register Machine
          </Button>
        }
      />

      {/* Live Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Cog} label="Total Machines" value={stats.total} color="blue" />
        <StatCard
          icon={Activity}
          label="Running"
          value={stats.running}
          color="green"
          change={`${Math.round((stats.running / stats.total) * 100)}% utilization`}
          trend="up"
        />
        <StatCard icon={Clock} label="Idle" value={stats.idle} color="orange" />
        <StatCard
          icon={AlertTriangle}
          label="Needs Attention"
          value={stats.needsAttention}
          color="red"
        />
      </div>

      <DataTableShell
        searchPlaceholder="Search machines..."
        searchValue={search}
        onSearchChange={setSearch}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filters={
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                statusFilter === 'all'
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              All
            </button>
            {(Object.keys(statusConfig) as MachineStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  statusFilter === s ? statusConfig[s].className : 'bg-muted text-muted-foreground'
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', statusConfig[s].dotClass)} />
                {statusConfig[s].label}
              </button>
            ))}
          </div>
        }
      >
        {filteredMachines.length === 0 ? (
          <EmptyState
            icon={Cog}
            title="No machines found"
            description="Try adjusting your filters"
          />
        ) : viewMode === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMachines.map((machine) => (
              <MachineCard key={machine.id} machine={machine} onSelect={setSelectedMachine} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMachines.map((machine) => (
              <MachineListItem key={machine.id} machine={machine} onSelect={setSelectedMachine} />
            ))}
          </div>
        )}
      </DataTableShell>

      {selectedMachine && (
        <MachineDetailPanel machine={selectedMachine} onClose={() => setSelectedMachine(null)} />
      )}
    </div>
  );
}

function MachineCard({ machine, onSelect }: { machine: Machine; onSelect: (m: Machine) => void }) {
  const status = statusConfig[machine.status];

  return (
    <Card
      className="card-hover cursor-pointer overflow-hidden"
      onClick={() => onSelect(machine)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(machine);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <CardContent className="p-0">
        <div className="relative">
          <div className="flex aspect-video items-center justify-center bg-muted/40">
            <Cog className="h-14 w-14 text-muted-foreground/30" />
          </div>
          <div className="absolute left-3 top-3">
            <span
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium',
                status.className
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', status.dotClass)} />
              {status.label}
            </span>
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold">{machine.name}</h3>
          <p className="text-sm text-muted-foreground">{machine.model}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {machine.metrics.temperature !== undefined && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Thermometer className="h-3 w-3" />
                {machine.metrics.temperature}°C
              </div>
            )}
            {machine.metrics.load !== undefined && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Gauge className="h-3 w-3" />
                {machine.metrics.load}% load
              </div>
            )}
            {machine.metrics.power !== undefined && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Zap className="h-3 w-3" />
                {machine.metrics.power}% power
              </div>
            )}
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              {machine.uptime}
            </div>
          </div>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-muted-foreground">Health</span>
              <span className="font-medium">{machine.health}%</span>
            </div>
            <Progress value={machine.health} className="h-1.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MachineListItem({
  machine,
  onSelect,
}: {
  machine: Machine;
  onSelect: (m: Machine) => void;
}) {
  const status = statusConfig[machine.status];

  return (
    <Card className="card-hover cursor-pointer" onClick={() => onSelect(machine)}>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
          <Cog className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{machine.name}</h3>
            <span
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
                status.className
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', status.dotClass)} />
              {status.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {machine.model} - {machine.location}
          </p>
        </div>
        <div className="hidden items-center gap-6 text-sm sm:flex">
          <div className="text-center">
            <p className="font-medium">{machine.health}%</p>
            <p className="text-xs text-muted-foreground">Health</p>
          </div>
          <div className="text-center">
            <p className="font-medium">{machine.uptime}</p>
            <p className="text-xs text-muted-foreground">Uptime</p>
          </div>
        </div>
        <Button variant="ghost" size="icon">
          <Eye className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function MachineDetailPanel({ machine, onClose }: { machine: Machine; onClose: () => void }) {
  const status = statusConfig[machine.status];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-lg overflow-y-auto border-l bg-card shadow-lg">
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold">Machine Details</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <XCircle className="h-5 w-5" />
            </Button>
          </div>

          <div className="mb-6 flex aspect-video items-center justify-center rounded-lg bg-muted/40">
            <Cog className="h-16 w-16 text-muted-foreground/30" />
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{machine.name}</h3>
                <span
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
                    status.className
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', status.dotClass)} />
                  {status.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{machine.model}</p>
            </div>

            <p className="text-sm text-muted-foreground">{machine.description}</p>

            {/* Live Metrics */}
            <div>
              <h4 className="mb-3 text-sm font-semibold">Live Metrics</h4>
              <div className="grid grid-cols-2 gap-3">
                {machine.metrics.temperature !== undefined && (
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Thermometer className="h-4 w-4" />
                      <span className="text-xs">Temperature</span>
                    </div>
                    <p className="mt-1 text-lg font-bold">{machine.metrics.temperature}°C</p>
                  </div>
                )}
                {machine.metrics.power !== undefined && (
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Zap className="h-4 w-4" />
                      <span className="text-xs">Power</span>
                    </div>
                    <p className="mt-1 text-lg font-bold">{machine.metrics.power}%</p>
                  </div>
                )}
                {machine.metrics.speed !== undefined && (
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Gauge className="h-4 w-4" />
                      <span className="text-xs">Speed</span>
                    </div>
                    <p className="mt-1 text-lg font-bold">{machine.metrics.speed} RPM</p>
                  </div>
                )}
                {machine.metrics.load !== undefined && (
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Activity className="h-4 w-4" />
                      <span className="text-xs">Load</span>
                    </div>
                    <p className="mt-1 text-lg font-bold">{machine.metrics.load}%</p>
                  </div>
                )}
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="font-medium">{machine.location}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Uptime</p>
                <p className="font-medium">{machine.uptime}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last Maintenance</p>
                <p className="font-medium">
                  {new Date(machine.lastMaintenance).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Next Maintenance</p>
                <p
                  className={cn(
                    'font-medium',
                    machine.nextMaintenance === 'Overdue' && 'text-destructive'
                  )}
                >
                  {machine.nextMaintenance === 'Overdue'
                    ? 'OVERDUE'
                    : new Date(machine.nextMaintenance).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Health Bar */}
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>Overall Health</span>
                <span className="font-medium">{machine.health}%</span>
              </div>
              <Progress value={machine.health} className="h-2" />
            </div>

            {machine.operator && (
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Current Operator</p>
                <p className="font-medium">{machine.operator}</p>
              </div>
            )}

            {/* Performance chart — visualization not yet implemented */}
            <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed">
              <p className="text-xs text-muted-foreground">Performance chart coming soon</p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button className="flex-1">Schedule Maintenance</Button>
              <Button variant="outline">View History</Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
