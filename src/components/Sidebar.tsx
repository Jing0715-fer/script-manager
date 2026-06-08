'use client';

import React from 'react';
import { motion, AnimatePresence } from '@/lib/framer-motion-shim';
import {
  Zap, Hash, Heart, Clock, FolderOpen, Eye, Flame, BarChart3,
  TrendingUp, Trophy, Activity, CheckCircle2, XCircle, Play, Tag,
  ChevronLeft, ChevronRight, History,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { catDotColors, catBarColors, langAccentColors } from '@/lib/shared-constants';
import { LanguageIcon } from '@/components/LanguageIcon';
import { useScriptStore } from '@/store/script-store';
import type { ScriptData } from '@/types';

// ─── Sidebar Item Component (Animated) ────────────────────────

export function SidebarItem({
  active, onClick, icon, label, count, dotColor, empty = false,
}: {
  active: boolean; onClick: () => void; icon?: React.ReactNode; label: string; count: number; dotColor: string; empty?: boolean;
}) {
  return (
    <Tooltip>
    <TooltipTrigger asChild>
    <button
      className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm transition-all duration-200 group relative sidebar-hover-highlight ${
        empty
          ? 'text-muted-foreground/40 opacity-60 cursor-not-allowed'
          : active
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-medium'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      }`}
      onClick={empty ? undefined : onClick}
      disabled={empty}
    >
      {/* Active category indicator - smooth sliding emerald bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full transition-all duration-300 ${active ? 'bg-emerald-500' : 'bg-transparent'}`} />
      <div className="flex items-center gap-2">
        <span className={`size-2 rounded-full shrink-0 transition-all duration-200 ${active ? 'ring-2 ring-emerald-500/30 scale-110' : 'hover:scale-110'}`} style={{ backgroundColor: dotColor }} />
        {icon && <span className={`shrink-0 transition-colors duration-200 ${active ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>{icon}</span>}
        <span className="truncate">{label}</span>
        {empty && <span className="text-[8px] text-muted-foreground/50 underline decoration-dotted">(empty)</span>}
      </div>
      {/* Count badge with animation */}
      <span suppressHydrationWarning className={`inline-flex items-center justify-center min-w-[20px] h-5 rounded-full font-medium transition-transform duration-200 ${
        active
          ? 'bg-emerald-500 text-white text-[10px]'
          : 'bg-muted/80 text-muted-foreground text-[10px]'
      }`}>
        {count}
      </span>
    </button>
    </TooltipTrigger>
    <TooltipContent>{empty ? 'No scripts in this category. Assign scripts to see them here.' : `${label} (${count} script${count !== 1 ? 's' : ''})`}</TooltipContent>
    </Tooltip>
  );
}

// ─── Activity Heatmap Component ──────────────────────────────────

function ActivityHeatmap({ recentExecutions }: { recentExecutions: Array<{ id: string; name: string; status: string; timestamp: number }> }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  // Generate 84 days (12 weeks) of activity data
  const days = React.useMemo(() => {
    const result: Array<{ date: Date; count: number; dayStr: string }> = [];
    const now = new Date();
    for (let i = 83; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const count = recentExecutions.filter(e => {
        const eDate = new Date(e.timestamp).toISOString().split('T')[0];
        return eDate === dayStr;
      }).length;
      result.push({ date: d, count, dayStr });
    }
    return result;
  }, [recentExecutions]);

  if (!mounted) return null;

  const getColor = (count: number) => {
    if (count === 0) return 'bg-muted/60';
    if (count === 1) return 'bg-emerald-200 dark:bg-emerald-900/60';
    if (count <= 3) return 'bg-emerald-400 dark:bg-emerald-600';
    return 'bg-emerald-600 dark:bg-emerald-400';
  };

  return (
    <div className="flex flex-col gap-1">
      {/* Month labels row */}
      <div className="flex gap-[2px] ml-3">
        {[0, 4, 8].map(weekIdx => {
          const d = days[weekIdx * 7]?.date;
          if (!d) return null;
          return (
            <span key={weekIdx} className="text-[7px] text-muted-foreground/40 w-[22px] shrink-0">
              {d.toLocaleDateString('en', { month: 'short' }).slice(0, 3)}
            </span>
          );
        })}
      </div>
      {/* Heatmap grid: 7 rows (Mon-Sun) × 12 columns (weeks) */}
      <div className="flex gap-[2px]">
        {/* Day labels */}
        <div className="flex flex-col gap-[2px] shrink-0 w-3">
          <span className="text-[6px] text-muted-foreground/30 leading-none h-[7px]" />
          <span className="text-[6px] text-muted-foreground/30 leading-none h-[7px]" />
          <span className="text-[6px] text-muted-foreground/30 leading-none h-[7px]">M</span>
          <span className="text-[6px] text-muted-foreground/30 leading-none h-[7px]" />
          <span className="text-[6px] text-muted-foreground/30 leading-none h-[7px]" />
          <span className="text-[6px] text-muted-foreground/30 leading-none h-[7px]" />
          <span className="text-[6px] text-muted-foreground/30 leading-none h-[7px]" />
        </div>
        {/* 12 weeks of cells */}
        {Array.from({ length: 12 }).map((_, weekIdx) => (
          <div key={weekIdx} className="flex flex-col gap-[2px]">
            {Array.from({ length: 7 }).map((_, dayIdx) => {
              const dayData = days[weekIdx * 7 + dayIdx];
              if (!dayData) return <div key={dayIdx} className="size-[7px] rounded-[1px]" />;
              return (
                <Tooltip key={dayIdx}>
                  <TooltipTrigger asChild>
                    <div
                      className={`size-[7px] rounded-[1px] transition-all duration-150 hover:scale-125 cursor-default heatmap-cell ${getColor(dayData.count)}`}
                      style={{ animationDelay: `${(weekIdx * 7 + dayIdx) * 15}ms` }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-[9px]">
                    {dayData.count} execution{dayData.count !== 1 ? 's' : ''} on {dayData.dayStr}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-1 mt-0.5">
        <span className="text-[7px] text-muted-foreground/40">Less</span>
        <div className="size-[7px] rounded-[1px] bg-muted/60" />
        <div className="size-[7px] rounded-[1px] bg-emerald-200 dark:bg-emerald-900/60" />
        <div className="size-[7px] rounded-[1px] bg-emerald-400 dark:bg-emerald-600" />
        <div className="size-[7px] rounded-[1px] bg-emerald-600 dark:bg-emerald-400" />
        <span className="text-[7px] text-muted-foreground/40">More</span>
      </div>
    </div>
  );
}

// ─── Tag Cloud Items Component ──────────────────────────────────
function TagCloudItems({ allTags, selectedTag, setSelectedTag }: { allTags: string[]; selectedTag: string | null; setSelectedTag: (tag: string | null) => void }) {
  const tagData = React.useMemo(() => {
    const counts = new Map<string, number>();
    allTags.forEach(tag => counts.set(tag, (counts.get(tag) || 0) + 1));
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [allTags]);

  const maxCount = tagData.length > 0 ? tagData[0].count : 1;

  return (
    <>
      {tagData.map((tag, i) => {
        const ratio = tag.count / maxCount;
        const fontSize = 9 + Math.round(ratio * 6);
        const opacity = 0.5 + ratio * 0.5;
        const isActive = selectedTag === tag.name;
        return (
          <button
            key={tag.name}
            type="button"
            className={`tag-cloud-item tag-cloud-item-enter rounded-full px-2 py-0.5 font-medium ${
              isActive
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 ring-1 ring-emerald-300 dark:ring-emerald-700'
                : 'bg-muted/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
            }`}
            style={{ fontSize: `${fontSize}px`, opacity, animationDelay: `${i * 30}ms` }}
            onClick={() => setSelectedTag(isActive ? null : tag.name)}
            title={`${tag.name}: ${tag.count} script${tag.count !== 1 ? 's' : ''}`}
          >
            {tag.name}
          </button>
        );
      })}
    </>
  );
}

// ─── Mini Sparkline Component ──────────────────────────────────
function MiniSparkline({ data, width = 56, height = 18, className = '' }: { data: number[]; width?: number; height?: number; className?: string }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);
  if (!mounted || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height * 0.8) - height * 0.1;
    return `${x},${y}`;
  });
  const pathD = `M${points.join(' L')}`;
  const areaD = `${pathD} L${width},${height} L0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={`sidebar-sparkline-container ${className}`} style={{ width, height }}>
      <defs>
        <linearGradient id={`spark-fill-${className || 'default'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#spark-fill-${className || 'default'})`} />
      <path d={pathD} fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="sparkline-animated" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// ─── Desktop Sidebar ─────────────────────────────────────────────

export function DesktopSidebar({
  scripts, sortedCategories, categoryMap, allTags, langDistribution, categoryExecDistribution, topRunScripts,
  animTotalScripts, animRecentRuns, animFavs, animTotalExecutions, totalScripts, totalExecutions,
  onSelectScript,
}: {
  scripts: ScriptData[];
  sortedCategories: [string, number][];
  categoryMap: Record<string, number>;
  allTags: string[];
  langDistribution: [string, number][];
  categoryExecDistribution: [string, number][];
  topRunScripts: ScriptData[];
  animTotalScripts: number;
  animRecentRuns: number;
  animFavs: number;
  animTotalExecutions: number;
  totalScripts: number;
  totalExecutions: number;
  onSelectScript: (script: ScriptData) => void;
}) {
  const store = useScriptStore();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  // ─── Resizable sidebar drag logic ──────────────────────────────
  const sidebarRef = React.useRef<HTMLElement>(null);
  const [isResizing, setIsResizing] = React.useState(false);

  const handleResizeStart = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = store.sidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      store.setSidebarWidth(startWidth + delta);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [store]);

  // Fetch last executed script from API for accurate data
  const [lastExecuted, setLastExecuted] = React.useState<{
    scriptName: string;
    scriptId: string;
    status: string;
    createdAt: string;
    duration: number;
  } | null>(null);

  React.useEffect(() => {
    if (!mounted || totalExecutions === 0) return;
    let cancelled = false;
    fetch('/api/executions?period=all&limit=1')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        if (!cancelled && data.executions && data.executions.length > 0) {
          const exec = data.executions[0];
          setLastExecuted({
            scriptName: exec.scriptName,
            scriptId: exec.scriptId,
            status: exec.status,
            createdAt: exec.createdAt,
            duration: exec.duration,
          });
        }
      })
      .catch(() => { /* silently ignore */ });
    return () => { cancelled = true; };
  }, [mounted, totalExecutions]);

  // Calculate actual success rate from recentExecutions in store
  const recentExecs = store.recentExecutions;
  const successCount = recentExecs.filter((e: any) => e.status === 'success').length;
  const totalExecCount = recentExecs.length;
  const successRate = totalExecCount > 0 ? Math.round((successCount / totalExecCount) * 100) : 100;

  // Pre-compute related scripts (moved from JSX IIFE to useMemo for performance)
  const relatedScripts = React.useMemo(() => {
    const selectedId = store.selectedScriptId;
    if (!selectedId || !mounted) return [];
    const selected = scripts.find(s => s.id === selectedId);
    if (!selected) return [];
    return scripts
      .filter(s => s.id !== selectedId)
      .map(s => {
        let score = 0;
        if (s.category === selected.category) score += 3;
        if (s.language === selected.language) score += 2;
        try {
          const sTags: string[] = s.tags ? JSON.parse(s.tags) : [];
          const selTags: string[] = selected.tags ? JSON.parse(selected.tags) : [];
          const commonTags = sTags.filter(t => selTags.includes(t));
          score += commonTags.length;
        } catch { /* ignore */ }
        return { script: s, score };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [mounted, scripts, store.selectedScriptId]);

  const sidebarWidth = store.sidebarWidth;

  return (
    <>
      {store.sidebarOpen && (
        <aside
          ref={sidebarRef}
          style={{ width: sidebarWidth }}
          className={`hidden lg:flex flex-col border-r bg-muted/20 overflow-hidden relative ${isResizing ? '' : 'transition-[width] duration-200 ease-in-out'}`}
        >
          {/* Resize handle */}
          <div
            onMouseDown={handleResizeStart}
            className={`absolute top-0 right-0 bottom-0 w-1 cursor-col-resize z-30 hover:bg-emerald-500/30 active:bg-emerald-500/50 transition-colors ${isResizing ? 'bg-emerald-500/40' : ''}`}
            title="Drag to resize sidebar"
          />
          {/* Visual indicator line on hover */}
          {!isResizing && (
            <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 z-30 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
              <div className="flex flex-col gap-[3px] px-0.5 py-2 rounded-md bg-muted/60">
                <div className="size-0.5 rounded-full bg-muted-foreground/40" />
                <div className="size-0.5 rounded-full bg-muted-foreground/40" />
                <div className="size-0.5 rounded-full bg-muted-foreground/40" />
              </div>
            </div>
          )}
            <div className="flex-1 overflow-y-auto scroll-smooth relative">
              <ScrollArea className="h-full sidebar-scroll">
                <div className="p-4 space-y-5">
                <div className="grid grid-cols-3 gap-2" aria-live="polite">
                  <div className="rounded-lg bg-background border p-2.5 text-center">
                    <div className="text-lg font-bold text-emerald-600 tabular-nums">{animTotalScripts}</div>
                    <div className="text-[10px] text-muted-foreground">Scripts</div>
                  </div>
                  <div className="rounded-lg bg-background border p-2.5 text-center">
                    <div className="text-lg font-bold text-amber-600 tabular-nums">{animRecentRuns}</div>
                    <div className="text-[10px] text-muted-foreground">Runs</div>
                  </div>
                  <div className="rounded-lg bg-background border p-2.5 text-center">
                    <div className="text-lg font-bold text-rose-500 tabular-nums">{animFavs}</div>
                    <div className="text-[10px] text-muted-foreground">Favs</div>
                  </div>
                </div>

                {/* Dashboard */}
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    <BarChart3 className="size-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Dashboard</span>
                  </div>
                  {langDistribution.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-muted-foreground font-medium">Languages</span>
                      {langDistribution.map(([lang, count]) => (
                        <div key={lang} className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground w-14 truncate">{lang}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden relative">
                            <motion.div
                              className={`h-full rounded-full ${langAccentColors[lang?.toLowerCase()] || 'bg-emerald-500'}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max((count / totalScripts) * 100, 8)}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              whileHover={{ filter: 'brightness(1.2)' }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent pointer-events-none" style={{ animation: 'shimmer 2s infinite' }} />
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-[10px] text-muted-foreground w-4 text-right cursor-default hover:text-foreground transition-colors">{count}</span>
                            </TooltipTrigger>
                            <TooltipContent>{lang}: {count} scripts ({Math.round((count / totalScripts) * 100)}%)</TooltipContent>
                          </Tooltip>
                        </div>
                      ))}
                    </div>
                  )}
                  {topRunScripts.length > 0 && topRunScripts.some(s => (s._count?.executions || 0) > 0) && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1">
                        <Trophy className="size-3 text-amber-500" />
                        <span className="text-[10px] text-muted-foreground font-medium">Most Run</span>
                      </div>
                      {topRunScripts.filter(s => (s._count?.executions || 0) > 0).slice(0, 3).map((s, idx) => {
                        // Use deterministic data based on execution count instead of random
                        const execCount = s._count?.executions || 1;
                        const seed = parseInt(s.id.slice(-8), 16) || execCount;
                        const sparkData = Array.from({ length: 6 }, (_, i) => {
                          const base = (seed * (i + 1) * 7) % 100;
                          return (base / 100) * execCount * 500 + 100;
                        });
                        return (
                        <button
                          key={s.id}
                          className="flex items-center gap-1.5 w-full text-left px-1.5 py-1 rounded hover:bg-muted/50 transition-colors text-[10px] group"
                          onClick={() => onSelectScript(s)}
                        >
                          <TrendingUp className="size-2.5 text-emerald-500 shrink-0" />
                          <span className="truncate group-hover:text-foreground text-muted-foreground flex-1">{s.name}</span>
                          <MiniSparkline data={sparkData} width={40} height={14} className={`spark-most-run-${idx}`} />
                          <span className="text-muted-foreground/60">{s._count?.executions || 0}</span>
                        </button>
                        );
                      })}
                    </div>
                  )}

                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Activity className="size-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground font-medium">Activity</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground/60">{animTotalExecutions} total</span>
                    </div>
                    {categoryExecDistribution.some(([, v]) => v > 0) ? (
                      <div className="flex items-end gap-1 h-8">
                        {categoryExecDistribution.map(([cat, count]) => {
                          const maxCount = Math.max(...categoryExecDistribution.map(([, v]) => v), 1);
                          const height = Math.max((count / maxCount) * 100, 4);
                          return (
                            <div key={cat} className="flex-1 flex flex-col items-center gap-0.5">
                              <div
                                className={`w-full rounded-t-sm ${catBarColors[cat] || 'bg-gray-400'}`}
                                style={{ height: `${height}%` }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-8 flex items-center justify-center">
                        <span className="text-[9px] text-muted-foreground/40">No executions yet</span>
                      </div>
                    )}
                  </div>

                  {totalExecutions > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="size-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground font-medium">Exec Stats</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">Last 24h runs</span>
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{animTotalExecutions}</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[9px]">
                            <span className="text-muted-foreground">Success rate</span>
                            <span className={`${successRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : successRate >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500'} font-medium`}>
                              {totalExecutions > 0 ? `${successRate}%` : 'N/A'}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${successRate >= 80 ? 'bg-emerald-500' : successRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${totalExecutions > 0 ? successRate : 0}%` }} />
                          </div>
                        </div>
                        {/* Task 6: Execution stats mini horizontal bar chart */}
                        {categoryExecDistribution.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[9px] text-muted-foreground/60">Runs by category</span>
                            {categoryExecDistribution.slice(0, 5).map(([cat, count]) => {
                              const maxExec = Math.max(...categoryExecDistribution.map(([, v]) => v), 1);
                              const pct = Math.max((count / maxExec) * 100, 5);
                              return (
                                <div key={cat} className="flex items-center gap-1.5">
                                  <span className={`size-1.5 rounded-full shrink-0 ${catDotColors[cat] || 'bg-gray-400'}`} />
                                  <span className="text-[9px] text-muted-foreground truncate w-14 shrink-0">{cat}</span>
                                  <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
                                    <motion.div
                                      className={`h-full rounded-full ${catBarColors[cat] || 'bg-gray-400'}`}
                                      initial={{ width: 0 }}
                                      animate={{ width: `${pct}%` }}
                                      transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                                    />
                                  </div>
                                  <span className="text-[9px] text-muted-foreground/60 w-5 text-right tabular-nums">{count}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {lastExecuted && (
                          <div className="space-y-0.5">
                            <span className="text-[9px] text-muted-foreground/60">Last executed</span>
                            <button
                              className="flex items-center gap-1.5 w-full text-left px-1.5 py-1 rounded hover:bg-muted/50 transition-colors text-[10px] group"
                              onClick={() => {
                                const script = scripts.find(s => s.id === lastExecuted.scriptId);
                                if (script) onSelectScript(script);
                              }}
                            >
                              {lastExecuted.status === 'success' ? (
                                <CheckCircle2 className="size-2.5 text-emerald-500 shrink-0" />
                              ) : lastExecuted.status === 'error' ? (
                                <XCircle className="size-2.5 text-red-500 shrink-0" />
                              ) : (
                                <Play className="size-2.5 text-emerald-500 shrink-0" />
                              )}
                              <span className="truncate group-hover:text-foreground text-muted-foreground">{lastExecuted.scriptName}</span>
                              <span className="text-[8px] text-muted-foreground/50 shrink-0 tabular-nums">
                                {formatDistanceToNow(new Date(lastExecuted.createdAt), { addSuffix: true })}
                              </span>
                            </button>
                          </div>
                        )}
                        {!lastExecuted && topRunScripts.length > 0 && topRunScripts[0] && (topRunScripts[0]._count?.executions || 0) > 0 && (
                          <div className="space-y-0.5">
                            <span className="text-[9px] text-muted-foreground/60">Last executed</span>
                            <button
                              className="flex items-center gap-1.5 w-full text-left px-1.5 py-1 rounded hover:bg-muted/50 transition-colors text-[10px] group"
                              onClick={() => onSelectScript(topRunScripts[0])}
                            >
                              <Play className="size-2.5 text-emerald-500 shrink-0" />
                              <span className="truncate group-hover:text-foreground text-muted-foreground">{topRunScripts[0].name}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <Separator />

                {/* Quick Access */}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Flame className="size-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Quick Access</span>
                  </div>
                  <SidebarItem active={store.selectedCategory === 'All'} onClick={() => store.setSelectedCategory('All')} icon={<Hash className="size-3.5" />} label="All Scripts" count={totalScripts} dotColor="bg-emerald-500" />
                  <SidebarItem active={store.selectedCategory === 'Favorites'} onClick={() => store.setSelectedCategory('Favorites')} icon={<Heart className="size-3.5" />} label="Favorites" count={store.favorites.length} dotColor="bg-rose-500" />
                  <SidebarItem active={store.selectedCategory === 'Recent'} onClick={() => store.setSelectedCategory('Recent')} icon={<Clock className="size-3.5" />} label="Recent" count={store.recentScripts.length} dotColor="bg-amber-500" />
                </div>

                <Separator />

                {/* Categories */}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <FolderOpen className="size-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Categories</span>
                  </div>
                  {sortedCategories.map(([cat, count]) => (
                    <SidebarItem key={cat} active={store.selectedCategory === cat} onClick={() => store.setSelectedCategory(cat)} label={cat} count={count} dotColor={catDotColors[cat] || 'bg-gray-400'} empty={count === 0} />
                  ))}
                </div>

                {/* Tag Cloud — interactive tag visualization */}
                {mounted && allTags.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Tag className="size-3.5 text-muted-foreground" />
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tag Cloud</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <TagCloudItems allTags={allTags} selectedTag={store.selectedTag} setSelectedTag={store.setSelectedTag} />
                      </div>
                    </div>
                  </>
                )}

                {/* Recently Viewed — only after mount to prevent hydration mismatch from localStorage */}
                {mounted && store.recentScripts.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Eye className="size-3.5 text-muted-foreground" />
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Recently Viewed</span>
                      </div>
                      {store.recentScripts.map((id: string) => {
                        const s = scripts.find(sc => sc.id === id);
                        if (!s) return null;
                        return (
                          <button key={id} className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors group" onClick={() => onSelectScript(s)}>
                            <LanguageIcon language={s.language} className="text-[11px] shrink-0" />
                            <span className="truncate group-hover:text-foreground transition-colors">{s.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Recently Executed — only after mount to prevent hydration mismatch from localStorage */}
                {mounted && store.recentExecutions.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <History className="size-3.5 text-muted-foreground" />
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Recently Executed</span>
                      </div>
                      <div className="relative pl-3">
                        {/* Vertical timeline line */}
                        {store.recentExecutions.length > 1 && (
                          <div className="timeline-line" />
                        )}
                        {store.recentExecutions.map((exec: any, idx: number) => {
                          const s = scripts.find(sc => sc.id === exec.id);
                          const timeAgo = formatDistanceToNow(new Date(exec.timestamp), { addSuffix: true });
                          const isSuccess = exec.status === 'success';
                          const isNewest = idx === 0;
                          return (
                            <motion.button
                              key={exec.id + '-' + idx}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05, duration: 0.2 }}
                              className="relative w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 transition-colors group"
                              onClick={() => { if (s) onSelectScript(s); }}
                            >
                              {/* Colored dot on the timeline */}
                              <span
                                className={`relative z-10 shrink-0 rounded-full ${
                                  isSuccess ? 'bg-emerald-500' : 'bg-red-500'
                                } ${isNewest ? 'size-3 timeline-dot-pulse' : 'size-2'}`}
                                style={{ marginLeft: '-21px' }}
                              />
                              <span className="truncate group-hover:text-foreground transition-colors flex-1">{s?.name || exec.name}</span>
                              <span className="text-[9px] text-muted-foreground/50 shrink-0">{timeAgo}</span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* Execution Activity Heatmap — only after mount */}
                {mounted && totalExecutions > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Activity className="size-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground font-medium">Activity</span>
                        </div>
                        <span className="text-[9px] text-muted-foreground/50">12 weeks</span>
                      </div>
                      <ActivityHeatmap recentExecutions={store.recentExecutions} />
                    </div>
                  </>
                )}

                {/* Related Scripts -- shows scripts with same category/language as selected */}
                {relatedScripts.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <FolderOpen className="size-3.5 text-muted-foreground" />
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Related</span>
                        <Badge variant="secondary" className="text-[8px] px-1 ml-auto">{relatedScripts.length}</Badge>
                      </div>
                      {relatedScripts.map(({ script: s, score }, idx) => (
                        <motion.button
                          key={s.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.04, duration: 0.2 }}
                          className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 transition-colors group"
                          onClick={() => onSelectScript(s)}
                        >
                          <LanguageIcon language={s.language} className="text-[11px] shrink-0" />
                          <span className="truncate group-hover:text-foreground transition-colors flex-1">{s.name}</span>
                          <span className="text-[8px] text-muted-foreground/40 shrink-0">{s.category}</span>
                        </motion.button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
            {/* Fade-out gradient at bottom of scrollable area */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-muted/20 to-transparent pointer-events-none z-10" />

            <div className="border-t p-2 flex justify-between items-center">
              <span className="text-[9px] text-muted-foreground/50 tabular-nums px-1">{sidebarWidth}px</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-sm" onClick={store.toggleSidebar}>
                    <ChevronLeft className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Collapse sidebar</TooltipContent>
              </Tooltip>
            </div>
            </div>
        </aside>
      )}

      {!store.sidebarOpen && (
        <div className="hidden lg:flex flex-col items-center pt-3 border-r bg-muted/20">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={store.toggleSidebar}>
                <ChevronRight className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Expand sidebar</TooltipContent>
          </Tooltip>
        </div>
      )}
    </>
  );
}

// ─── Mobile Sidebar Sheet ──────────────────────────────────────────

export function MobileSidebarSheet({
  open, onOpenChange, totalScripts, recentRuns, sortedCategories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalScripts: number;
  recentRuns: number;
  sortedCategories: [string, number][];
}) {
  const store = useScriptStore();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0 bg-black/60 [&>div]:bg-background/95 [&>div]:backdrop-blur-md">
        <SheetHeader className="p-4 pb-2">
          <SheetTitle className="flex items-center gap-2">
            <div className="size-7 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <Zap className="size-3.5 text-white" />
            </div>
            ScriptHub
          </SheetTitle>
          <SheetDescription>Manage and execute your scripts</SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <div className="p-4 pt-0 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border p-2 text-center"><div className="text-sm font-bold text-emerald-600">{totalScripts}</div><div className="text-[9px] text-muted-foreground">Scripts</div></div>
              <div className="rounded-lg border p-2 text-center"><div className="text-sm font-bold text-amber-600">{recentRuns}</div><div className="text-[9px] text-muted-foreground">Runs</div></div>
              <div className="rounded-lg border p-2 text-center"><div className="text-sm font-bold text-rose-500">{store.favorites.length}</div><div className="text-[9px] text-muted-foreground">Favs</div></div>
            </div>
            <div className="space-y-0.5">
              <SidebarItem active={store.selectedCategory === 'All'} onClick={() => { store.setSelectedCategory('All'); onOpenChange(false); }} icon={<Hash className="size-3.5" />} label="All Scripts" count={totalScripts} dotColor="bg-emerald-500" />
              <SidebarItem active={store.selectedCategory === 'Favorites'} onClick={() => { store.setSelectedCategory('Favorites'); onOpenChange(false); }} icon={<Heart className="size-3.5" />} label="Favorites" count={store.favorites.length} dotColor="bg-rose-500" />
              <SidebarItem active={store.selectedCategory === 'Recent'} onClick={() => { store.setSelectedCategory('Recent'); onOpenChange(false); }} icon={<Clock className="size-3.5" />} label="Recent" count={store.recentScripts.length} dotColor="bg-amber-500" />
            </div>
            <Separator />
            <div className="space-y-0.5">
              {sortedCategories.map(([cat, count]) => (
                <SidebarItem key={cat} active={store.selectedCategory === cat} onClick={() => { store.setSelectedCategory(cat); onOpenChange(false); }} label={cat} count={count} dotColor={catDotColors[cat] || 'bg-gray-400'} empty={count === 0} />
              ))}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
