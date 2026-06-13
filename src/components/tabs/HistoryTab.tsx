// @ts-nocheck
'use client';

import React, { useMemo, useState, useCallback } from 'react';
import {
  History, Clock, RefreshCw, Trash2, Timer, Copy, Check, X,
  GitCompareArrows, Download, Play, Terminal,
} from 'lucide-react';
import { motion } from '@/lib/framer-motion-shim';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { TabEmptyState } from './shared';

interface HistoryEntry {
  id: string; status: string; duration: number;
  output: string; error: string; timestamp: string;
  exitCode: number | null;
  resultFiles?: Array<{ name: string; path: string; size: number }>;
}

interface HistoryTabProps {
  executionHistory: HistoryEntry[];
  historyLoading: boolean;
  formatHistoryTime: (timestamp: string) => string;
  onFetchHistory: () => void;
  onClearHistory: () => void;
  onDeleteExecution: (id: string) => void;
}

function formatRelativeTime(timestamp: string): string {
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

// ─── Terminal Output Component (colored + line numbers) ──────────
function TerminalOutput({ text, isError }: { text: string; isError: boolean }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => (
        <div key={i} className="flex">
          <span className="select-none text-gray-600 text-right pr-3 shrink-0 w-6 text-[9px]">{i + 1}</span>
          <span className={isError ? 'text-red-400' : 'text-gray-200'}>{line || ' '}</span>
        </div>
      ))}
    </>
  );
}

function handleDownloadFile(filePath: string, fileName: string) {
  const a = document.createElement('a');
  a.href = `/api/files/download?path=${encodeURIComponent(filePath)}`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function handleDownloadOutput(text: string, filename: string) {
  if (!text) return;
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-output.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CopyOutputButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }, [text]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleCopy}
          className="p-0.5 rounded text-gray-500 hover:text-gray-300 transition-colors"
        >
          {copied ? <Check className="size-2.5 text-emerald-400" /> : <Copy className="size-2.5" />}
        </button>
      </TooltipTrigger>
      <TooltipContent>{copied ? 'Copied!' : 'Copy output'}</TooltipContent>
    </Tooltip>
  );
}

// ─── Diff comparison helper ──────────────────────────────────────────
function computeDiff(textA: string, textB: string): { leftOnly: string[]; rightOnly: string[]; common: string[] } {
  const linesA = textA.split('\n');
  const linesB = textB.split('\n');
  const maxLen = Math.max(linesA.length, linesB.length);
  const leftOnly: string[] = [];
  const rightOnly: string[] = [];
  const common: string[] = [];
  for (let i = 0; i < maxLen; i++) {
    const a = linesA[i] ?? '';
    const b = linesB[i] ?? '';
    if (a === b) {
      common.push(a);
    } else {
      if (a) leftOnly.push(a);
      if (b) rightOnly.push(b);
    }
  }
  return { leftOnly, rightOnly, common };
}

