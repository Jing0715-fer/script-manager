'use client';

import React, { useState, useMemo } from 'react';
import { GitCompareArrows, Columns2, Rows3, ChevronUp, ChevronDown } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { computeDiff } from '@/lib/diff-utils';
import type { ScriptData } from '@/types';

type DiffLine = { type: 'same' | 'added' | 'removed'; line: string };

type ViewMode = 'unified' | 'sideBySide';

export function DiffDialog({
  open, onOpenChange, diffScripts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diffScripts: [ScriptData | null, ScriptData | null];
}) {
  const [viewMode, setViewMode] = useState<ViewMode>('unified');
  const [collapseUnchanged, setCollapseUnchanged] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) onOpenChange(false); }}>
      <DialogContent className="max-w-6xl max-h-[85vh] rounded-xl" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompareArrows className="size-5" />
            Script Comparison
          </DialogTitle>
          <DialogDescription>
            {viewMode === 'unified' ? 'Unified' : 'Side-by-side'} comparison between two scripts
          </DialogDescription>
        </DialogHeader>
        {diffScripts[0] && diffScripts[1] && (() => {
          const diff = computeDiff(diffScripts[0].content, diffScripts[1].content);
          const stats = {
            added: diff.filter(d => d.type === 'added').length,
            removed: diff.filter(d => d.type === 'removed').length,
            same: diff.filter(d => d.type === 'same').length,
          };
          const total = stats.added + stats.removed + stats.same;
          const addedPct = total > 0 ? (stats.added / total) * 100 : 0;
          const removedPct = total > 0 ? (stats.removed / total) * 100 : 0;
          const samePct = total > 0 ? (stats.same / total) * 100 : 0;

          // Prepare side-by-side data
          const { leftLines, rightLines } = useMemo(() => {
            const left: (DiffLine & { num: number })[] = [];
            const right: (DiffLine & { num: number })[] = [];
            let ln = 0, rn = 0;
            for (const d of diff) {
              if (d.type === 'same') {
                ln++; rn++;
                left.push({ ...d, num: ln });
                right.push({ ...d, num: rn });
              } else if (d.type === 'removed') {
                ln++;
                left.push({ ...d, num: ln });
                right.push({ type: 'same', line: '', num: -1 });
              } else {
                rn++;
                left.push({ type: 'same', line: '', num: -1 });
                right.push({ ...d, num: rn });
              }
            }
            return { leftLines: left, rightLines: right };
          }, [diff]);

          // Minimap data: which sections have changes
          const minimapSections = useMemo(() => {
            if (viewMode !== 'unified') return [];
            const sections: { type: 'change' | 'same'; start: number; end: number }[] = [];
            let currentType: 'change' | 'same' | null = null;
            let startIdx = 0;
            diff.forEach((d, i) => {
              const isChange = d.type !== 'same';
              if (currentType === null) {
                currentType = isChange ? 'change' : 'same';
                startIdx = i;
              } else if ((isChange && currentType === 'same') || (!isChange && currentType === 'change')) {
                sections.push({ type: currentType, start: startIdx, end: i - 1 });
                currentType = isChange ? 'change' : 'same';
                startIdx = i;
              }
            });
            if (currentType !== null) {
              sections.push({ type: currentType, start: startIdx, end: diff.length - 1 });
            }
            return sections;
          }, [diff, viewMode]);

          // Group unchanged lines for collapse
          const collapsedDiff = useMemo(() => {
            if (!collapseUnchanged) return diff;
            const result: DiffLine[] = [];
            let sameCount = 0;
            for (const d of diff) {
              if (d.type === 'same') {
                sameCount++;
                if (sameCount <= 3 || sameCount > diff.length - 6) {
                  result.push(d);
                } else if (sameCount === 4) {
                  result.push({ type: 'same', line: '  ... (collapsed unchanged lines) ...' });
                }
              } else {
                sameCount = 0;
                result.push(d);
              }
            }
            return result;
          }, [diff, collapseUnchanged]);

          return (
            <div>
              {/* Script names + stats bar */}
              <div className="flex items-center gap-3 mb-3">
                <Badge variant="secondary" className="text-[10px]">
                  <span className="mr-1">{diffScripts[0].name}</span>
                </Badge>
                <span className="text-muted-foreground">vs</span>
                <Badge variant="secondary" className="text-[10px]">
                  <span className="mr-1">{diffScripts[1].name}</span>
                </Badge>
                <div className="ml-auto flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-emerald-600">+{stats.added}</span>
                    <span className="text-red-600">-{stats.removed}</span>
                    <span className="text-muted-foreground">={stats.same}</span>
                  </div>
                </div>
              </div>

              {/* Stats bar */}
              <div className="flex h-2 rounded-full overflow-hidden mb-3 bg-muted">
                <div className="bg-emerald-500/70 transition-all duration-300" style={{ width: `${addedPct}%` }} />
                <div className="bg-red-500/70 transition-all duration-300" style={{ width: `${removedPct}%` }} />
                <div className="bg-muted-foreground/20 transition-all duration-300" style={{ width: `${samePct}%` }} />
              </div>

              {/* View controls */}
              <div className="flex items-center gap-2 mb-3">
                <Button
                  variant={viewMode === 'unified' ? 'default' : 'outline'}
                  size="xs"
                  className="text-[10px] gap-1"
                  onClick={() => setViewMode('unified')}
                >
                  <Rows3 className="size-3" />Unified
                </Button>
                <Button
                  variant={viewMode === 'sideBySide' ? 'default' : 'outline'}
                  size="xs"
                  className="text-[10px] gap-1"
                  onClick={() => setViewMode('sideBySide')}
                >
                  <Columns2 className="size-3" />Side-by-Side
                </Button>
                <div className="flex-1" />
                <Button
                  variant="outline"
                  size="xs"
                  className={`text-[10px] gap-1 ${collapseUnchanged ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : ''}`}
                  onClick={() => setCollapseUnchanged(v => !v)}
                >
                  <ChevronUp className="size-2.5" />
                  {collapseUnchanged ? 'Show unchanged' : 'Collapse unchanged'}
                  <ChevronDown className="size-2.5" />
                </Button>
              </div>

              {/* Diff view */}
              {viewMode === 'unified' ? (
                <div className="flex gap-0">
                  {/* Minimap */}
                  {minimapSections.length > 0 && (
                    <div className="w-3 shrink-0 border border-r border-border rounded-l-lg overflow-hidden flex flex-col">
                      {minimapSections.map((section, i) => (
                        <div
                          key={i}
                          className={`flex-1 min-h-[1px] ${section.type === 'change' ? 'bg-emerald-500/60' : 'bg-muted-foreground/10'}`}
                          style={{ height: `${((section.end - section.start + 1) / diff.length) * 100}%` }}
                        />
                      ))}
                    </div>
                  )}
                  <ScrollArea className="max-h-[50vh] flex-1">
                    <div className="rounded-lg border overflow-hidden">
                      {collapsedDiff.map((d, i) => (
                        <div
                          key={i}
                          className={`flex font-mono text-[11px] leading-5 hover:brightness-105 transition-all duration-75 ${
                            d.type === 'added' ? 'bg-emerald-50 dark:bg-emerald-950/30'
                            : d.type === 'removed' ? 'bg-red-50 dark:bg-red-950/30'
                            : 'bg-transparent'
                          }`}
                        >
                          <span className={`w-8 text-right pr-2 select-none shrink-0 text-[9px] ${
                            d.type === 'added' ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50'
                            : d.type === 'removed' ? 'text-red-600 bg-red-100 dark:bg-red-950/50'
                            : 'text-muted-foreground/30'
                          }`}>
                            {d.type === 'added' ? '+' : d.type === 'removed' ? '-' : ' '}
                          </span>
                          <pre className={`flex-1 whitespace-pre-wrap break-all ${
                            d.type === 'added' ? 'text-emerald-700 dark:text-emerald-400'
                            : d.type === 'removed' ? 'text-red-700 dark:text-red-400'
                            : 'text-foreground/70'
                          }`}>{d.line}</pre>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <ScrollArea className="max-h-[50vh]">
                  <div className="flex border rounded-lg overflow-hidden">
                    {/* Left pane */}
                    <div className="flex-1 min-w-0 border-r">
                      <div className="px-2 py-1 bg-muted/50 border-b text-[9px] font-medium text-muted-foreground truncate">
                        {diffScripts[0].name}
                      </div>
                      <div className="overflow-hidden">
                        {leftLines.map((d, i) => (
                          <div
                            key={i}
                            className={`flex font-mono text-[11px] leading-5 hover:brightness-105 transition-all duration-75 ${
                              d.type === 'removed' ? 'bg-red-50 dark:bg-red-950/30'
                              : d.num === -1 ? 'bg-muted/30'
                              : ''
                            }`}
                          >
                            <span className={`w-10 text-right pr-2 select-none shrink-0 text-[9px] ${
                              d.type === 'removed' ? 'text-red-600 bg-red-100/80 dark:bg-red-950/50'
                              : d.num === -1 ? 'text-transparent'
                              : 'text-muted-foreground/30'
                            }`}>
                              {d.num > 0 ? d.num : ' '}
                            </span>
                            <pre className={`flex-1 whitespace-pre-wrap break-all min-w-0 ${
                              d.type === 'removed' ? 'text-red-700 dark:text-red-400'
                              : d.num === -1 ? 'text-transparent'
                              : 'text-foreground/70'
                            }`}>{d.line}</pre>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Right pane */}
                    <div className="flex-1 min-w-0">
                      <div className="px-2 py-1 bg-muted/50 border-b text-[9px] font-medium text-muted-foreground truncate">
                        {diffScripts[1].name}
                      </div>
                      <div className="overflow-hidden">
                        {rightLines.map((d, i) => (
                          <div
                            key={i}
                            className={`flex font-mono text-[11px] leading-5 hover:brightness-105 transition-all duration-75 ${
                              d.type === 'added' ? 'bg-emerald-50 dark:bg-emerald-950/30'
                              : d.num === -1 ? 'bg-muted/30'
                              : ''
                            }`}
                          >
                            <span className={`w-10 text-right pr-2 select-none shrink-0 text-[9px] ${
                              d.type === 'added' ? 'text-emerald-600 bg-emerald-100/80 dark:bg-emerald-950/50'
                              : d.num === -1 ? 'text-transparent'
                              : 'text-muted-foreground/30'
                            }`}>
                              {d.num > 0 ? d.num : ' '}
                            </span>
                            <pre className={`flex-1 whitespace-pre-wrap break-all min-w-0 ${
                              d.type === 'added' ? 'text-emerald-700 dark:text-emerald-400'
                              : d.num === -1 ? 'text-transparent'
                              : 'text-foreground/70'
                            }`}>{d.line}</pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              )}
            </div>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
}
