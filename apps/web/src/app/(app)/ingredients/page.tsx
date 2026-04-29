'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/ui/page-header';
import { DataTableShell } from '@/components/ui/data-table-shell';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/ui/stat-card';
import {
  FlaskConical,
  Package,
  AlertTriangle,
  TrendingDown,
  Plus,
  ShoppingCart,
  Edit,
  BarChart3,
  Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getResourcePack,
  type IngredientResource as Ingredient,
  type StockLevel,
} from '@/lib/pack-resources';

const stockConfig: Record<StockLevel, { label: string; className: string; bgClass: string }> = {
  full: {
    label: 'Full',
    className: 'text-green-600',
    bgClass: 'bg-green-100 dark:bg-green-900/50',
  },
  adequate: {
    label: 'Adequate',
    className: 'text-blue-600',
    bgClass: 'bg-blue-100 dark:bg-blue-900/50',
  },
  low: {
    label: 'Low',
    className: 'text-yellow-600',
    bgClass: 'bg-yellow-100 dark:bg-yellow-900/50',
  },
  critical: {
    label: 'Critical',
    className: 'text-orange-600',
    bgClass: 'bg-orange-100 dark:bg-orange-900/50',
  },
  out: {
    label: 'Out of Stock',
    className: 'text-red-600',
    bgClass: 'bg-red-100 dark:bg-red-900/50',
  },
};

export default function IngredientsPage() {
  const searchParams = useSearchParams();
  const resourcePack = getResourcePack(searchParams.get('pack'));
  const ingredients = resourcePack.ingredients;
  const categories = ['All', ...Array.from(new Set(ingredients.map((i) => i.category)))];
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    setCategory('All');
  }, [resourcePack.id]);

  const filteredIngredients = ingredients.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All' || item.category === category;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    total: ingredients.length,
    lowStock: ingredients.filter((i) => i.stockLevel === 'low' || i.stockLevel === 'critical')
      .length,
    outOfStock: ingredients.filter((i) => i.stockLevel === 'out').length,
    totalValue: ingredients.reduce((sum, i) => sum + i.currentStock * i.costPerUnit, 0),
  };

  const alertItems = ingredients.filter(
    (i) => i.stockLevel === 'low' || i.stockLevel === 'critical' || i.stockLevel === 'out'
  );

  return (
    <div className="space-y-6 page-transition">
      <PageHeader
        title={resourcePack.pages.ingredients.title}
        description={resourcePack.pages.ingredients.description}
        icon={FlaskConical}
        actions={
          <div className="flex gap-2">
            <Button variant="outline">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Order Report
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {resourcePack.pages.ingredients.action}
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Package} label="Total Items" value={stats.total} color="blue" />
        <StatCard
          icon={TrendingDown}
          label="Low Stock"
          value={stats.lowStock}
          color="yellow"
          change="Need reorder"
          trend="down"
        />
        <StatCard icon={AlertTriangle} label="Out of Stock" value={stats.outOfStock} color="red" />
        <StatCard
          icon={BarChart3}
          label="Inventory Value"
          value={`$${stats.totalValue.toFixed(0)}`}
          color="green"
        />
      </div>

      {/* Low Stock Alerts */}
      {alertItems.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="h-4 w-4" />
              Stock Alerts ({alertItems.length} items)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {alertItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-md border border-yellow-200 bg-white p-2 dark:border-yellow-800 dark:bg-card"
                >
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.currentStock} / {item.minStock} {item.unit} min
                    </p>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-medium',
                      stockConfig[item.stockLevel].className,
                      stockConfig[item.stockLevel].bgClass
                    )}
                  >
                    {stockConfig[item.stockLevel].label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search & Filter */}
      <DataTableShell
        searchPlaceholder="Search ingredients and materials..."
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
        {filteredIngredients.length === 0 ? (
          <EmptyState
            icon={FlaskConical}
            title={resourcePack.pages.ingredients.emptyTitle}
            description="Try adjusting your search or filters"
          />
        ) : viewMode === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredIngredients.map((item) => (
              <IngredientCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Category</th>
                  <th className="pb-2 pr-4">Stock</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Location</th>
                  <th className="pb-2 pr-4">Cost/Unit</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredIngredients.map((item) => (
                  <IngredientRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataTableShell>
    </div>
  );
}

function IngredientCard({ item }: { item: Ingredient }) {
  const stockPercent = Math.min(100, (item.currentStock / item.maxStock) * 100);
  const config = stockConfig[item.stockLevel];

  return (
    <Card className="card-hover overflow-hidden">
      <CardContent className="p-0">
        <div className={cn('flex h-3 w-full', config.bgClass)} />
        <div className="p-4">
          <div className="mb-2 flex items-start justify-between">
            <div>
              <h3 className="font-semibold">{item.name}</h3>
              <p className="text-xs text-muted-foreground">{item.category}</p>
            </div>
            {item.hazardous && (
              <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-900/50 dark:text-red-400">
                <AlertTriangle className="h-3 w-3" />
                Hazardous
              </span>
            )}
          </div>
          <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>

          {/* Stock Level */}
          <div className="mb-3">
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-muted-foreground">
                {item.currentStock} / {item.maxStock} {item.unit}
              </span>
              <span className={cn('font-medium', config.className)}>{config.label}</span>
            </div>
            <Progress value={stockPercent} className="h-1.5" />
          </div>

          {/* Meta */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              ${item.costPerUnit.toFixed(2)}/{item.unit}
            </span>
            <span>{item.location}</span>
          </div>

          {item.expiryDate && (
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Timer className="h-3 w-3" />
              Expires: {new Date(item.expiryDate).toLocaleDateString()}
            </div>
          )}

          {/* Course Usage */}
          {item.usedInCourses.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {item.usedInCourses.slice(0, 2).map((course) => (
                <span
                  key={course}
                  className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  {course}
                </span>
              ))}
              {item.usedInCourses.length > 2 && (
                <span className="text-[10px] text-muted-foreground">
                  +{item.usedInCourses.length - 2} more
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function IngredientRow({ item }: { item: Ingredient }) {
  const config = stockConfig[item.stockLevel];

  return (
    <tr className="border-b text-sm hover:bg-muted/50">
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.name}</span>
          {item.hazardous && <AlertTriangle className="h-3 w-3 text-red-500" />}
        </div>
      </td>
      <td className="py-3 pr-4 text-muted-foreground">{item.category}</td>
      <td className="py-3 pr-4">
        {item.currentStock} {item.unit}
      </td>
      <td className="py-3 pr-4">
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            config.className,
            config.bgClass
          )}
        >
          {config.label}
        </span>
      </td>
      <td className="py-3 pr-4 text-muted-foreground">{item.location}</td>
      <td className="py-3 pr-4">${item.costPerUnit.toFixed(2)}</td>
      <td className="py-3">
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Edit className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <ShoppingCart className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