// ─── Compare Panel ──────────────────────────────────────────
function ComparePanel({
  left,
  right,
  leftMeta,
  rightMeta,
  onClose,
}: {
  left: HistoryEntry;
  right: HistoryEntry;
  leftMeta: { duration: number; exitCode: number | null; timestamp: string };
  rightMeta: { duration: number; exitCode: number | null; timestamp: string };
  onClose: () => void;
}) {
  const { leftOnly, rightOnly, common } = useMemo(
    () => computeDiff(left.output || '', right.output || ''),
    [left.output, right.output]
  );

  return (
    <div className="compare-panel-enter space-y-3">
      {/* Header with metadata comparison */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold flex items-center gap-1.5">
          <GitCompareArrows className="size-3 text-emerald-500" />
          Execution Comparison
        </h4>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-xs" onClick={onClose}>
              <X className="size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Close compare</TooltipContent>
        </Tooltip>
      </div>

      {/* Metadata comparison */}
      <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-3">
        <div className="space-y-1">
          <span className="text-[9px] text-muted-foreground font-medium">Run A</span>
          <div className="text-[10px] text-foreground space-y-0.5">
            <div>Status: <Badge variant="secondary" className={`text-[8px] h-4 ${left.status === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>{left.status}</Badge></div>
            <div>Duration: {leftMeta.duration >= 1000 ? `${(leftMeta.duration / 1000).toFixed(2)}s` : `${leftMeta.duration}ms`}</div>
            {leftMeta.exitCode !== null && <div>Exit code: {leftMeta.exitCode}</div>}
            <div className="text-[9px] text-muted-foreground">{formatRelativeTime(leftMeta.timestamp)}</div>
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-[9px] text-muted-foreground font-medium">Run B</span>
          <div className="text-[10px] text-foreground space-y-0.5">
            <div>Status: <Badge variant="secondary" className={`text-[8px] h-4 ${right.status === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>{right.status}</Badge></div>
            <div>Duration: {rightMeta.duration >= 1000 ? `${(rightMeta.duration / 1000).toFixed(2)}s` : `${rightMeta.duration}ms`}</div>
            {rightMeta.exitCode !== null && <div>Exit code: {rightMeta.exitCode}</div>}
            <div className="text-[9px] text-muted-foreground">{formatRelativeTime(rightMeta.timestamp)}</div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground px-1">
        <Badge variant="outline" className="text-[8px] h-4 text-emerald-600 border-emerald-300">{common.length} common lines</Badge>
        <Badge variant="outline" className="text-[8px] h-4 text-red-500 border-red-300">{leftOnly.length} only in A</Badge>
        <Badge variant="outline" className="text-[8px] h-4 text-sky-500 border-sky-300">{rightOnly.length} only in B</Badge>
      </div>

      {/* Split terminal output */}
      <div className="grid grid-cols-2 gap-2">
        {/* Left (Run A) */}
        <div className="rounded-lg border overflow-hidden">
          <div className="px-2 py-1 bg-gray-900 border-b border-gray-800 flex items-center justify-between">
            <span className="text-[9px] text-gray-400 font-medium">Output A</span>
            <Badge variant="outline" className="text-[7px] h-3 px-1 border-gray-700 text-gray-500">A</Badge>
          </div>
          <div className="bg-[#1a1b26] dark:bg-[#0d0e14] font-mono text-[10px] leading-4 overflow-auto max-h-48">
            <pre className="p-2 whitespace-pre-wrap">
              <TerminalOutput text={left.output || ''} isError={false} />
            </pre>
          </div>
        </div>
        {/* Right (Run B) */}
        <div className="rounded-lg border overflow-hidden">
          <div className="px-2 py-1 bg-gray-900 border-b border-gray-800 flex items-center justify-between">
            <span className="text-[9px] text-gray-400 font-medium">Output B</span>
            <Badge variant="outline" className="text-[7px] h-3 px-1 border-gray-700 text-gray-500">B</Badge>
          </div>
          <div className="bg-[#1a1b26] dark:bg-[#0d0e14] font-mono text-[10px] leading-4 overflow-auto max-h-48">
            <pre className="p-2 whitespace-pre-wrap">
              <TerminalOutput text={right.output || ''} isError={false} />
            </pre>
          </div>
        </div>
      </div>

      {/* Diff view */}
      {(leftOnly.length > 0 || rightOnly.length > 0) && (
        <div className="rounded-lg border bg-muted/20 p-3">
          <span className="text-[10px] font-medium text-muted-foreground mb-2">Line Differences</span>
          <div className="grid grid-cols-2 gap-2">
            {/* Left-only lines (removed in B) */}
            <div className="space-y-0.5">
              {leftOnly.map((line, i) => (
                <div key={`a-${i}`} className="rounded px-2 py-0.5 text-[10px] font-mono compare-diff-removed">
                  <span className="text-red-500/60 mr-1 select-none">{i + 1}</span>
                  <span className="text-red-400">{line}</span>
                </div>
              ))}
              {leftOnly.length === 0 && (
                <div className="text-[9px] text-muted-foreground italic">No unique lines</div>
              )}
            </div>
            {/* Right-only lines (added in B) */}
            <div className="space-y-0.5">
              {rightOnly.map((line, i) => (
                <div key={`b-${i}`} className="rounded px-2 py-0.5 text-[10px] font-mono compare-diff-added">
                  <span className="text-emerald-500/60 mr-1 select-none">{i + 1}</span>
                  <span className="text-emerald-400">{line}</span>
                </div>
              ))}
              {rightOnly.length === 0 && (
                <div className="text-[9px] text-muted-foreground italic">No unique lines</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function HistoryTab({
  executionHistory, historyLoading,
  formatHistoryTime, onFetchHistory, onClearHistory, onDeleteExecution,
}: HistoryTabProps) {
  const recentRuns = executionHistory.slice(0, 15);
  const maxDuration = useMemo(
    () => Math.max(...recentRuns.map(h => h.duration), 1),
    [recentRuns]
  );
  const avgDuration = useMemo(() => {
    if (recentRuns.length === 0) return 0;
    const sum = recentRuns.reduce((acc, h) => acc + h.duration, 0);
    return sum / recentRuns.length;
  }, [recentRuns]);

  // Compare state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [compareTarget, setCompareTarget] = useState<{ a: HistoryEntry; b: HistoryEntry; aMeta: { duration: number; exitCode: number | null; timestamp: string }; bMeta: { duration: number; exitCode: number | null; timestamp: string } } | null>(null);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size > 2) {
        // Remove oldest entry by timestamp
        const oldestId = Array.from(next)
          .map(id => executionHistory.find(h => h.id === id))
          .filter((h): h is HistoryEntry => !!h)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0]?.id;
        if (oldestId) next.delete(oldestId);
      }
      return next;
    });
  };

  const handleCompare = () => {
    if (selectedIds.size !== 2) return;
    const ids = Array.from(selectedIds);
    const a = executionHistory.find(h => h.id === ids[0]);
    const b = executionHistory.find(h => h.id === ids[1]);
    if (!a || !b) return;
    // A is older, B is newer (history is newest first)
    if (new Date(a.timestamp).getTime() > new Date(b.timestamp).getTime()) {
      setCompareTarget({
        a: b, b: a,
        aMeta: { duration: b.duration, exitCode: b.exitCode, timestamp: b.timestamp },
        bMeta: { duration: a.duration, exitCode: a.exitCode, timestamp: a.timestamp },
      });
    } else {
      setCompareTarget({
        a, b,
        aMeta: { duration: a.duration, exitCode: a.exitCode, timestamp: a.timestamp },
        bMeta: { duration: b.duration, exitCode: b.exitCode, timestamp: b.timestamp },
      });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-4">
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium text-muted-foreground">
            {executionHistory.length} execution{executionHistory.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-0.5">
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
                <TooltipContent>Compare selected runs</TooltipContent>
              </Tooltip>
            )}
            {executionHistory.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-xs" onClick={onClearHistory} className="text-destructive hover:text-destructive">
                    <Trash2 className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear history</TooltipContent>
              </Tooltip>
            )}
            <Button variant="ghost" size="icon-xs" onClick={onFetchHistory} disabled={historyLoading}>
              <RefreshCw className={`size-3 ${historyLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Compare Panel */}
        {compareTarget && (
          <ComparePanel
            left={compareTarget.a}
            right={compareTarget.b}
            leftMeta={compareTarget.aMeta}
            rightMeta={compareTarget.bMeta}
            onClose={() => setCompareTarget(null)}
          />
        )}

        {/* Sparkline bars */}
        {recentRuns.length > 1 && !compareTarget && (
          <div className="rounded-lg border bg-muted/20 p-3 mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <Timer className="size-3" />Duration Timeline
              </span>
              <span className="text-[9px] text-muted-foreground font-mono">
                Avg: {avgDuration >= 1000 ? `${(avgDuration / 1000).toFixed(2)}s` : `${Math.round(avgDuration)}ms`}
              </span>
            </div>
            <div className="flex items-end gap-[2px] h-16 px-1">
              {recentRuns.map((h, idx) => {
                const heightPct = Math.max((h.duration / maxDuration) * 100, 4);
                const isSuccess = h.status === 'success';
                return (
                  <Tooltip key={h.id}>
                    <TooltipTrigger asChild>
                      <div
                        className={`flex-1 rounded-t-sm transition-all duration-200 min-w-[3px] hover:opacity-80 ${
                          isSuccess
                            ? 'bg-emerald-500/70 hover:bg-emerald-500'
                            : 'bg-red-500/70 hover:bg-red-500'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent className="text-[9px]" side="top">
                      <div>{formatRelativeTime(h.timestamp)}</div>
                      <div>{h.duration >= 1000 ? `${(h.duration / 1000).toFixed(2)}s` : `${h.duration}ms`}</div>
                      <div className={isSuccess ? 'text-emerald-400' : 'text-red-400'}>{h.status}</div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
            {/* X-axis labels */}
            <div className="flex justify-between mt-1 px-1">
              <span className="text-[7px] text-muted-foreground/50">{formatRelativeTime(recentRuns[recentRuns.length - 1].timestamp)}</span>
              <span className="text-[7px] text-muted-foreground/50">{formatRelativeTime(recentRuns[0].timestamp)}</span>
            </div>
          </div>
        )}

        {/* History entries */}
        {!compareTarget && (
          executionHistory.length > 0 ? executionHistory.map((h, idx) => (
            <div key={h.id} className="terminal-output-enter rounded-lg border overflow-hidden" style={{ animationDelay: `${idx * 50}ms` }}>
              <div className="flex items-center justify-between px-3 py-2 bg-gray-900 dark:bg-gray-950 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    <span className={`size-2 rounded-full ${h.status === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    <span className="text-xs font-medium capitalize text-gray-200">{h.status}</span>
                  </div>
                  {h.exitCode !== null && h.exitCode !== undefined && (
                    <Badge variant="outline" className="text-[8px] h-3.5 px-1 border-gray-700 text-gray-400">Exit: {h.exitCode}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                  <span className="flex items-center gap-0.5">
                    <Clock className="size-2.5" />{h.duration >= 1000 ? `${(h.duration / 1000).toFixed(2)}s` : `${h.duration}ms`}
                  </span>
                  <div className="exec-timeline-bar h-1 w-16 rounded-full bg-gray-800 overflow-hidden">
                    <div
                      className={`exec-timeline-fill h-full rounded-full ${
                        h.status === 'success' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : h.status === 'error' ? 'bg-gradient-to-r from-red-500 to-red-400' : 'bg-gradient-to-r from-amber-500 to-amber-400'
                      }`}
                      style={{ width: `${Math.max((h.duration / maxDuration) * 100, 8)}%`, transition: 'width 0.5s ease-out' }}
                    />
                  </div>
                  {(h.output || h.error) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleDownloadOutput(h.output || h.error, `execution-${h.id.slice(0, 8)}`)}
                          className="output-download-btn p-0.5 rounded text-gray-500 hover:text-emerald-400 transition-colors"
                        >
                          <Download className="size-2.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Download output</TooltipContent>
                    </Tooltip>
                  )}
                  {h.resultFiles && h.resultFiles.length > 0 && (
                    <div className="flex items-center gap-1">
                      {h.resultFiles.map((file, fi) => (
                        <Tooltip key={fi}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleDownloadFile(file.path, file.name)}
                              className="output-download-btn p-0.5 rounded text-gray-500 hover:text-sky-400 transition-colors flex items-center gap-0.5"
                              title={`${file.name} (${formatFileSize(file.size)})`}
                            >
                              <Download className="size-2.5" />
                              <span className="text-[8px] max-w-[60px] truncate">{file.name}</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{file.name} ({formatFileSize(file.size)})</TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onDeleteExecution(h.id)}
                        className="p-0.5 rounded text-gray-500 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="size-2.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Delete this run</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <div className="text-[10px] text-gray-500 px-3 py-0.5 bg-gray-900/50">{formatHistoryTime(h.timestamp)}</div>
              <div className="bg-[#1a1b26] dark:bg-[#0d0e14] font-mono text-[10px] leading-4 overflow-auto max-h-32">
                {h.output && (
                  <pre className="p-2 whitespace-pre-wrap">
                    <TerminalOutput text={h.output} isError={false} />
                  </pre>
                )}
                {h.error && (
                  <pre className="p-2 whitespace-pre-wrap">
                    <TerminalOutput text={h.error} isError={true} />
                  </pre>
                )}
                <span className="inline-block size-2 h-3 bg-gray-300 terminal-cursor-blink ml-1" />
              </div>
            </div>
          )) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <div className="quick-run-empty mb-4 relative">
                <div className="absolute inset-0 rounded-full bg-emerald-500/5 blur-xl" />
                <Terminal className="size-12 text-muted-foreground/20 relative" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">No execution history yet</h3>
              <p className="text-[10px] text-muted-foreground/60 max-w-[200px]">
                Run this script to start tracking execution history, durations, and output here.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/40">
                  <Play className="size-3" />
                  <span>Click Run to start</span>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/40">
                  <Timer className="size-3" />
                  <span>Track durations</span>
                </div>
              </div>
            </motion.div>
          )
        )}
      </div>
    </div>
  );
}
