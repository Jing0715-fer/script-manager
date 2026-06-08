'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  GitBranch, GitCompareArrows, RefreshCw, Clock, FileText,
  Hash, ChevronDown, X, ArrowLeft, ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from '@/lib/framer-motion-shim';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { TabEmptyState } from './shared';

// ─── Types ──────────────────────────────────────────────────────

interface VersionEntry {
  id: string;
  content: string;
  lineCount: number;
  message: string | null;
  createdAt: string;
}

interface VersionsTabProps {
  scriptId: string;
  currentContent: string;
}

// ─── Diff computation ───────────────────────────────────────────

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumA?: number;
  lineNumB?: number;
}

function computeLineDiff(textA: string, textB: string): DiffLine[] {
  const linesA = textA.split('\n');
  const linesB = textB.split('\n');
  const result: DiffLine[] = [];

  // Simple LCS-based diff
  const m = linesA.length;
  const n = linesB.length;

  // Build LCS table (only keep 2 rows for memory efficiency)
  let prev = new Array(n + 1).fill(0);
  let curr = new Array(n + 1).fill(0);

  // Track full DP for backtrack
  const dp: number[][] = [];
  for (let i = 0; i <= m; i++) {
    dp.push(new Array(n + 1).fill(0));
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (linesA[i - 1] === linesB[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to produce diff
  const diffLines: DiffLine[] = [];
  let i = m, j = n;
  const stack: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && linesA[i - 1] === linesB[j - 1]) {
      stack.push({ type: 'unchanged', content: linesA[i - 1], lineNumA: i, lineNumB: j });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: 'added', content: linesB[j - 1], lineNumB: j });
      j--;
    } else if (i > 0) {
      stack.push({ type: 'removed', content: linesA[i - 1], lineNumA: i });
      i--;
    }
  }

  stack.reverse();
  return stack;
}

function formatRelative(timestamp: string): string {
  try {
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diffMs = now - then;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return new Date(timestamp).toLocaleDateString();
  } catch {
    return timestamp;
  }
}

// ─── Diff View Component ────────────────────────────────────────

