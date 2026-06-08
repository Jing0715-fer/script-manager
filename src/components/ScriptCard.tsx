'use client';

import React, { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Play, Loader2, Heart, Eye, Pencil, Trash2, Copy, GitCompareArrows, CopyPlus,
  Sliders, FileOutput, FileInput, CheckCircle2, GripVertical, FileCode,
  HardDrive, Calendar, Tag, Star, Check, X, Pin, Code, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { catDotColors, langAccentColors } from '@/lib/shared-constants';
import { LanguageIcon } from '@/components/LanguageIcon';
import type { ScriptData } from '@/types';

// ─── Language Badge Colors ──────────────────────────────────────────
const langAccentTextColors: Record<string, string> = {
  python: 'text-white',
  bash: 'text-amber-950',
  shell: 'text-amber-950',
  javascript: 'text-yellow-950',
  typescript: 'text-white',
  r: 'text-white',
  perl: 'text-white',
  ruby: 'text-white',
  java: 'text-orange-950',
  go: 'text-white',
  rust: 'text-orange-950',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ─── Search Highlight Helper ──────────────────────────────────────
export function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || !query.trim()) return text;
  const q = query.trim().toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-emerald-200/70 dark:bg-emerald-800/50 text-inherit rounded-sm px-0.5">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

// ─── Script Info Tooltip Content ──────────────────────────────────
function ScriptInfoTooltip({ script }: { script: ScriptData }) {
  const fileSize = formatBytes(new TextEncoder().encode(script.content || '').byteLength);
  const createdDate = new Date(script.createdAt).toLocaleDateString();
  const wordCount = (script.content || '').split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-2 p-1 min-w-[220px]">
      <div className="space-y-0.5">
        <p className="text-[10px] font-semibold text-foreground">{script.name}</p>
        <p className="text-[10px] text-muted-foreground leading-relaxed">{script.description || 'No description'}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1.5 border-t border-border/50">
        <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <FileCode className="size-2.5 shrink-0" />{script.filename}
        </div>
        <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <HardDrive className="size-2.5 shrink-0" />{fileSize}
        </div>
        <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <Calendar className="size-2.5 shrink-0" />{createdDate}
        </div>
        <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <Tag className="size-2.5 shrink-0" />{script.language} &middot; {script.category}
        </div>
      </div>
      <p className="text-[9px] text-muted-foreground/60 pt-0.5 border-t border-border/50">{wordCount} words &middot; {script.content?.split('\n').length || 0} lines</p>
    </div>
  );
}

// ─── Simple Checkbox (no framer-motion) ──────────────────────────────
function SimpleCheckbox({ checked, onCheckedChange, className }: { checked: boolean; onCheckedChange: (v: boolean) => void; className?: string }) {
  return (
    <div className="relative">
      <Checkbox
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={className}
      />
      {checked && (
        <div className="absolute inset-0 rounded-md ring-2 ring-amber-500/50 pointer-events-none" />
      )}
    </div>
  );
}

