// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Clock, CalendarClock, Play, Trash2, AlertCircle, Plus, Loader2, Check, X, FileCode, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from '@/lib/framer-motion-shim';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface ScheduleItem {
  id: string;
  scriptId: string;
  scriptName: string;
  enabled: boolean;
  frequency: string;
  customCron: string;
  lastRun: string | null;
  lastRunStatus: string | null;
  lastRunDuration: number | null;
  createdAt: string;
}

const SCHEDULES_KEY = 'scripthub-schedules';

const PRESET_CRONS: Record<string, string> = {
  'every-hour': '0 * * * *',
  'every-6-hours': '0 */6 * * *',
  'daily': '0 0 * * *',
  'weekly': '0 0 * * 0',
  'monthly': '0 0 1 * *',
};

const PRESET_LABELS: Record<string, string> = {
  'every-hour': 'Every hour',
  'every-6-hours': 'Every 6 hours',
  'daily': 'Daily (midnight)',
  'weekly': 'Weekly (Sunday midnight)',
  'monthly': 'Monthly (1st midnight)',
};

function getCronExpression(frequency: string, customCron: string): string {
  if (frequency === 'custom') return customCron;
  return PRESET_CRONS[frequency] || '0 * * * *';
}

function computeNextRun(cronExpr: string): string {
  try {
    const parts = cronExpr.trim().split(/\s+/);
    if (parts.length < 5) return 'Invalid cron expression';
    const now = new Date();
    const minute = parts[0] === '*' ? 0 : parseInt(parts[0], 10) || 0;
    const hour = parts[1] === '*' ? new Date().getHours() : parts[1].startsWith('*/') ? new Date().getHours() + parseInt(parts[1].slice(2), 10) : parseInt(parts[1], 10) || 0;
    const dayOfMonth = parts[2] === '*' ? now.getDate() : parseInt(parts[2], 10) || now.getDate();
    const month = now.getMonth();
    const year = now.getFullYear();
    let next = new Date(year, month, dayOfMonth, hour, minute, 0);
    if (next <= now) {
      if (parts[1].startsWith('*/')) {
        const step = parseInt(parts[1].slice(2), 10) || 1;
        next.setHours(next.getHours() + step);
      } else if (parts[0] === '0' && parts[1] === '0' && parts[2] === '*' && parts[3] === '*' && parts[4] === '*') {
        next.setDate(next.getDate() + 1);
      } else {
        next.setHours(next.getHours() + 1);
      }
    }
    if (isNaN(next.getTime())) return 'Unable to calculate';
    const diffMs = next.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `in ~${diffMins} minutes`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `in ~${diffHours}h ${diffMins % 60}m`;
    const diffDays = Math.floor(diffHours / 24);
    return `in ~${diffDays}d ${diffHours % 24}h`;
  } catch {
    return 'Unable to calculate';
  }
}