function DiffView({ diffLines, labelA, labelB }: { diffLines: DiffLine[]; labelA: string; labelB: string }) {
  const [showUnchanged, setShowUnchanged] = useState(true);
  const filteredLines = useMemo(() => {
    if (showUnchanged) return diffLines;
    return diffLines.filter(l => l.type !== 'unchanged');
  }, [diffLines, showUnchanged]);

  const addedCount = diffLines.filter(l => l.type === 'added').length;
  const removedCount = diffLines.filter(l => l.type === 'removed').length;
  const unchangedCount = diffLines.filter(l => l.type === 'unchanged').length;

  return (
    <div className="space-y-2">
      {/* Summary */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-[8px] h-4 text-emerald-600 border-emerald-300">+{addedCount} added</Badge>
        <Badge variant="outline" className="text-[8px] h-4 text-red-500 border-red-300">-{removedCount} removed</Badge>
        <Badge variant="outline" className="text-[8px] h-4 text-gray-400 border-gray-300">{unchangedCount} unchanged</Badge>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 text-[9px] ml-auto"
          onClick={() => setShowUnchanged(v => !v)}
        >
          {showUnchanged ? 'Hide unchanged' : 'Show all'}
        </Button>
      </div>

      {/* Diff content */}
      <div className="rounded-lg border overflow-hidden">
        <div className="grid grid-cols-2 border-b bg-muted/30">
          <div className="px-2 py-1 text-[9px] font-medium text-muted-foreground border-r">{labelA}</div>
          <div className="px-2 py-1 text-[9px] font-medium text-muted-foreground">{labelB}</div>
        </div>
        <div className="bg-[#1a1b26] dark:bg-[#0d0e14] font-mono text-[10px] leading-5 overflow-auto max-h-64">
          {filteredLines.map((line, idx) => (
            <div
              key={idx}
              className={`flex ${
                line.type === 'added'
                  ? 'bg-emerald-500/10 border-l-2 border-emerald-500'
                  : line.type === 'removed'
                  ? 'bg-red-500/10 border-l-2 border-red-500'
                  : 'border-l-2 border-transparent'
              }`}
            >
              <span className="w-8 text-right pr-2 text-gray-600 text-[9px] select-none shrink-0">
                {line.type === 'removed' || line.type === 'unchanged' ? line.lineNumA : ''}
              </span>
              <span className="w-8 text-right pr-2 text-gray-600 text-[9px] select-none shrink-0">
                {line.type === 'added' || line.type === 'unchanged' ? line.lineNumB : ''}
              </span>
              <span className={`flex-1 px-2 whitespace-pre ${
                line.type === 'added' ? 'text-emerald-400' : line.type === 'removed' ? 'text-red-400' : 'text-gray-300'
              }`}>
                {line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  '}{line.content || ' '}
              </span>
            </div>
          ))}
          {filteredLines.length === 0 && (
            <div className="p-4 text-center text-gray-500 text-xs">No differences found</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Version Item Component ─────────────────────────────────────

function VersionItem({
  version,
  isSelected,
  isCurrent,
  onSelect,
}: {
  version: VersionEntry;
  isSelected: boolean;
  isCurrent: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-lg border p-2.5 transition-all duration-150 ${
        isSelected
          ? 'border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/20 shadow-sm'
          : 'border-border/50 hover:border-emerald-300/50 hover:bg-muted/30'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          {isCurrent ? (
            <Badge className="text-[8px] h-4 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Current</Badge>
          ) : (
            <Badge variant="outline" className="text-[8px] h-4">
              <GitBranch className="size-2.5 mr-0.5" />
              v{version.id.slice(0, 6)}
            </Badge>
          )}
        </div>
        <span className="text-[9px] text-muted-foreground">{formatRelative(version.createdAt)}</span>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-0.5"><Hash className="size-2.5" />{version.lineCount} lines</span>
        <span className="flex items-center gap-0.5"><FileText className="size-2.5" />{(version.content.length / 1024).toFixed(1)}KB</span>
      </div>
      {version.message && (
        <p className="text-[10px] text-muted-foreground/70 mt-1 truncate">{version.message}</p>
      )}
    </button>
  );
}

// ─── Main VersionsTab Component ─────────────────────────────────

export function VersionsTab({ scriptId, currentContent }: VersionsTabProps) {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [compareResult, setCompareResult] = useState<DiffLine[] | null>(null);
  const [compareLabels, setCompareLabels] = useState<{ a: string; b: string }>({ a: '', b: '' });

  // Fetch versions on mount and when scriptId changes
  useEffect(() => {
    let cancelled = false;
    const doFetch = async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/scripts/${scriptId}/versions?limit=50`);
        if (r.ok && !cancelled) {
          const data = await r.json();
          setVersions(data.versions || []);
        }
      } catch {
        // silently fail
      }
      if (!cancelled) setLoading(false);
    };
    doFetch();
    return () => { cancelled = true; };
  }, [scriptId]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/scripts/${scriptId}/versions?limit=50`);
      if (r.ok) {
        const data = await r.json();
        setVersions(data.versions || []);
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  }, [scriptId]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size > 2) {
        // Remove oldest selection
        const oldest = Array.from(next)[0];
        next.delete(oldest);
      }
      return next;
    });
    setCompareResult(null);
  };

  const handleCompare = () => {
    if (selectedIds.size !== 2) return;
    const ids = Array.from(selectedIds);
    const vA = versions.find(v => v.id === ids[0]);
    const vB = versions.find(v => v.id === ids[1]);
    if (!vA || !vB) return;

    const diff = computeLineDiff(vA.content, vB.content);
    setCompareResult(diff);
    setCompareLabels({
      a: `v${vA.id.slice(0, 6)} (${formatRelative(vA.createdAt)})`,
      b: `v${vB.id.slice(0, 6)} (${formatRelative(vB.createdAt)})`,
    });
  };

  const handleCompareWithCurrent = (versionId: string) => {
    const v = versions.find(ver => ver.id === versionId);
    if (!v) return;

    const diff = computeLineDiff(v.content, currentContent);
    setCompareResult(diff);
    setCompareLabels({
      a: `v${v.id.slice(0, 6)} (${formatRelative(v.createdAt)})`,
      b: 'Current (unsaved)',
    });
  };

  const allItems: VersionEntry[] = useMemo(() => {
    // Add a pseudo-entry for the current content
    const current: VersionEntry = {
      id: '__current__',
      content: currentContent,
      lineCount: currentContent.split('\n').length,
      message: 'Current working copy',
      createdAt: new Date().toISOString(),
    };
    return [current, ...versions];
  }, [versions, currentContent]);

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-4">
      <div className="mt-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
            <GitBranch className="size-3" />
            {allItems.length} version{allItems.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-1">
            {selectedIds.size === 2 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-xs"
                    className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    onClick={handleCompare}
                  >
                    <GitCompareArrows className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Compare selected versions</TooltipContent>
              </Tooltip>
            )}
            <Button variant="ghost" size="icon-xs" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`size-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Compare Result */}
        {compareResult && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="compare-panel-enter space-y-2 rounded-lg border p-3 bg-muted/10"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium flex items-center gap-1.5">
                <GitCompareArrows className="size-3 text-emerald-500" />
                Version Comparison
              </span>
              <Button variant="ghost" size="icon-xs" onClick={() => setCompareResult(null)}>
                <X className="size-3" />
              </Button>
            </div>
            <DiffView diffLines={compareResult} labelA={compareLabels.a} labelB={compareLabels.b} />
          </motion.div>
        )}

        {/* Version List */}
        {allItems.length > 0 ? (
          <div className="space-y-2">
            {allItems.map((v, idx) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03, duration: 0.15 }}
                className="relative"
              >
                <VersionItem
                  version={v}
                  isSelected={selectedIds.has(v.id)}
                  isCurrent={v.id === '__current__'}
                  onSelect={() => toggleSelect(v.id)}
                />
                {/* Compare with current button (for non-current versions) */}
                {v.id !== '__current__' && !compareResult && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleCompareWithCurrent(v.id); }}
                        className="absolute top-2 right-2 p-1 rounded text-muted-foreground/40 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all opacity-0 group-hover:opacity-100"
                        style={{ opacity: selectedIds.has(v.id) ? 1 : undefined }}
                      >
                        <GitCompareArrows className="size-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Compare with current</TooltipContent>
                  </Tooltip>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="mb-4 relative">
              <div className="absolute inset-0 rounded-full bg-emerald-500/5 blur-xl" />
              <GitBranch className="size-12 text-muted-foreground/20 relative" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">No version history</h3>
            <p className="text-[10px] text-muted-foreground/60 max-w-[200px]">
              Versions are saved automatically when you edit a script. Edit and save to create the first version.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