// ─── Script Card Inner Component ─────────────────────────────────
export function ScriptCardInner({
  script, isSelected, isFavorite, isBatchSelected, isPinned = false, viewMode, onSelect, onDelete, onToggleFavorite, onDuplicate, onQuickRun, onToggleBatch, onCompare, onCopyContent, quickRunning, focused = false, dragHandleProps, searchQuery = '', isCustomSort = false, onRenamed, healthScore = 0, lastRunDuration = 0, lastRunStatus = null, recentDurations = [], sparklineLoading = false, onRate, batchMode = false,
}: {
  script: ScriptData; isSelected: boolean; isFavorite: boolean; isBatchSelected: boolean; isPinned?: boolean; viewMode: string;
  onSelect: () => void; onDelete: () => void; onToggleFavorite: () => void;
  onDuplicate: () => void; onQuickRun: () => void; onToggleBatch: () => void;
  onCompare: () => void; onCopyContent: () => void; quickRunning: boolean; focused?: boolean;
  dragHandleProps?: any; searchQuery?: string; isCustomSort?: boolean; onRenamed?: (id: string, name: string) => void;
  healthScore?: number; lastRunDuration?: number; lastRunStatus?: 'success' | 'error' | 'running' | null;
  recentDurations?: number[]; sparklineLoading?: boolean; onRate?: (id: string, rating: number) => void;
  batchMode?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [copiedFilename, setCopiedFilename] = useState(false);
  const [runConfirmId, setRunConfirmId] = useState<string | null>(null);

  // Inline rename state
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = React.useRef<HTMLInputElement>(null);

  // Interactive rating hover state
  const [ratingHover, setRatingHover] = useState(0);

  const s = script;
  const params = useMemo(() => { try { return JSON.parse(s.params || '[]'); } catch { return []; } }, [s.params]);
  const inputFileList = useMemo(() => { try { return JSON.parse(s.inputFiles || '[]'); } catch { return []; } }, [s.inputFiles]);
  const outputFileList = useMemo(() => { try { return JSON.parse(s.outputFiles || '[]'); } catch { return []; } }, [s.outputFiles]);
  const tags = useMemo(() => { try { return JSON.parse(s.tags || '[]'); } catch { return []; } }, [s.tags]);
  const hasRuns = (s._count?.executions || 0) > 0;
  const relativeTime = formatDistanceToNow(new Date(s.createdAt), { addSuffix: true });
  const createdDate = new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const langGradient = langAccentColors[s.language?.toLowerCase()] || 'bg-gray-500';

  const handleCardClick = React.useCallback(() => {
    onSelect();
  }, [onSelect]);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  // Two-click run confirmation
  const handleQuickRunClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (runConfirmId === s.id) {
      onQuickRun();
      setRunConfirmId(null);
    } else {
      setRunConfirmId(s.id);
      setTimeout(() => setRunConfirmId(null), 3000);
    }
  };

  // Double-click to rename
  const handleNameDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRenaming(true);
    setRenameValue(s.name);
    setTimeout(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }, 50);
  };

  const confirmRename = async () => {
    const newName = renameValue.trim();
    if (!newName || newName === s.name) {
      setIsRenaming(false);
      return;
    }
    try {
      const r = await fetch(`/api/scripts/${s.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (!r.ok) throw new Error('Rename failed');
      toast.success(`Renamed to "${newName}"`);
      onRenamed?.(s.id, newName);
    } catch {
      toast.error('Failed to rename script');
    }
    setIsRenaming(false);
  };

  const cancelRename = () => {
    setIsRenaming(false);
    setRenameValue('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); confirmRename(); }
    if (e.key === 'Escape') { e.preventDefault(); cancelRename(); }
  };

  const lineCount = s.content?.split('\n').length || 0;
  const fileSize = formatBytes(new TextEncoder().encode(s.content || '').byteLength);

  // ─── LIST VIEW ─────────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`flex items-center gap-2 sm:gap-3 rounded-xl border bg-card p-2 sm:p-3 cursor-pointer transition-colors duration-150 group relative overflow-hidden ${
              isSelected
                ? 'ring-2 ring-emerald-500 border-emerald-500/50'
                : 'hover:bg-muted/30 hover:border-emerald-500/30'
            } ${isBatchSelected ? 'ring-2 ring-amber-500/50 bg-amber-50/50 dark:bg-amber-950/10' : ''} ${focused ? 'ring-2 ring-emerald-500/70' : ''} ${quickRunning ? 'ring-2 ring-emerald-500/30 animate-pulse' : ''}`}
            onClick={handleCardClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {/* Left accent bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl ${langGradient} ${hovered || isSelected ? 'opacity-100' : 'opacity-40'}`} />

            {/* Batch checkmark */}
            {batchMode && isBatchSelected && (
              <div className="absolute top-2 right-2 z-10">
                <div className="size-5 rounded-full bg-amber-500 flex items-center justify-center shadow">
                  <Check className="size-3 text-white" />
                </div>
              </div>
            )}

            {/* Drag handle */}
            {dragHandleProps && (
              <div className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors" {...dragHandleProps}>
                <GripVertical className="size-4" />
              </div>
            )}

            {/* Batch checkbox */}
            {batchMode && (
              <div className="shrink-0 flex items-center" onClick={e => e.stopPropagation()}>
                <SimpleCheckbox checked={isBatchSelected} onCheckedChange={onToggleBatch} className="size-3.5" />
              </div>
            )}

            {/* Language icon */}
            <div className={`size-7 sm:size-9 rounded-lg bg-gradient-to-br ${langGradient} flex items-center justify-center shrink-0 shadow-sm`}>
              <LanguageIcon language={s.language} className="text-xs sm:text-sm" onGradient />
            </div>

            {/* Name + description */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 sm:gap-2">
                {isRenaming ? (
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={handleRenameKeyDown}
                      onBlur={cancelRename}
                      className="text-sm font-semibold bg-muted border border-emerald-500/50 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-emerald-500 w-full"
                    />
                  </div>
                ) : (
                  <h3 className="text-xs sm:text-sm font-semibold truncate flex items-center gap-1" onDoubleClick={handleNameDoubleClick}>
                    {isPinned && <Pin className="size-2.5 text-emerald-500 fill-current shrink-0" />}
                    {highlightMatch(s.name, searchQuery)}
                    {hovered && <Pencil className="size-2.5 text-muted-foreground/40 hover:text-emerald-500 transition-colors shrink-0" />}
                  </h3>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{highlightMatch(s.description || 'No description', searchQuery)}</p>
              <div className="flex items-center gap-1 sm:gap-2 mt-0.5">
                <span className="text-[9px] sm:text-[10px] text-muted-foreground/60" suppressHydrationWarning>{relativeTime}</span>
                <span className="hidden sm:flex items-center gap-0.5 text-[10px] text-muted-foreground/60">
                  <Code className="size-2.5" />{lineCount} line{lineCount !== 1 ? 's' : ''}
                </span>
                {hasRuns && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-2.5" />{s._count?.executions ?? 0} run{(s._count?.executions ?? 0) !== 1 ? 's' : ''}
                    {lastRunDuration > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/60">
                        <Clock className="size-2" />{lastRunDuration >= 1000 ? `${(lastRunDuration / 1000).toFixed(1)}s` : `${lastRunDuration}ms`}
                      </span>
                    )}
                  </span>
                )}
                {focused && <span className="text-[9px] text-emerald-600 dark:text-emerald-400 ml-1">↑↓</span>}
              </div>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <span className={`inline-flex items-center text-[8px] sm:text-[9px] h-4 px-1 sm:px-1.5 rounded-full font-medium leading-none ${langGradient} ${langAccentTextColors[s.language?.toLowerCase()] || 'text-white'}`}>
                {s.language}
              </span>
              <span className="hidden sm:inline-flex items-center text-[9px] h-4 px-1 rounded-full bg-muted text-muted-foreground leading-none">
                {s.category}
              </span>
              {params.length > 0 && (
                <Tooltip><TooltipTrigger asChild><span className="hidden sm:inline-flex items-center text-[9px] h-4 px-1.5 gap-0.5 rounded-full bg-muted/50 text-muted-foreground"><Sliders className="size-2" />{params.length}</span></TooltipTrigger><TooltipContent>{params.length} parameter{params.length !== 1 ? 's' : ''}</TooltipContent></Tooltip>
              )}
              {(inputFileList.length > 0 || outputFileList.length > 0) && (
                <div className="hidden sm:flex items-center gap-0.5">
                  {inputFileList.length > 0 && <Tooltip><TooltipTrigger asChild><span className="flex items-center text-muted-foreground/60 hover:text-sky-500"><FileInput className="size-3" /></span></TooltipTrigger><TooltipContent>Has input files</TooltipContent></Tooltip>}
                  {outputFileList.length > 0 && <Tooltip><TooltipTrigger asChild><span className="flex items-center text-muted-foreground/60 hover:text-amber-500"><FileOutput className="size-3" /></span></TooltipTrigger><TooltipContent>Produces output files</TooltipContent></Tooltip>}
                </div>
              )}
            </div>

            {/* Hover actions */}
            <div className={`hidden sm:flex items-center gap-0.5 transition-opacity duration-150 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
              <Tooltip><TooltipTrigger asChild><Button size="icon-xs" variant="ghost" className={runConfirmId === s.id ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/30' : ''} onClick={handleQuickRunClick}>{quickRunning && runConfirmId !== s.id ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3 text-emerald-600" />}</Button></TooltipTrigger><TooltipContent>{runConfirmId === s.id ? 'Confirm run' : 'Quick Run'}</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button size="icon-xs" variant="ghost" className={isFavorite ? 'text-rose-500' : ''} onClick={e => { e.stopPropagation(); onToggleFavorite(); }}><Heart className={`size-3 ${isFavorite ? 'fill-current' : ''}`} /></Button></TooltipTrigger><TooltipContent>{isFavorite ? 'Unfavorite' : 'Favorite'}</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button size="icon-xs" variant="ghost" onClick={e => { e.stopPropagation(); onCopyContent(); }}><Copy className="size-3" /></Button></TooltipTrigger><TooltipContent>Copy</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button size="icon-xs" variant="ghost" onClick={e => { e.stopPropagation(); onCompare(); }}><GitCompareArrows className="size-3" /></Button></TooltipTrigger><TooltipContent>Compare</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button size="icon-xs" variant="ghost" onClick={e => { e.stopPropagation(); onDuplicate(); }}><CopyPlus className="size-3" /></Button></TooltipTrigger><TooltipContent>Duplicate</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button size="icon-xs" variant="ghost" className="text-destructive" onClick={handleDelete}><Trash2 className="size-3" /></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" align="start" className="max-w-[280px]">
          <ScriptInfoTooltip script={s} />
        </TooltipContent>
      </Tooltip>
    );
  }

  // ─── GRID VIEW ─────────────────────────────────────────────────
  return (
    <div
      className={`relative cursor-pointer rounded-xl border bg-card overflow-hidden transition-colors duration-150 group ${
        isSelected
          ? 'ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/10'
          : 'hover:shadow-md hover:border-emerald-500/30'
      } ${isBatchSelected ? 'ring-2 ring-amber-500/50 bg-amber-50/50 dark:bg-amber-950/10' : ''} ${focused ? 'ring-2 ring-emerald-500/70' : ''} ${quickRunning ? 'ring-2 ring-emerald-500/30 animate-pulse' : ''}`}
      onClick={handleCardClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Category color strip at top */}
      <div className={`h-1 w-full ${catDotColors[s.category] || 'bg-gray-400'}`} />

      {/* Batch checkbox */}
      {batchMode && (
        <div className="absolute top-3 left-3 z-10" onClick={e => e.stopPropagation()}>
          <SimpleCheckbox checked={isBatchSelected} onCheckedChange={onToggleBatch} className="size-4 bg-background/90 border-border shadow-sm" />
        </div>
      )}

      {/* Batch checkmark overlay */}
      {batchMode && isBatchSelected && (
        <div className="absolute top-3 left-3 z-20 pointer-events-none">
          <div className="size-5 rounded-full bg-amber-500 flex items-center justify-center shadow -translate-x-0.5 -translate-y-0.5">
            <Check className="size-3 text-white" />
          </div>
        </div>
      )}

      {/* Left accent bar */}
      <div className={`absolute top-1 left-0 bottom-0 w-[3px] rounded-l-xl ${langGradient} ${hovered || isSelected ? 'opacity-100' : 'opacity-40'}`} />

      {/* Card content */}
      <div className="p-3 sm:p-4">
        {/* Header row: icon + name + favorite */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`size-8 rounded-lg bg-gradient-to-br ${langGradient} flex items-center justify-center shrink-0 shadow-sm`}>
              <LanguageIcon language={s.language} className="text-sm" onGradient />
            </div>
            <div className="min-w-0">
              {isRenaming ? (
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={handleRenameKeyDown}
                    onBlur={cancelRename}
                    className="text-sm font-semibold bg-muted border border-emerald-500/50 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-emerald-500 w-full"
                  />
                  <button onClick={(e) => { e.stopPropagation(); confirmRename(); }} className="p-0.5 text-emerald-600 hover:bg-emerald-50 rounded"><Check className="size-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); cancelRename(); }} className="p-0.5 text-muted-foreground hover:bg-muted rounded"><X className="size-3" /></button>
                </div>
              ) : (
                <h3 className="text-xs sm:text-sm font-semibold truncate flex items-center gap-1.5" onDoubleClick={handleNameDoubleClick}>
                  {isPinned && <Pin className="size-2.5 text-emerald-500 fill-current shrink-0" />}
                  {healthScore > 0 && (
                    <span className={`size-2 shrink-0 rounded-full ${healthScore >= 80 ? 'bg-emerald-500' : healthScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} title={`Health: ${healthScore}/100`} />
                  )}
                  {highlightMatch(s.name, searchQuery)}
                  {hovered && !isRenaming && <Pencil className="size-2.5 text-muted-foreground/30 shrink-0" />}
                </h3>
              )}
              <div className="flex items-center gap-1 sm:gap-1.5 mt-0.5">
                <FileCode className="size-2.5 text-muted-foreground/50" />
                <span className="text-[9px] text-muted-foreground truncate max-w-[80px] sm:max-w-[120px]">{s.filename}</span>
                <span className={`size-1.5 rounded-full shrink-0 ${catDotColors[s.category] || 'bg-gray-400'}`} />
                {/* Source badge */}
                {s.source && s.source !== 'manual' && (
                  <span className={`inline-flex items-center text-[8px] h-3.5 px-1.5 rounded-full font-medium leading-none ${
                    s.source === 'github' ? 'bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400'
                    : s.source === 'demo' ? 'bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}>
                    {s.source === 'github' ? 'GH' : s.source === 'demo' ? 'DM' : s.source.slice(0, 2).toUpperCase()}
                  </span>
                )}
                {/* Language badge */}
                <span className={`inline-flex items-center text-[9px] h-4 px-2 rounded-full font-medium leading-none ${langGradient} ${langAccentTextColors[s.language?.toLowerCase()] || 'text-white'}`}>
                  {s.language}
                </span>
              </div>
            </div>
          </div>
          {isFavorite && <Heart className="size-3.5 text-rose-500 fill-current shrink-0" />}
        </div>

        {/* Description */}
        <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 mb-2 min-h-[1.5rem] sm:min-h-[2rem]">
          {highlightMatch(s.description || 'No description provided', searchQuery)}
        </p>

        {/* Rating stars */}
        <div className="hidden sm:flex items-center gap-0.5 mb-2" onClick={e => e.stopPropagation()}>
          {[1, 2, 3, 4, 5].map(star => {
            const displayRating = ratingHover || Math.round(s.rating || 0);
            const filled = star <= displayRating;
            return (
              <button
                key={star}
                className={`p-0 rounded-sm transition-colors duration-100 ${filled ? 'text-amber-400' : 'text-muted-foreground/20 hover:text-amber-300'}`}
                onMouseEnter={() => setRatingHover(star)}
                onMouseLeave={() => setRatingHover(0)}
                onClick={(e) => {
                  e.stopPropagation();
                  const newRating = star === Math.round(s.rating || 0) ? 0 : star;
                  onRate?.(s.id, newRating);
                }}
              >
                <Star className={`size-3 ${filled ? 'fill-current' : ''}`} />
              </button>
            );
          })}
          {((s.rating ?? 0) > 0 || ratingHover > 0) && (
            <span className="text-[9px] text-muted-foreground ml-1 tabular-nums">
              {ratingHover > 0 ? ratingHover.toFixed(1) : (s.rating || 0).toFixed(1)}
            </span>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.slice(0, 3).map((tag: string) => (
              <Badge key={tag} variant="secondary" className="text-[9px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && <Badge variant="outline" className="text-[9px] text-muted-foreground">+{tags.length - 3}</Badge>}
          </div>
        )}

        {/* Info row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/60" suppressHydrationWarning>{relativeTime}</span>
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/60">
              <Code className="size-2.5" />{lineCount}L
            </span>
            <span className="text-[10px] text-muted-foreground/60">{fileSize}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {hasRuns && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3" />{s._count?.executions ?? 0}
                {lastRunDuration > 0 && <span className="text-muted-foreground/60">· {lastRunDuration >= 1000 ? `${(lastRunDuration / 1000).toFixed(1)}s` : `${lastRunDuration}ms`}</span>}
              </span>
            )}
            {lastRunStatus && (
              <span className={`size-2.5 rounded-full ${
                lastRunStatus === 'success' ? 'bg-emerald-500' :
                lastRunStatus === 'error' ? 'bg-red-500' :
                'bg-amber-400'
              }`} title={lastRunStatus} />
            )}
            {params.length > 0 && <span className="text-[9px] text-muted-foreground"><Sliders className="size-2.5 inline mr-0.5" />{params.length}</span>}
          </div>
        </div>
      </div>

      {/* Single hover action bar - appears on hover, overlaid at bottom */}
      {hovered && (
        <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center gap-0.5 px-2 py-1.5 bg-background/95 backdrop-blur-sm border-t border-border/30">
          <Button
            size="xs"
            className={`gap-0.5 text-[10px] h-6 px-1.5 ${
              runConfirmId === s.id ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
            onClick={handleQuickRunClick}
            disabled={quickRunning}
          >
            {runConfirmId === s.id ? <><Play className="size-2.5" />OK?</> : quickRunning ? <><Loader2 className="size-2.5 animate-spin" />...</> : <><Play className="size-2.5" />Run</>}
          </Button>
          <Tooltip><TooltipTrigger asChild><Button size="icon-xs" variant="ghost" className={isFavorite ? 'text-rose-500' : ''} onClick={e => { e.stopPropagation(); onToggleFavorite(); }}><Heart className={`size-2.5 ${isFavorite ? 'fill-current' : ''}`} /></Button></TooltipTrigger><TooltipContent>{isFavorite ? 'Unfavorite' : 'Favorite'}</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button size="icon-xs" variant="ghost" onClick={e => { e.stopPropagation(); onCopyContent(); }}><Copy className="size-2.5" /></Button></TooltipTrigger><TooltipContent>Copy</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button size="icon-xs" variant="ghost" onClick={e => { e.stopPropagation(); onCompare(); }}><GitCompareArrows className="size-2.5" /></Button></TooltipTrigger><TooltipContent>Compare</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button size="icon-xs" variant="ghost" onClick={e => { e.stopPropagation(); onDuplicate(); }}><CopyPlus className="size-2.5" /></Button></TooltipTrigger><TooltipContent>Duplicate</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button size="icon-xs" variant="ghost" onClick={e => { e.stopPropagation(); onSelect(); }}><Eye className="size-2.5" /></Button></TooltipTrigger><TooltipContent>View</TooltipContent></Tooltip>
          <div className="flex-1" />
          <Tooltip><TooltipTrigger asChild><Button size="icon-xs" variant="ghost" className="text-destructive" onClick={handleDelete}><Trash2 className="size-2.5" /></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>
        </div>
      )}

      {/* Metadata panel (shown instead of card flip) */}
      {hovered && (
        <div className="absolute top-1 right-1 z-10">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="size-5 rounded-md bg-background/90 border border-border/50 flex items-center justify-center text-muted-foreground/60 hover:text-emerald-500 transition-colors shadow-sm"
                onClick={(e) => { e.stopPropagation(); onSelect(); }}
                aria-label="View details"
              >
                <Eye className="size-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent>View details</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

// ─── Sortable List Item ──────────────────────────────────────────
export function ScriptCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-3 sm:p-4 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="size-8 rounded-lg bg-muted" />
        <div className="flex-1">
          <div className="h-3 w-2/3 rounded bg-muted mb-1.5" />
          <div className="h-2 w-1/2 rounded bg-muted" />
        </div>
      </div>
      <div className="h-2 w-full rounded bg-muted mb-2" />
      <div className="flex gap-1.5">
        <div className="h-4 w-12 rounded-full bg-muted" />
        <div className="h-4 w-16 rounded-full bg-muted" />
      </div>
    </div>
  );
}

export function SortableScriptCard({
  script, isSelected, isFavorite, isBatchSelected, isPinned = false, viewMode, onSelect, onDelete, onToggleFavorite, onDuplicate, onQuickRun, onToggleBatch, onCompare, onCopyContent, quickRunning, focused = false, searchQuery = '', isCustomSort = false, onRenamed, healthScore = 0, lastRunDuration = 0, lastRunStatus = null, recentDurations = [], sparklineLoading = false, onRate, batchMode = false,
}: {
  script: ScriptData; isSelected: boolean; isFavorite: boolean; isBatchSelected: boolean; isPinned?: boolean; viewMode: string;
  onSelect: () => void; onDelete: () => void; onToggleFavorite: () => void;
  onDuplicate: () => void; onQuickRun: () => void; onToggleBatch: () => void;
  onCompare: () => void; onCopyContent: () => void; quickRunning: boolean; focused?: boolean; searchQuery?: string; isCustomSort?: boolean; onRenamed?: (id: string, name: string) => void;
  healthScore?: number; lastRunDuration?: number; lastRunStatus?: 'success' | 'error' | 'running' | null;
  recentDurations?: number[]; sparklineLoading?: boolean; onRate?: (id: string, rating: number) => void;
  batchMode?: boolean;
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: script.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div {...attributes}>
        <ScriptCardInner
          script={script} isSelected={isSelected} isFavorite={isFavorite} isBatchSelected={isBatchSelected} isPinned={isPinned}
          viewMode={viewMode} onSelect={onSelect} onDelete={onDelete} onToggleFavorite={onToggleFavorite}
          onDuplicate={onDuplicate} onQuickRun={onQuickRun} onToggleBatch={onToggleBatch}
          onCompare={onCompare} onCopyContent={onCopyContent} quickRunning={quickRunning} focused={focused}
          dragHandleProps={listeners} searchQuery={searchQuery} isCustomSort={isCustomSort} onRenamed={onRenamed}
          healthScore={healthScore} lastRunDuration={lastRunDuration} lastRunStatus={lastRunStatus} recentDurations={recentDurations} sparklineLoading={sparklineLoading} onRate={onRate}
          batchMode={batchMode}
        />
      </div>
    </div>
  );
}
