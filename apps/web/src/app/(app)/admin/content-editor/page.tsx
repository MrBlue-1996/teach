/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useRole } from '@/hooks/use-role';
import {
  adminApi,
  type AdminContentPack,
  type AdminContentBlock,
  type AdminPackDetail,
} from '@/lib/api';
import {
  FileEdit,
  ChevronDown,
  ChevronRight,
  Loader2,
  Save,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Inline text area for editing multi-line content
// ---------------------------------------------------------------------------
function EditableTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none ${className}`}
    />
  );
}

// ---------------------------------------------------------------------------
// Block editor row
// ---------------------------------------------------------------------------
function BlockEditor({
  block,
  packId,
  onSaved,
}: {
  block: AdminContentBlock;
  packId: string;
  onSaved: (updated: AdminContentBlock) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState(block.title);
  const [objective, setObjective] = useState(block.objective ?? '');
  const [contentStr, setContentStr] = useState(
    typeof block.content === 'string' ? block.content : JSON.stringify(block.content, null, 2)
  );

  // Re-sync state whenever the block prop updates (e.g. after save or parent refresh)
  useEffect(() => {
    setTitle(block.title);
    setObjective(block.objective ?? '');
    setContentStr(
      typeof block.content === 'string' ? block.content : JSON.stringify(block.content, null, 2)
    );
  }, [block]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const originalContentStr =
    typeof block.content === 'string' ? block.content : JSON.stringify(block.content, null, 2);
  const dirty =
    title !== block.title ||
    objective !== (block.objective ?? '') ||
    contentStr !== originalContentStr;

  async function handleSave() {
    setSaveStatus('saving');
    setErrorMsg('');
    try {
      let content: unknown = contentStr;
      try {
        content = JSON.parse(contentStr);
      } catch {
        // keep as raw string if not valid JSON
      }
      const res = await adminApi.updateBlock(packId, block.id, {
        ...(title !== block.title ? { title } : {}),
        ...(objective !== (block.objective ?? '') ? { objective } : {}),
        ...(contentStr !== originalContentStr ? { content } : {}),
      });
      onSaved(res.block);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err) {
      setSaveStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Save failed');
    }
  }

  return (
    <div className="rounded-md border">
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="flex-1 font-medium text-sm truncate">{title}</span>
        <span className="text-xs text-muted-foreground shrink-0">
          #{block.sequenceOrder} · {block.targetMode}
        </span>
        {dirty && (
          <span
            className="ml-2 h-2 w-2 rounded-full bg-amber-500 shrink-0"
            title="Unsaved changes"
          />
        )}
      </button>

      {/* Edit panel */}
      {expanded && (
        <div className="border-t p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          {/* Objective */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Objective
            </label>
            <EditableTextarea
              value={objective}
              onChange={setObjective}
              placeholder="Learning objective..."
              rows={2}
            />
          </div>

          {/* Content (JSON) */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Content (JSON)
            </label>
            <EditableTextarea
              value={contentStr}
              onChange={setContentStr}
              placeholder="{}"
              rows={8}
              className="font-mono text-xs"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={handleSave} disabled={!dirty || saveStatus === 'saving'}>
              {saveStatus === 'saving' ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="mr-2 h-3 w-3" />
                  Save Block
                </>
              )}
            </Button>
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="h-3 w-3" /> Saved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1 text-xs text-destructive">
                <AlertTriangle className="h-3 w-3" /> {errorMsg}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pack row with inline metadata editing + expandable blocks
// ---------------------------------------------------------------------------
function PackEditor({
  pack: initialPack,
  onSaved,
}: {
  pack: AdminContentPack;
  onSaved: (updated: AdminContentPack) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<AdminPackDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Editable fields
  const [title, setTitle] = useState(initialPack.title);
  const [description, setDescription] = useState(initialPack.description ?? '');
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>(
    (initialPack.status as 'draft' | 'published' | 'archived') ?? 'draft'
  );
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const dirty =
    title !== initialPack.title ||
    description !== (initialPack.description ?? '') ||
    status !== initialPack.status;

  // Re-sync draft state whenever the pack prop updates (e.g. after refresh)
  useEffect(() => {
    setTitle(initialPack.title);
    setDescription(initialPack.description ?? '');
    setStatus((initialPack.status as 'draft' | 'published' | 'archived') ?? 'draft');
  }, [initialPack]);

  async function loadDetail() {
    setLoadingDetail(true);
    try {
      const res = await adminApi.getContentPack(initialPack.id);
      setDetail(res.pack);
    } catch {
      // ignore — blocks simply won't show
    } finally {
      setLoadingDetail(false);
    }
  }

  function handleToggle() {
    setExpanded((v) => {
      if (!v && !detail) {
        void loadDetail();
      }
      return !v;
    });
  }

  async function handleSavePack() {
    setSaveStatus('saving');
    setErrorMsg('');
    try {
      const res = await adminApi.updateContentPack(initialPack.id, {
        ...(title !== initialPack.title ? { title } : {}),
        ...(description !== (initialPack.description ?? '') ? { description } : {}),
        ...(status !== initialPack.status ? { status } : {}),
      });
      onSaved(res.pack);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err) {
      setSaveStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Save failed');
    }
  }

  function handleBlockSaved(updated: AdminContentBlock) {
    if (!detail) return;
    setDetail({
      ...detail,
      blocks: detail.blocks.map((b) => (b.id === updated.id ? updated : b)),
    });
  }

  const statusColors: Record<string, string> = {
    published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    draft: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    archived: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  };

  return (
    <Card className="overflow-hidden">
      {/* Pack header */}
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        )}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <BookOpen className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{initialPack.slug}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[status] ?? statusColors['draft']}`}
        >
          {status}
        </span>
        {dirty && (
          <span
            className="ml-2 h-2 w-2 rounded-full bg-amber-500 shrink-0"
            title="Unsaved changes"
          />
        )}
      </button>

      {/* Expanded edit panel */}
      {expanded && (
        <div className="border-t">
          {/* Pack metadata editing */}
          <div className="p-4 space-y-4 bg-muted/30">
            <h3 className="text-sm font-semibold">Pack Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Title
                </label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'draft' | 'published' | 'archived')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Description
              </label>
              <EditableTextarea
                value={description}
                onChange={setDescription}
                placeholder="Course description…"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                onClick={handleSavePack}
                disabled={!dirty || saveStatus === 'saving'}
              >
                {saveStatus === 'saving' ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-3 w-3" />
                    Save Pack
                  </>
                )}
              </Button>
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 className="h-3 w-3" /> Saved
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="flex items-center gap-1 text-xs text-destructive">
                  <AlertTriangle className="h-3 w-3" /> {errorMsg}
                </span>
              )}
            </div>
          </div>

          {/* Blocks list */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Blocks</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void loadDetail();
                }}
              >
                <RefreshCw className="mr-2 h-3 w-3" />
                Refresh
              </Button>
            </div>

            {loadingDetail && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading blocks…
              </div>
            )}

            {!loadingDetail && detail && detail.blocks.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">No blocks in this pack yet.</p>
            )}

            {!loadingDetail && detail && (
              <div className="space-y-2">
                {detail.blocks.map((block) => (
                  <BlockEditor
                    key={block.id}
                    block={block}
                    packId={initialPack.id}
                    onSaved={handleBlockSaved}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function ContentEditorPage() {
  const { isSuperuser } = useRole();
  const router = useRouter();
  const [packs, setPacks] = useState<AdminContentPack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isSuperuser) {
      router.replace('/dashboard');
    }
  }, [isSuperuser, router]);

  const loadPacks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getContentPacks();
      setPacks(res.contentPacks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content packs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperuser) {
      void loadPacks();
    }
  }, [isSuperuser, loadPacks]);

  if (!isSuperuser) {
    return null;
  }

  const filtered = packs.filter(
    (p) =>
      search.trim() === '' ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 page-transition">
      <PageHeader
        title="Content Editor"
        description="Edit content packs and learning blocks directly in the app. Changes are saved to the database immediately."
        icon={FileEdit}
      />

      {/* Access badge */}
      {isSuperuser && (
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Superuser — full content access
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search packs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button variant="outline" size="sm" onClick={() => void loadPacks()}>
          <RefreshCw className="mr-2 h-3 w-3" />
          Refresh
        </Button>
      </div>

      {/* Content */}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading content packs…
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="py-12 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            {search ? 'No packs match your search.' : 'No content packs found.'}
          </p>
        </div>
      )}

      {!isLoading && !error && (
        <div className="space-y-4">
          {filtered.map((pack) => (
            <PackEditor
              key={pack.id}
              pack={pack}
              onSaved={(updated) =>
                setPacks((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
