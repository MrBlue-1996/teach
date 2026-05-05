import type { LucideIcon } from 'lucide-react';
import { FlaskConical } from 'lucide-react';
import uncleJuliosResourcePack from '../../../../content-packs/resource-packs/uncle-julios.json';

export type ResourcePackId = 'uncle-julios';
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
  schemaVersion: string;
  version: string;
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
}> = [{ id: 'uncle-julios', title: uncleJuliosResourcePack.shortTitle, icon: FlaskConical }];

export const resourcePacks: Record<ResourcePackId, ResourcePack> = {
  'uncle-julios': uncleJuliosResourcePack as ResourcePack,
};

export function getResourcePackId(_value: string | null): ResourcePackId {
  return 'uncle-julios';
}

export function getResourcePack(value: string | null): ResourcePack {
  return resourcePacks[getResourcePackId(value)];
}

export function withResourcePack(href: string, packId: ResourcePackId): string {
  return `${href}?pack=${packId}`;
}
