// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { motion, AnimatePresence } from '@/lib/framer-motion-shim';
import {
  Activity, CheckCircle2, XCircle, Clock, Zap, TrendingUp,
  Terminal, Play, BarChart3, Timer, Loader2, Download,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// ─── Types ──────────────────────────────────────────────────────

interface ExecutionRecord {
  id: string;
  scriptId: string;
  scriptName: string;
  status: string;
  duration: number;
  output: string;
  error: string;
  exitCode: number | null;
  createdAt: string;
}

interface ExecutionStats {
  totalRuns: number;
  successCount: number;
  errorCount: number;
  runningCount: number;
  avgDuration: number;
  successRate: number;
}

interface DailyTrendItem {
  date: string;
  count: number;
  successCount: number;
  errorCount: number;
}

interface TopScriptItem {
  scriptId: string;
  scriptName: string;
  count: number;
  avgDuration: number;
  successRate: number;
}

interface ExecutionHistoryResponse {
  executions: ExecutionRecord[];
  stats: ExecutionStats;
  dailyTrend: DailyTrendItem[];
  topScripts: TopScriptItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

type PeriodOption = '24h' | '7d' | '30d' | 'all';

// ─── Mini Sparkline ──────────────────────────────────────────────
function MiniSparkline({ data, width = 48, height = 16, color = '#10b981' }: { data: number[]; width?: number; height?: number; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width, height }}>
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Skeleton Loader ──────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-xl p-3 bg-muted/30 border border-border/50 animate-pulse">
      <div className="flex items-center gap-1 mb-1">
        <div className="size-3.5 rounded bg-muted-foreground/10" />
        <div className="h-2.5 w-12 rounded bg-muted-foreground/10" />
      </div>
      <div className="h-5 w-16 rounded bg-muted-foreground/15" />
    </div>
  );
}

function SkeletonBar() {
  return (
    <div className="flex items-end gap-2 h-20 px-1">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full rounded-t-sm bg-muted-foreground/10 animate-pulse" style={{ height: `${20 + Math.random() * 40}px` }} />
          <div className="h-2 w-4 rounded bg-muted-foreground/10" />
        </div>
      ))}
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg animate-pulse">
          <div className="size-3 rounded-full bg-muted-foreground/10" />
          <div className="h-3 flex-1 rounded bg-muted-foreground/10" />
          <div className="h-3 w-8 rounded bg-muted-foreground/10" />
        </div>
      ))}
    </div>
  );
}

