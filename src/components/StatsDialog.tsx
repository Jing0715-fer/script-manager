'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  BarChart3, Code2, FileText, Zap, TrendingUp, Activity,
  Crown, Gauge, Trophy, Clock, HardDrive, Layers,
} from 'lucide-react';
import { motion } from '@/lib/framer-motion-shim';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { catDotColors, catBgColors, catBarColors } from '@/lib/shared-constants';
import type { ScriptData } from '@/types';
import { LanguageIcon } from '@/components/LanguageIcon';
import type { Notification } from '@/store/script-store';

// ─── Animated Number Counter ─────────────────────────────────────
function AnimatedNumber({ value, duration = 600 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const [prevValue, setPrevValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    startedRef.current = true;
    const start = prevValue;
    const end = value;
    if (start === end) return;
    if (!startedRef.current) return;
    const startTime = Date.now();
    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(step);
      else setPrevValue(end);
    };
    requestAnimationFrame(step);
  }, [value, duration, prevValue]);

  return <>{count}</>;
}

// ─── Format Relative Time ──────────────────────────────────────────
function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 5000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// ─── Stats Dialog Component ─────────────────────────────────────────

export function StatsDialog({
  open, onOpenChange, scripts, totalExecutions, notifications,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scripts: ScriptData[];
  totalExecutions: number;
  notifications?: Notification[];
}) {
  // Language distribution
  const langDist: Record<string, number> = {};
  scripts.forEach(s => { langDist[s.language] = (langDist[s.language] || 0) + 1; });
  const langEntries = Object.entries(langDist).sort((a, b) => b[1] - a[1]);

  // Category distribution
  const catDist: Record<string, number> = {};
  scripts.forEach(s => { const cat = s.category || 'Uncategorized'; catDist[cat] = (catDist[cat] || 0) + 1; });
  const catEntries = Object.entries(catDist).sort((a, b) => b[1] - a[1]);

  // Most popular scripts (top 5)
  const popularScripts = [...scripts].sort((a, b) => (b._count?.executions || 0) - (a._count?.executions || 0)).slice(0, 5);

  // Total lines of code
  const totalLines = scripts.reduce((acc, s) => acc + (s.content?.split('\n').length || 0), 0);

  // Average script length
  const avgScriptLength = scripts.length > 0 ? Math.round(totalLines / scripts.length) : 0;

  // Most used language
  const mostUsedLanguage = langEntries.length > 0 ? langEntries[0] : null;

  // Max execution count for bar scaling
  const maxExecCount = Math.max(...popularScripts.map(s => s._count?.executions || 0), 1);

  // Script size distribution
  const sizeDistribution = useMemo(() => {
    let small = 0; // < 20 lines
    let medium = 0; // 20-100 lines
    let large = 0; // > 100 lines
    scripts.forEach(s => {
      const lines = (s.content?.split('\n').length || 0);
      if (lines < 20) small++;
      else if (lines <= 100) medium++;
      else large++;
    });
    return { small, medium, large };
  }, [scripts]);

  const maxBucket = Math.max(sizeDistribution.small, sizeDistribution.medium, sizeDistribution.large, 1);

  // Recent activity timeline from notifications
  const recentActivity = (notifications || []).slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <BarChart3 className="size-4 text-white" />
            </div>
            Script Statistics
          </DialogTitle>
          <DialogDescription>Overview of your script collection and usage</DialogDescription>
        </DialogHeader>

        <motion.div
          className="space-y-6 pt-2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Summary Cards with gradient borders */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <motion.div
              className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/10 stat-gradient-border p-4 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <FileText className="size-5 mx-auto mb-1.5 text-emerald-600" />
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400"><AnimatedNumber value={scripts.length} /></div>
              <div className="text-xs text-muted-foreground">Total Scripts</div>
            </motion.div>
            <motion.div
              className="rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/10 stat-gradient-border p-4 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
            >
              <Zap className="size-5 mx-auto mb-1.5 text-amber-600" />
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-400"><AnimatedNumber value={totalExecutions} /></div>
              <div className="text-xs text-muted-foreground">Executions</div>
            </motion.div>
            <motion.div
              className="rounded-xl bg-gradient-to-br from-sky-50 to-sky-100/50 dark:from-sky-950/30 dark:to-sky-900/10 stat-gradient-border p-4 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Code2 className="size-5 mx-auto mb-1.5 text-sky-600" />
              <div className="text-2xl font-bold text-sky-700 dark:text-sky-400"><AnimatedNumber value={totalLines} /></div>
              <div className="text-xs text-muted-foreground">Lines of Code</div>
            </motion.div>
            <motion.div
              className="rounded-xl bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/30 dark:to-violet-900/10 stat-gradient-border p-4 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 }}
            >
              <Activity className="size-5 mx-auto mb-1.5 text-violet-600" />
              <div className="text-2xl font-bold text-violet-700 dark:text-violet-400"><AnimatedNumber value={catEntries.length} /></div>
              <div className="text-xs text-muted-foreground">Categories</div>
            </motion.div>
          </div>

          {/* Average script length + Most used language */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Average Script Length */}
            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="size-4 text-emerald-500" />
                <h3 className="text-sm font-semibold">Average Script Length</h3>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-emerald-700 dark:text-emerald-400"><AnimatedNumber value={avgScriptLength} /></span>
                <span className="text-sm text-muted-foreground">lines</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
                  style={{ width: `${Math.min(avgScriptLength / 2, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {avgScriptLength > 100 ? 'Large scripts' : avgScriptLength > 30 ? 'Medium scripts' : 'Compact scripts'} on average
              </p>
            </div>

            {/* Most Used Language */}
            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="size-4 text-amber-500" />
                <h3 className="text-sm font-semibold">Most Used Language</h3>
              </div>
              {mostUsedLanguage ? (
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md">
                    <LanguageIcon language={mostUsedLanguage[0]} className="text-base" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-foreground">{mostUsedLanguage[0]}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{mostUsedLanguage[1]} script{mostUsedLanguage[1] !== 1 ? 's' : ''}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        {Math.round((mostUsedLanguage[1] / scripts.length) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No scripts yet</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Language Distribution - Horizontal bar chart */}
          {langEntries.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Code2 className="size-4 text-emerald-500" />
                Scripts by Language
              </h3>
              <div className="rounded-xl border p-4 space-y-2.5">
                {langEntries.map(([lang, count], idx) => {
                  const pct = Math.max((count / scripts.length) * 100, 4);
                  const isMostUsed = lang === mostUsedLanguage?.[0];
                  return (
                    <motion.div
                      key={lang}
                      className="space-y-1"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + idx * 0.05 }}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium flex items-center gap-1.5">
                          <LanguageIcon language={lang} className="text-xs" />
                          {lang}
                          {isMostUsed && (
                            <Badge variant="secondary" className="text-[8px] px-1 h-3 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              <Crown className="size-2" />
                            </Badge>
                          )}
                        </span>
                        <span className="text-muted-foreground">{count} ({Math.round(pct)}%)</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${isMostUsed ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-emerald-500/70'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5, delay: 0.15 + idx * 0.05, ease: 'easeOut' }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          <Separator />

          {/* Category Breakdown */}
          {catEntries.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <FileText className="size-4 text-emerald-500" />
                Category Breakdown
              </h3>
              <div className="rounded-xl border p-4">
                <div className="flex flex-wrap gap-2">
                  {catEntries.map(([cat, count]) => (
                    <Badge
                      key={cat}
                      variant="secondary"
                      className={`text-xs gap-1.5 ${catBgColors[cat] || catBgColors.Uncategorized}`}
                    >
                      <span className={`size-2 rounded-full ${catDotColors[cat] || 'bg-gray-400'}`} />
                      {cat}
                      <span className="opacity-70">{count}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Script Size Distribution */}
          {scripts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Layers className="size-4 text-violet-500" />
                Script Size Distribution
              </h3>
              <div className="rounded-xl border p-4 space-y-3">
                <div className="flex items-center gap-4">
                  {[
                    { label: 'Small (<20 lines)', count: sizeDistribution.small, color: 'bg-emerald-400', textColor: 'text-emerald-600 dark:text-emerald-400' },
                    { label: 'Medium (20–100)', count: sizeDistribution.medium, color: 'bg-amber-400', textColor: 'text-amber-600 dark:text-amber-400' },
                    { label: 'Large (>100 lines)', count: sizeDistribution.large, color: 'bg-rose-400', textColor: 'text-rose-600 dark:text-rose-400' },
                  ].map((bucket) => (
                    <div key={bucket.label} className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                        <span className="truncate">{bucket.label}</span>
                        <span className={`font-semibold ${bucket.textColor}`}>{bucket.count}</span>
                      </div>
                      <div className="h-3 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${bucket.color}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${(bucket.count / maxBucket) * 100}%` }}
                          transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Most Active Scripts (Top 5) with bar chart */}
          {popularScripts.some(s => (s._count?.executions || 0) > 0) && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Trophy className="size-4 text-amber-500" />
                Most Active Scripts
              </h3>
              <div className="space-y-2">
                {popularScripts.filter(s => (s._count?.executions || 0) > 0).map((s, i) => {
                  const execCount = s._count?.executions || 0;
                  const barPct = Math.max((execCount / maxExecCount) * 100, 5);
                  return (
                    <motion.div
                      key={s.id}
                      className="rounded-lg border p-3"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{s.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{s.description || 'No description'}</div>
                          {/* Simple bar */}
                          <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                              initial={{ width: 0 }}
                              animate={{ width: `${barPct}%` }}
                              transition={{ duration: 0.5, delay: 0.15 + i * 0.05 }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge variant="secondary" className={`text-[10px] ${catBgColors[s.category] || catBgColors.Uncategorized}`}>
                            {s.category}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400">
                            {execCount} run{execCount !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Activity Timeline */}
          {recentActivity.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="size-4 text-sky-500" />
                  Recent Activity
                </h3>
                <div className="rounded-xl border p-4 space-y-2">
                  {recentActivity.map((activity, i) => (
                    <motion.div
                      key={activity.id}
                      className="flex items-start gap-2.5"
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.03 }}
                    >
                      <div className={`size-2 rounded-full mt-1.5 shrink-0 ${
                        activity.type === 'success' ? 'bg-emerald-500' :
                        activity.type === 'error' ? 'bg-red-500' : 'bg-sky-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-snug">{activity.message}</p>
                        <p className="text-[10px] text-muted-foreground">{formatRelativeTime(activity.timestamp)}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