function loadAllSchedules(): ScheduleItem[] {
  try {
    const raw = localStorage.getItem(SCHEDULES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAllSchedules(items: ScheduleItem[]) {
  try {
    localStorage.setItem(SCHEDULES_KEY, JSON.stringify(items));
  } catch { /* ignore */ }
}

function loadScriptSchedule(scriptId: string): ScheduleItem | null {
  const schedules = loadAllSchedules();
  return schedules.find(s => s.scriptId === scriptId) || null;
}

function saveScriptSchedule(item: ScheduleItem) {
  const schedules = loadAllSchedules();
  const idx = schedules.findIndex(s => s.scriptId === item.scriptId);
  if (idx >= 0) {
    schedules[idx] = item;
  } else {
    schedules.push(item);
  }
  saveAllSchedules(schedules);
}

function deleteScriptSchedule(id: string) {
  const schedules = loadAllSchedules().filter(s => s.id !== id);
  saveAllSchedules(schedules);
}

export function ScheduleTab({ scriptId, scriptName }: { scriptId: string; scriptName: string }) {
  const [schedule, setSchedule] = useState<ScheduleItem>(() => {
    const existing = loadScriptSchedule(scriptId);
    if (existing) return existing;
    return {
      id: `sched-${Date.now()}`,
      scriptId,
      scriptName,
      enabled: false,
      frequency: 'every-hour',
      customCron: '0 */2 * * *',
      lastRun: null,
      lastRunStatus: null,
      lastRunDuration: null,
      createdAt: new Date().toISOString(),
    };
  });

  const [savedSchedules, setSavedSchedulesState] = useState<ScheduleItem[]>(() =>
    loadAllSchedules().filter(s => s.scriptId !== scriptId)
  );

  const [saving, setSaving] = useState(false);

  const cronExpr = useMemo(() => getCronExpression(schedule.frequency, schedule.customCron), [schedule.frequency, schedule.customCron]);
  const nextRunLabel = useMemo(() => schedule.enabled ? computeNextRun(cronExpr) : null, [schedule.enabled, cronExpr]);

  const persistSchedule = useCallback((data: ScheduleItem) => {
    setSchedule(data);
    saveScriptSchedule(data);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      persistSchedule({ ...schedule });
      toast.success('Schedule saved');
    } catch {
      toast.error('Failed to save schedule');
    }
    setSaving(false);
  }, [schedule, persistSchedule]);

  const handleTestRun = useCallback(async () => {
    try {
      toast.info('Running scheduled test execution...');
      const r = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: scriptId, params: {}, inputFiles: {} }),
      });
      const data = await r.json();
      persistSchedule({
        ...schedule,
        lastRun: new Date().toISOString(),
        lastRunStatus: data.status,
        lastRunDuration: data.duration,
      });
      toast.success(data.status === 'success' ? 'Scheduled run completed' : 'Scheduled run failed');
    } catch {
      toast.error('Scheduled test run failed');
    }
  }, [scriptId, schedule, persistSchedule]);

  const handleClearSchedule = useCallback(() => {
    const fresh: ScheduleItem = {
      id: `sched-${Date.now()}`,
      scriptId,
      scriptName,
      enabled: false,
      frequency: 'every-hour',
      customCron: '0 */2 * * *',
      lastRun: null,
      lastRunStatus: null,
      lastRunDuration: null,
      createdAt: new Date().toISOString(),
    };
    persistSchedule(fresh);
    toast.success('Schedule cleared');
  }, [scriptId, scriptName, persistSchedule]);

  const handleDeleteSchedule = useCallback((id: string) => {
    deleteScriptSchedule(id);
    setSavedSchedulesState(loadAllSchedules().filter(s => s.scriptId !== scriptId));
    toast.success('Schedule deleted');
  }, [scriptId]);

  const handleRunNow = useCallback(async (sched: ScheduleItem) => {
    try {
      toast.info(`Running ${sched.scriptName}...`);
      const r = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sched.scriptId, params: {}, inputFiles: {} }),
      });
      const data = await r.json();
      const updatedSchedules = loadAllSchedules().map(s =>
        s.id === sched.id ? { ...s, lastRun: new Date().toISOString(), lastRunStatus: data.status, lastRunDuration: data.duration }
        : s
      );
      saveAllSchedules(updatedSchedules);
      setSavedSchedulesState(updatedSchedules.filter(s => s.scriptId !== scriptId));
      toast.success(data.status === 'success' ? `${sched.scriptName} completed` : `${sched.scriptName} failed`);
    } catch {
      toast.error(`Failed to run ${sched.scriptName}`);
    }
  }, [scriptId]);

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-4">
      <div className="mt-3 space-y-4">
        {/* Schedule status card */}
        <div className={`rounded-lg border p-4 space-y-3 transition-colors ${
          schedule.enabled
            ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20'
            : 'border-muted'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`size-8 rounded-lg flex items-center justify-center ${
                schedule.enabled
                  ? 'bg-emerald-100 dark:bg-emerald-900/30'
                  : 'bg-muted'
              }`}>
                <CalendarClock className={`size-4 ${schedule.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <span className="text-xs font-semibold">Script Schedule</span>
                <p className="text-[10px] text-muted-foreground">
                  {schedule.enabled ? 'Active — auto-execution enabled' : 'Inactive — schedule paused'}
                </p>
              </div>
            </div>
            <Switch
              checked={schedule.enabled}
              onCheckedChange={(checked) => persistSchedule({ ...schedule, enabled: checked })}
            />
          </div>

          {/* Next run & last run */}
          <div className="grid grid-cols-2 gap-2">
            {schedule.enabled && nextRunLabel && (
              <div className="rounded-md bg-background/60 dark:bg-background/40 p-2.5 space-y-0.5">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="size-2.5" />Next Run
                </div>
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{nextRunLabel}</p>
                <p className="text-[9px] font-mono text-muted-foreground">{cronExpr}</p>
              </div>
            )}
            {schedule.lastRun && (
              <div className="rounded-md bg-background/60 dark:bg-background/40 p-2.5 space-y-0.5">
                <div className="text-[10px] text-muted-foreground">Last Run</div>
                <div className="flex items-center gap-1">
                  <span className={`size-1.5 rounded-full ${schedule.lastRunStatus === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <p className="text-xs font-semibold capitalize">{schedule.lastRunStatus}</p>
                </div>
                {schedule.lastRunDuration && (
                  <p className="text-[9px] text-muted-foreground">
                    {schedule.lastRunDuration >= 1000 ? `${(schedule.lastRunDuration / 1000).toFixed(2)}s` : `${schedule.lastRunDuration}ms`}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Frequency selector */}
        <div className="space-y-1.5">
          <Label className="text-xs">Frequency</Label>
          <Select
            value={schedule.frequency}
            onValueChange={(v) => persistSchedule({ ...schedule, frequency: v })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PRESET_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key} className="text-xs">
                  <div className="flex items-center gap-2">
                    <span>{label}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{PRESET_CRONS[key]}</span>
                  </div>
                </SelectItem>
              ))}
              <SelectItem value="custom" className="text-xs">Custom cron expression...</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {schedule.frequency === 'custom' && (
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              Cron Expression
              <Badge variant="outline" className="text-[8px] h-3.5 px-1">min hour day month weekday</Badge>
            </Label>
            <Input
              value={schedule.customCron}
              onChange={e => persistSchedule({ ...schedule, customCron: e.target.value })}
              placeholder="0 * * * *"
              className="h-8 text-xs font-mono"
            />
            <p className="text-[9px] text-muted-foreground">
              Standard 5-field cron format. Example: &quot;0 */2 * * *&quot; = every 2 hours
            </p>
          </div>
        )}

        {/* Info notice */}
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3 flex items-start gap-2">
          <AlertCircle className="size-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-[10px] text-amber-700 dark:text-amber-400 space-y-0.5">
            <p className="font-medium">Note: Client-side scheduling</p>
            <p>Schedules are stored in your browser&apos;s localStorage. The script will auto-execute when this page is open and the next run time is reached.</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-xs border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/30 active:scale-95 transition-transform"
            onClick={handleTestRun}
          >
            <Play className="size-3.5" />
            Test Run Now
          </Button>
          {(schedule.enabled || schedule.lastRun) && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-destructive hover:text-destructive active:scale-95 transition-transform"
              onClick={handleClearSchedule}
            >
              <Trash2 className="size-3.5" />
              Clear
            </Button>
          )}
        </div>

        {/* Saved Schedules List */}
        {savedSchedules.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Other Saved Schedules ({savedSchedules.length})
            </h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {savedSchedules.map(sched => {
                  const schedCron = getCronExpression(sched.frequency, sched.customCron);
                  const nextLabel = sched.enabled ? computeNextRun(schedCron) : null;
                  return (
                    <motion.div
                      key={sched.id}
                      layout
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="rounded-lg border p-3 space-y-2 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`size-6 rounded-md flex items-center justify-center ${
                            sched.enabled
                              ? 'bg-emerald-100 dark:bg-emerald-900/30'
                              : 'bg-muted'
                          }`}>
                            <CalendarClock className={`size-3 ${sched.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{sched.scriptName}</p>
                            <p className="text-[9px] text-muted-foreground font-mono">{schedCron}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {sched.enabled && nextLabel && (
                            <Badge variant="secondary" className="text-[8px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              {nextLabel}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="xs"
                          variant="outline"
                          className="flex-1 gap-1 text-[10px] h-6 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
                          onClick={() => handleRunNow(sched)}
                        >
                          <Play className="size-2.5" />Run Now
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          className="gap-1 text-[10px] h-6 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteSchedule(sched.id)}
                        >
                          <Trash2 className="size-2.5" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* ─── Execution Queue Visualization ────────────────── */}
        <div className="mt-6 space-y-2">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Play className="size-3" />Execution Queue Preview
          </h4>
          <div className="queue-item-enter rounded-lg border overflow-hidden exec-queue-container">
            <div className="px-3 py-2 bg-gradient-to-r from-emerald-50 to-sky-50 dark:from-emerald-950/20 dark:to-sky-950/20 border-b flex items-center gap-2">
              <span className="text-[10px] font-medium">Queue</span>
              <Badge variant="secondary" className="text-[8px]">
                {savedSchedules.slice(0, 4).length || savedSchedules.length || 4} scripts
              </Badge>
            </div>
            <div className="p-2 space-y-1.5">
              {(savedSchedules.length > 0 ? savedSchedules.slice(0, 4) : [
                { id: 'demo-1', scriptName: 'load_structure.py', lastRunStatus: 'success', lastRunDuration: 1200 },
                { id: 'demo-2', scriptName: 'generate_report.py', lastRunStatus: 'pending', lastRunDuration: null },
                { id: 'demo-3', scriptName: 'run_analysis.py', lastRunStatus: 'pending', lastRunDuration: null },
                { id: 'demo-4', scriptName: 'cleanup_data.py', lastRunStatus: 'pending', lastRunDuration: null },
              ]).map((item, idx) => {
                const statusIcon = item.lastRunStatus === 'success' ? (
                  <Check className="size-3 text-emerald-500" />
                ) : item.lastRunStatus === 'error' ? (
                  <X className="size-3 text-red-500" />
                ) : idx === 0 ? (
                  <span className="size-3 rounded-full bg-emerald-400 running-indicator" />
                ) : (
                  <span className="size-3 rounded-full bg-muted-foreground/30" />
                );
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 80, duration: 0.2 }}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[10px] transition-colors ${
                      item.lastRunStatus === 'success' ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                      : item.lastRunStatus === 'error' ? 'bg-red-50/50 dark:bg-red-950/20'
                      : ''
                    }`}
                  >
                    <span className="shrink-0">{statusIcon}</span>
                    <FileCode className="size-3 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate font-medium text-foreground">{item.scriptName}</span>
                    {item.lastRunDuration && (
                      <span className="text-[9px] text-muted-foreground font-mono shrink-0 flex items-center gap-0.5">
                        <Timer className="size-2.5" />
                        {item.lastRunDuration >= 1000 ? `${(item.lastRunDuration / 1000).toFixed(1)}s` : `${item.lastRunDuration}ms`}
                      </span>
                    )}
                    <Badge variant="outline" className={`text-[8px] px-1.5 h-4 ${
                      item.lastRunStatus === 'success'
                        ? 'text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700'
                        : item.lastRunStatus === 'error'
                        ? 'text-red-600 dark:text-red-400 border-red-300 dark:border-red-700'
                        : 'text-muted-foreground border-border'
                    }`}>
                      {item.lastRunStatus === 'success' ? 'done' : item.lastRunStatus === 'error' ? 'error' : idx === 0 ? 'running' : 'pending'}
                    </Badge>
                  </motion.div>
                );
              })}
            </div>
            {/* Progress bar */}
            <div className="mx-2 mb-2">
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="queue-complete-bar h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                  style={{ '--queue-complete': `${(savedSchedules.length > 0 ? 25 : 0)}%` } as React.CSSProperties}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
