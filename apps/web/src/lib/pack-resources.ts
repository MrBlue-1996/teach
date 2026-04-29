import type { LucideIcon } from 'lucide-react';
import { FlaskConical, Wrench } from 'lucide-react';

export type ResourcePackId = 'linux' | 'uncle-julios';
export type ToolStatus = 'available' | 'in-use' | 'maintenance' | 'retired';
export type MachineStatus = 'running' | 'idle' | 'maintenance' | 'offline';
export type StockLevel = 'full' | 'adequate' | 'low' | 'critical' | 'out';

export interface ToolResource {
  id: string;
  name: string;
  category: string;
  description: string;
  status: ToolStatus;
  condition: number;
  location: string;
  lastServiced: string;
  assignedTo?: string;
  imageUrl?: string;
  specifications?: string[];
  safetyNotes?: string;
}

export interface MachineResource {
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

export interface IngredientResource {
  id: string;
  name: string;
  category: string;
  description: string;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  stockLevel: StockLevel;
  costPerUnit: number;
  supplier: string;
  lastOrdered: string;
  expiryDate?: string;
  location: string;
  usedInCourses: string[];
  hazardous: boolean;
  msdsAvailable: boolean;
}

export interface ResourcePack {
  id: ResourcePackId;
  title: string;
  shortTitle: string;
  sidebarTitle: string;
  resourceDescription: string;
  nav: {
    tools: string;
    machines: string;
    ingredients: string;
  };
  pages: {
    tools: { title: string; description: string; action: string; emptyTitle: string };
    machines: { title: string; description: string; action: string; emptyTitle: string };
    ingredients: { title: string; description: string; action: string; emptyTitle: string };
  };
  tools: ToolResource[];
  machines: MachineResource[];
  ingredients: IngredientResource[];
}

export const resourcePackOptions: Array<{
  id: ResourcePackId;
  title: string;
  icon: LucideIcon;
}> = [
  { id: 'linux', title: 'Linux+', icon: Wrench },
  { id: 'uncle-julios', title: "Uncle Julio's", icon: FlaskConical },
];

export const resourcePacks: Record<ResourcePackId, ResourcePack> = {
  linux: {
    id: 'linux',
    title: 'Linux Fundamentals',
    shortTitle: 'Linux+',
    sidebarTitle: 'Linux Lab',
    resourceDescription: 'Linux certification lab resources stay separate from culinary packs.',
    nav: {
      tools: 'Lab Tools',
      machines: 'Lab Machines',
      ingredients: 'Lab Materials',
    },
    pages: {
      tools: {
        title: 'Linux Lab Tools',
        description: 'Browse, reserve, and manage Linux and IT training tools',
        action: 'Add Tool',
        emptyTitle: 'No Linux lab tools found',
      },
      machines: {
        title: 'Linux Lab Machines',
        description: 'Monitor virtual machines, lab hosts, and certification environments',
        action: 'Register Machine',
        emptyTitle: 'No Linux lab machines found',
      },
      ingredients: {
        title: 'Linux Lab Materials',
        description: 'Track cables, media, and consumables used by the Linux pack',
        action: 'Add Material',
        emptyTitle: 'No Linux lab materials found',
      },
    },
    tools: [
      {
        id: 'linux-tool-1',
        name: 'Terminal Workstation',
        category: 'Shell',
        description: 'Configured Linux workstation for command-line drills and package labs.',
        status: 'available',
        condition: 96,
        location: 'Linux Lab - Bench 1',
        lastServiced: '2026-03-20',
        specifications: ['Ubuntu LTS', 'Zsh and Bash shells', 'Local VM support'],
      },
      {
        id: 'linux-tool-2',
        name: 'Network Cable Tester',
        category: 'Networking',
        description:
          'CableIQ tester for validating lab network drops before Linux networking labs.',
        status: 'available',
        condition: 92,
        location: 'Linux Lab - Drawer 2',
        lastServiced: '2026-01-10',
        specifications: ['Cat5e/Cat6', 'PoE testing', 'Length measurement'],
      },
      {
        id: 'linux-tool-3',
        name: 'USB Recovery Kit',
        category: 'Recovery',
        description: 'Bootable rescue media for filesystem repair, imaging, and recovery practice.',
        status: 'in-use',
        condition: 84,
        location: 'Linux Lab - Cabinet 1',
        lastServiced: '2026-03-01',
        assignedTo: 'Filesystem Recovery Block',
        specifications: ['Ventoy drive', 'Rescue ISO set', 'Encrypted storage case'],
      },
      {
        id: 'linux-tool-4',
        name: 'Serial Console Adapter',
        category: 'Administration',
        description: 'USB-to-serial adapter for bootloader and headless server troubleshooting.',
        status: 'available',
        condition: 89,
        location: 'Linux Lab - Drawer 4',
        lastServiced: '2026-02-11',
        specifications: ['USB-C', 'RJ45 rollover cable', 'TTL adapter'],
      },
    ],
    machines: [
      {
        id: 'linux-machine-1',
        name: 'Ubuntu Server VM Pool',
        type: 'Virtual Machine Pool',
        model: 'KVM/libvirt',
        status: 'running',
        location: 'Hypervisor A',
        health: 94,
        uptime: '412 hrs',
        lastMaintenance: '2026-03-25',
        nextMaintenance: '2026-05-01',
        metrics: { temperature: 35, power: 62, load: 58 },
        description:
          'Disposable Ubuntu Server instances for services, users, and permissions labs.',
        operator: 'Auto-Provisioner',
      },
      {
        id: 'linux-machine-2',
        name: 'Rocky Linux Host',
        type: 'Bare Metal Server',
        model: 'Dell PowerEdge R340',
        status: 'idle',
        location: 'Rack A - U12',
        health: 90,
        uptime: '1,108 hrs',
        lastMaintenance: '2026-03-12',
        nextMaintenance: '2026-05-15',
        metrics: { temperature: 31, power: 18, load: 0 },
        description: 'Bare-metal host for systemd, storage, and SELinux practice.',
      },
      {
        id: 'linux-machine-3',
        name: 'Network Namespace Lab',
        type: 'Container Lab',
        model: 'Podman Netavark',
        status: 'maintenance',
        location: 'Hypervisor B',
        health: 67,
        uptime: '73 hrs',
        lastMaintenance: '2026-04-01',
        nextMaintenance: '2026-04-30',
        metrics: { temperature: 38, power: 44, load: 21 },
        description: 'Containerized routing and firewall lab currently being refreshed.',
      },
    ],
    ingredients: [
      {
        id: 'linux-material-1',
        name: 'Cat6 Ethernet Cable',
        category: 'Cabling',
        description: 'Bulk Cat6 UTP cable used for Linux networking and service labs.',
        unit: 'feet',
        currentStock: 2500,
        minStock: 500,
        maxStock: 5000,
        stockLevel: 'full',
        costPerUnit: 0.35,
        supplier: 'Monoprice',
        lastOrdered: '2026-02-15',
        location: 'Linux Lab - Reel Rack',
        usedInCourses: ['Linux Fundamentals', 'Network Services'],
        hazardous: false,
        msdsAvailable: false,
      },
      {
        id: 'linux-material-2',
        name: 'USB 3.0 Flash Drives',
        category: 'Boot Media',
        description: 'Reusable flash drives for install, rescue, and image validation exercises.',
        unit: 'pieces',
        currentStock: 18,
        minStock: 10,
        maxStock: 40,
        stockLevel: 'adequate',
        costPerUnit: 8.0,
        supplier: 'Kingston',
        lastOrdered: '2026-03-05',
        location: 'Linux Lab - Cabinet 1',
        usedInCourses: ['Linux Fundamentals'],
        hazardous: false,
        msdsAvailable: false,
      },
      {
        id: 'linux-material-3',
        name: 'RJ45 Connectors',
        category: 'Connectors',
        description: 'Pass-through RJ45 connectors for cabling labs tied to Linux networking.',
        unit: 'pieces',
        currentStock: 75,
        minStock: 100,
        maxStock: 500,
        stockLevel: 'low',
        costPerUnit: 0.45,
        supplier: 'Monoprice',
        lastOrdered: '2026-01-20',
        location: 'Linux Lab - Drawer 3',
        usedInCourses: ['Network Services'],
        hazardous: false,
        msdsAvailable: false,
      },
    ],
  },
  'uncle-julios': {
    id: 'uncle-julios',
    title: "Uncle Julio's Kitchen Operations",
    shortTitle: "Uncle Julio's",
    sidebarTitle: "Uncle Julio's",
    resourceDescription: 'Culinary tools, line stations, and ingredients stay inside this pack.',
    nav: {
      tools: 'Kitchen Tools',
      machines: 'Line Stations',
      ingredients: 'Ingredients',
    },
    pages: {
      tools: {
        title: "Uncle Julio's Kitchen Tools",
        description: 'Manage the tools used by the Uncle Julio kitchen training pack',
        action: 'Add Tool',
        emptyTitle: 'No kitchen tools found',
      },
      machines: {
        title: "Uncle Julio's Line Stations",
        description: 'Monitor prep, grill, saute, cold, and expo stations for service readiness',
        action: 'Register Station',
        emptyTitle: 'No line stations found',
      },
      ingredients: {
        title: "Uncle Julio's Ingredients",
        description: 'Track produce, proteins, sauces, and prep stock for this pack only',
        action: 'Add Ingredient',
        emptyTitle: 'No ingredients found',
      },
    },
    tools: [
      {
        id: 'uj-tool-1',
        name: 'Chef Knife',
        category: 'Prep',
        description: 'Primary prep knife for vegetable, garnish, and protein station work.',
        status: 'available',
        condition: 91,
        location: 'Prep Table - Knife Rack',
        lastServiced: '2026-03-26',
        specifications: ['8 inch blade', 'Daily honing required', 'Color-coded handle'],
        safetyNotes: 'Store on magnetic strip after sanitation. Never leave in a sink.',
      },
      {
        id: 'uj-tool-2',
        name: 'Sani Bucket Kit',
        category: 'Sanitation',
        description:
          'Red sanitizer bucket with test strips and towels for active service stations.',
        status: 'in-use',
        condition: 86,
        location: 'Grill Station',
        lastServiced: '2026-04-01',
        assignedTo: 'Rush Hour Challenge',
        specifications: ['Quat test strips', 'Red bucket', 'Disposable towels'],
        safetyNotes: 'Verify sanitizer concentration before service.',
      },
      {
        id: 'uj-tool-3',
        name: 'Infrared Thermometer',
        category: 'Food Safety',
        description: 'Quick surface-temperature checks during holding and line audits.',
        status: 'available',
        condition: 94,
        location: 'Expo - Tool Bin',
        lastServiced: '2026-03-18',
        specifications: ['-50C to 500C range', 'Laser sight', 'NSF-rated casing'],
      },
      {
        id: 'uj-tool-4',
        name: 'Tongs Set',
        category: 'Line Service',
        description: 'Dedicated tongs for grill, saute, and cold station separation.',
        status: 'available',
        condition: 80,
        location: 'Line Rail',
        lastServiced: '2026-03-28',
        specifications: ['Grill tongs', 'Cold station tongs', 'Saute tongs'],
      },
    ],
    machines: [
      {
        id: 'uj-station-1',
        name: 'Grill Station',
        type: 'Hot Line Station',
        model: 'Mesquite Grill Line',
        status: 'running',
        location: 'Kitchen Line - Bay 1',
        health: 92,
        uptime: 'Service ready',
        lastMaintenance: '2026-03-29',
        nextMaintenance: '2026-04-30',
        metrics: { temperature: 246, power: 76, load: 68 },
        description: 'Primary fajita and protein grill station for Uncle Julio service drills.',
        operator: 'Line Cook - Grill',
      },
      {
        id: 'uj-station-2',
        name: 'Cold Station',
        type: 'Cold Line Station',
        model: 'Reach-In Prep Rail',
        status: 'idle',
        location: 'Kitchen Line - Bay 3',
        health: 88,
        uptime: 'Reset complete',
        lastMaintenance: '2026-03-27',
        nextMaintenance: '2026-05-04',
        metrics: { temperature: 4, power: 32, load: 0 },
        description: 'Cold garnish, salsa, salad, and chilled prep station.',
      },
      {
        id: 'uj-station-3',
        name: 'Saute Station',
        type: 'Hot Line Station',
        model: 'Six-Burner Range',
        status: 'maintenance',
        location: 'Kitchen Line - Bay 2',
        health: 63,
        uptime: 'Paused',
        lastMaintenance: '2026-04-02',
        nextMaintenance: '2026-04-29',
        metrics: { temperature: 82, power: 0, load: 0 },
        description: 'Saute burner station paused for burner cleaning and pan restock.',
      },
      {
        id: 'uj-station-4',
        name: 'Expo Station',
        type: 'Service Station',
        model: 'Heat Lamp Pass',
        status: 'running',
        location: 'Kitchen Line - Pass',
        health: 95,
        uptime: 'Dinner service',
        lastMaintenance: '2026-03-31',
        nextMaintenance: '2026-05-10',
        metrics: { temperature: 63, power: 52, load: 81 },
        description: 'Final plate check, ticket timing, and quality-control station.',
        operator: 'Expo Lead',
      },
    ],
    ingredients: [
      {
        id: 'uj-ingredient-1',
        name: 'Marinated Skirt Steak',
        category: 'Protein',
        description: 'Portioned skirt steak for fajita line execution and cook-temp drills.',
        unit: 'pounds',
        currentStock: 38,
        minStock: 25,
        maxStock: 80,
        stockLevel: 'adequate',
        costPerUnit: 8.75,
        supplier: 'Uncle Julio Commissary',
        lastOrdered: '2026-04-01',
        expiryDate: '2026-05-03',
        location: 'Walk-In - Protein Shelf',
        usedInCourses: ["Uncle Julio's Kitchen Operations"],
        hazardous: false,
        msdsAvailable: false,
      },
      {
        id: 'uj-ingredient-2',
        name: 'Pico de Gallo Prep',
        category: 'Cold Prep',
        description: 'Tomato, onion, cilantro, jalapeno, and lime mix for cold-station service.',
        unit: 'quarts',
        currentStock: 10,
        minStock: 12,
        maxStock: 32,
        stockLevel: 'low',
        costPerUnit: 4.1,
        supplier: 'Fresh Produce Route',
        lastOrdered: '2026-04-01',
        expiryDate: '2026-04-30',
        location: 'Cold Station - Rail 2',
        usedInCourses: ["Uncle Julio's Kitchen Operations"],
        hazardous: false,
        msdsAvailable: false,
      },
      {
        id: 'uj-ingredient-3',
        name: 'Salsa Roja',
        category: 'Sauces',
        description: 'House red salsa batch for service timing and holding-temperature checks.',
        unit: 'quarts',
        currentStock: 22,
        minStock: 8,
        maxStock: 28,
        stockLevel: 'full',
        costPerUnit: 3.2,
        supplier: 'Prep Kitchen',
        lastOrdered: '2026-04-02',
        expiryDate: '2026-05-01',
        location: 'Walk-In - Sauce Rack',
        usedInCourses: ["Uncle Julio's Kitchen Operations"],
        hazardous: false,
        msdsAvailable: false,
      },
      {
        id: 'uj-ingredient-4',
        name: 'Sanitizer Test Strips',
        category: 'Sanitation',
        description: 'Quat sanitizer test strips for station-opening and service safety checks.',
        unit: 'strips',
        currentStock: 0,
        minStock: 50,
        maxStock: 200,
        stockLevel: 'out',
        costPerUnit: 0.08,
        supplier: 'Restaurant Supply',
        lastOrdered: '2026-03-15',
        location: 'Manager Office - Safety Bin',
        usedInCourses: ["Uncle Julio's Kitchen Operations"],
        hazardous: false,
        msdsAvailable: true,
      },
    ],
  },
};

export function getResourcePackId(value: string | null): ResourcePackId {
  return value === 'uncle-julios' ? 'uncle-julios' : 'linux';
}

export function getResourcePack(value: string | null): ResourcePack {
  return resourcePacks[getResourcePackId(value)];
}

export function withResourcePack(href: string, packId: ResourcePackId): string {
  return `${href}?pack=${packId}`;
}