// ─── ExecStatsDialog ──────────────────────────────────────────────
export function ExecStatsDialog({
  scripts,
  totalExecutions,
  externalTriggerCount,
}: {
  scripts: Array<{
    id: string;
    name: string;
    _count?: { executions: number };
  }>;
  totalExecutions: number;
  externalTriggerCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<PeriodOption>('7d');
  const [data, setData] = useState<ExecutionHistoryResponse | null>(null);

  // Sync external trigger counter
  const prevTriggerRef = useRef(0);
  useEffect(() => {
    if (externalTriggerCount !== undefined && externalTriggerCount > prevTriggerRef.current) {
      prevTriggerRef.current = externalTriggerCount;
      setOpen(true);
    }
  }, [externalTriggerCount]);

  useEffect(() => { setMounted(true); }, []);

  // Fetch data from API
  const fetchData = useCallback(async (selectedPeriod: PeriodOption) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/executions?period=${selectedPeriod}&limit=200`);
      if (!response.ok) throw new Error('Failed to fetch');
      const result: ExecutionHistoryResponse = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch execution history:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data when dialog opens or period changes
  useEffect(() => {
    if (open) {
      fetchData(period);
    }
  }, [open, period, fetchData]);

  const stats = data?.stats || { totalRuns: 0, successCount: 0, errorCount: 0, runningCount: 0, avgDuration: 0, successRate: 0 };
  const dailyTrend = data?.dailyTrend || [];
  const topScripts = data?.topScripts || [];
  const executions = data?.executions || [];

  const maxTrend = Math.max(...dailyTrend.map(d => d.count), 1);

  // Period label map
  const periodLabels: Record<PeriodOption, string> = {
    '24h': 'Last 24 Hours',
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    'all': 'All Time',
  };

  if (!mounted) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="exec-stats-trigger flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
            bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400
            border border-emerald-200 dark:border-emerald-800
            hover:bg-emerald-100 dark:hover:bg-emerald-950/50
            hover:border-emerald-300 dark:hover:border-emerald-700
            transition-all duration-200 hover:shadow-sm hover:shadow-emerald-100 dark:hover:shadow-emerald-950/20"
          onClick={() => setOpen(true)}
        >
          <Activity className="size-3.5" />
          <span>Exec Stats</span>
          {totalExecutions > 0 && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[9px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
              {totalExecutions}
            </Badge>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2">
              <Activity className="size-4 text-emerald-500" />
              Execution Statistics
            </DialogTitle>
            {/* Period Selector + Export */}
            <div className="flex items-center gap-2">
              <Select value={period} onValueChange={(v) => setPeriod(v as PeriodOption)}>
                <SelectTrigger className="w-[140px] h-7 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
              <button
                type="button"
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-muted-foreground border border-border/60 bg-background/80 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 dark:hover:bg-emerald-950/30 dark:hover:border-emerald-800 dark:hover:text-emerald-400 transition-all active:scale-95"
                onClick={() => {
                  window.open(`/api/executions/export?period=${period}`, '_blank');
                }}
                aria-label="Export execution history as CSV"
              >
                <Download className="size-3" />
                Export CSV
              </button>
            </div>
          </div>
          <DialogDescription>
            Overview of script execution statistics and trends for {periodLabels[period].toLowerCase()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {loading && !data ? (
            <>
              {/* Loading skeleton */}
              <div className="grid grid-cols-3 gap-3">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="size-3" />
                  Weekly Trend
                </h3>
                <SkeletonBar />
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Zap className="size-3" />
                  Most Executed
                </h3>
                <SkeletonList />
              </div>
            </>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Runs', value: stats.totalRuns, icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
                  { label: 'Avg Duration', value: stats.avgDuration > 0 ? `${(stats.avgDuration / 1000).toFixed(1)}s` : 'N/A', icon: Clock, color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-950/30' },
                  { label: 'Success Rate', value: `${stats.successRate}%`, icon: CheckCircle2, color: stats.successRate >= 80 ? 'text-emerald-500' : stats.successRate >= 50 ? 'text-amber-500' : 'text-red-500', bg: stats.successRate >= 80 ? 'bg-emerald-50 dark:bg-emerald-950/30' : stats.successRate >= 50 ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-red-50 dark:bg-red-950/30' },
                ].map((card, i) => (
                  <motion.div
                    key={card.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={`stat-card rounded-xl p-3 ${card.bg} border border-border/50`}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <card.icon className={`size-3.5 ${card.color}`} />
                      <span className="text-[9px] text-muted-foreground font-medium">{card.label}</span>
                    </div>
                    <span className={`stat-number text-lg font-bold ${card.color}`}>{card.value}</span>
                  </motion.div>
                ))}
              </div>

              {/* Status Breakdown */}
              {stats.totalRuns > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="space-y-2"
                >
                  <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <BarChart3 className="size-3" />
                    Status Breakdown
                  </h3>
                  <div className="space-y-1.5">
                    {[
                      { label: 'Success', count: stats.successCount, color: 'bg-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle2 },
                      { label: 'Error', count: stats.errorCount, color: 'bg-red-500', textColor: 'text-red-600 dark:text-red-400', icon: XCircle },
                      { label: 'Running', count: stats.runningCount, color: 'bg-amber-500', textColor: 'text-amber-600 dark:text-amber-400', icon: Timer },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <item.icon className={`size-3 ${item.textColor}`} />
                        <span className="text-[10px] text-muted-foreground w-14">{item.label}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${item.color}`}
                            initial={{ width: 0 }}
                            animate={{ width: stats.totalRuns > 0 ? `${(item.count / stats.totalRuns) * 100}%` : '0%' }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                          />
                        </div>
                        <span className={`text-[10px] font-semibold ${item.textColor} w-6 text-right tabular-nums`}>{item.count}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Daily Trend */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="space-y-2"
              >
                <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="size-3" />
                  {period === '24h' ? 'Hourly Trend' : period === 'all' ? 'Daily Trend (Last 30 Days)' : 'Daily Trend'}
                </h3>
                {dailyTrend.length > 0 ? (
                  <div className="flex items-end gap-1 h-20 px-1 overflow-x-auto">
                    {dailyTrend.map((day, i) => {
                      const dayLabel = new Date(day.date + 'T00:00:00').toLocaleDateString('en', { weekday: 'short' });
                      const dateLabel = new Date(day.date + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' });
                      const showLabel = dailyTrend.length <= 7 || i % Math.ceil(dailyTrend.length / 7) === 0;
                      return (
                        <div key={day.date} className="flex-1 min-w-[20px] flex flex-col items-center gap-1">
                          <motion.div
                            className="exec-trend-bar w-full rounded-t-sm bg-emerald-400 dark:bg-emerald-500 min-h-[2px] relative group cursor-default"
                            initial={{ height: 0 }}
                            animate={{ height: `${Math.max((day.count / maxTrend) * 60, 2)}px` }}
                            transition={{ duration: 0.5, delay: 0.4 + i * 0.03 }}
                          >
                            {/* Hover tooltip */}
                            {day.count > 0 && (
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center justify-center px-1.5 py-0.5 rounded bg-popover border text-[8px] whitespace-nowrap z-20 shadow-sm">
                                {dateLabel}: {day.count} runs
                              </div>
                            )}
                          </motion.div>
                          {showLabel && (
                            <span className="text-[7px] text-muted-foreground">{dailyTrend.length <= 7 ? dayLabel.slice(0, 2) : dateLabel.split(' ')[1]}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-20 flex items-center justify-center">
                    <span className="text-[10px] text-muted-foreground/40">No trend data available</span>
                  </div>
                )}
              </motion.div>

              {/* Top Scripts */}
              {topScripts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-2"
                >
                  <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Zap className="size-3" />
                    Most Executed
                  </h3>
                  <div className="space-y-1">
                    {topScripts.slice(0, 5).map((script, i) => (
                      <motion.div
                        key={script.scriptId}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.55 + i * 0.06 }}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-[9px] font-bold text-muted-foreground/50 w-3">{i + 1}</span>
                        {script.successRate >= 80 && <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />}
                        {script.successRate < 80 && script.successRate >= 50 && <Timer className="size-3 text-amber-500 shrink-0" />}
                        {script.successRate < 50 && script.count > 0 && <XCircle className="size-3 text-red-500 shrink-0" />}
                        {script.count === 0 && <Play className="size-3 text-muted-foreground shrink-0" />}
                        <span className="text-[11px] truncate flex-1">{script.scriptName}</span>
                        {script.avgDuration > 0 && (
                          <span className="text-[9px] text-muted-foreground tabular-nums">
                            {(script.avgDuration / 1000).toFixed(1)}s
                          </span>
                        )}
                        <Badge variant="secondary" className="h-4 px-1.5 text-[9px] shrink-0">
                          {script.count}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Recent Activity Timeline */}
              {executions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="space-y-2"
                >
                  <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Clock className="size-3" />
                    Recent Activity
                  </h3>
                  <div className="space-y-1.5 pl-2">
                    {executions.slice(0, 8).map((exec, i) => (
                      <motion.div
                        key={exec.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.75 + i * 0.05 }}
                        className="flex items-center gap-2 relative"
                      >
                        {/* Timeline line */}
                        {i < Math.min(executions.length, 8) - 1 && (
                          <div className="absolute left-[5px] top-3 bottom-0 w-px bg-border" />
                        )}
                        {/* Dot */}
                        <div className={`timeline-dot size-[10px] rounded-full shrink-0 z-10 ${
                          exec.status === 'success' ? 'bg-emerald-500' :
                          exec.status === 'error' ? 'bg-red-500' : 'bg-amber-500'
                        }`} />
                        <span className="text-[10px] truncate flex-1">{exec.scriptName}</span>
                        {exec.duration > 0 && (
                          <span className="text-[9px] text-muted-foreground tabular-nums">
                            {exec.duration >= 1000 ? `${(exec.duration / 1000).toFixed(1)}s` : `${exec.duration}ms`}
                          </span>
                        )}
                        <span className="text-[9px] text-muted-foreground">
                          {formatDistanceToNow(new Date(exec.createdAt), { addSuffix: true })}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Empty state */}
              {stats.totalRuns === 0 && !loading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-8 text-center"
                >
                  <div className="quick-run-empty mb-3">
                    <Terminal className="size-10 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground">No executions found</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {period === 'all'
                      ? 'Run a script to see execution statistics here'
                      : `No executions in the ${periodLabels[period].toLowerCase()}. Try a different period.`}
                  </p>
                </motion.div>
              )}
            </>
          )}

          {/* Loading overlay when refetching */}
          {loading && data && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="size-4 text-emerald-500 animate-spin" />
              <span className="text-[10px] text-muted-foreground ml-2">Updating...</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
