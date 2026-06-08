'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { APP_VERSION } from '@/lib/shared-constants';
import {
  Code2, FolderOpen, Wifi, WifiOff, Activity, Clock,
  Zap, Heart, Command, Upload, Search,
  FileCode, Hash, Timer, ArrowUp, ExternalLink,
  HelpCircle, Download,
} from 'lucide-react';
import { motion, AnimatePresence } from '@/lib/framer-motion-shim';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Notification } from '@/store/script-store';

// ─── Relative Time Helper ────────────────────────────────────────
function formatRelative(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 5000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// ─── Animated Counter Hook ────────────────────────────────────────
function useAnimatedValue(value: number) {
  const [displayed, setDisplayed] = useState(value);
  const prevRef = React.useRef(value);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev === value) return;
    prevRef.current = value;
    const startTime = Date.now();
    const duration = 300;
    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 2);
      setDisplayed(Math.round(prev + (value - prev) * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);

  return displayed;
}

// ─── Footer Component ─────────────────────────────────────────────

export function Footer({
  totalScripts, categoryCount, apiHealth, footerTime,
  totalExecutions, favoritesCount, notifications,
  totalLines, mostPopularLang, sessionStart,
  langBreakdown, onShortcutsOpen,
}: {
  totalScripts: number;
  categoryCount: number;
  apiHealth: 'checking' | 'ok' | 'error';
  footerTime: string;
  totalExecutions?: number;
  favoritesCount?: number;
  notifications?: Notification[];
  totalLines?: number;
  mostPopularLang?: string;
  sessionStart?: number;
  langBreakdown?: Record<string, number>;
  onShortcutsOpen?: () => void;
}) {
  const [uptime, setUptime] = useState('');
  const [timerMounted, setTimerMounted] = useState(false);

  // Only show timer on client (prevents hydration mismatch)
  useEffect(() => { setTimerMounted(true); }, []);

  // Animated values
  const animScripts = useAnimatedValue(totalScripts);
  const animExecutions = useAnimatedValue(totalExecutions ?? 0);
  const animFavs = useAnimatedValue(favoritesCount ?? 0);

  // Update uptime every second
  useEffect(() => {
    const update = () => {
      if (sessionStart) {
        const diff = Math.floor((Date.now() - sessionStart) / 1000);
        const m = Math.floor(diff / 60);
        const s = diff % 60;
        const h = Math.floor(m / 60);
        if (h > 0) setUptime(`${h}h ${m % 60}m`);
        else if (m > 0) setUptime(`${m}m ${s}s`);
        else setUptime(`${s}s`);
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [sessionStart]);

  // Recent notifications (last 3)
  const recentNotifications = (notifications || []).slice(0, 3);

  // Build detailed tooltip strings
  const scriptsTooltip = useMemo(() => {
    if (!langBreakdown) return `${totalScripts} total scripts`;
    const langs = Object.entries(langBreakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([lang, count]) => `${count} ${lang}`)
      .join(', ');
    return `${totalScripts} total -- ${langs}`;
  }, [totalScripts, langBreakdown]);

  const executionsTooltip = useMemo(() => {
    const total = totalExecutions ?? 0;
    const success = notifications?.filter(n => n.type === 'success' && n.message.includes('completed')).length ?? 0;
    const failed = notifications?.filter(n => n.type === 'error' && n.message.includes('failed')).length ?? 0;
    return `${total} total, ${success} successful, ${failed} failed`;
  }, [totalExecutions, notifications]);

  return (
    <footer className="mt-auto">
      {/* Gradient separator with animation */}
      <div className="gradient-border-top">
        <div className="h-[2px]" />
      </div>

      {/* Quick Stats Row */}
      <div className="bg-gradient-to-r from-emerald-50/60 via-muted/30 to-emerald-50/60 dark:from-emerald-950/20 dark:via-muted/20 dark:to-emerald-950/20 px-4 py-1.5">
        <div className="flex items-center justify-center gap-4 sm:gap-6 text-[10px] text-muted-foreground flex-wrap">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-1.5 transition-all duration-300 hover:text-foreground hover:scale-105 cursor-default" role="status" aria-label={`${totalScripts} scripts total`}>
                <Code2 className="size-3 text-emerald-500" aria-hidden="true" />
                <span className="font-semibold transition-all duration-300">{animScripts}</span> scripts
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-[240px] text-[11px] leading-relaxed">{scriptsTooltip}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <span className="hidden sm:flex items-center gap-1.5 transition-all duration-300 hover:text-foreground hover:scale-105 cursor-default" aria-label={`${categoryCount} categories total`}>
                <FolderOpen className="size-3 text-amber-500" aria-hidden="true" />
                <span className="font-semibold">{categoryCount}</span> categories
              </span>
            </TooltipTrigger>
            <TooltipContent>Script categories in your collection</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-1.5 transition-all duration-300 hover:text-foreground hover:scale-105 cursor-default" aria-label={`${totalExecutions} total executions`}>
                <Zap className="size-3 text-emerald-500" aria-hidden="true" />
                <span className="font-semibold transition-all duration-300">{animExecutions}</span> executions
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-[240px]">{executionsTooltip}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-1.5 transition-all duration-300 hover:text-foreground hover:scale-105 cursor-default" aria-label={`${favoritesCount} favorite scripts`}>
                <Heart className="size-3 text-rose-500" aria-hidden="true" />
                <span className="font-semibold transition-all duration-300">{animFavs}</span> favorites
              </span>
            </TooltipTrigger>
            <TooltipContent>Favorited scripts count</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Separator */}
      <Separator className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />

      {/* Main footer bar */}
      <div className="border-t bg-gradient-to-r from-muted/40 via-muted/60 to-muted/40 px-4 py-2">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          {/* Left: Connection Status */}
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="hidden sm:flex items-center gap-1.5 cursor-default transition-colors hover:text-foreground" role="status" aria-live="polite">
                  {apiHealth === 'ok' ? (
                    <Wifi className="size-3 text-emerald-500" style={{ animation: 'connection-pulse 2s ease-in-out infinite' }} aria-hidden="true" />
                  ) : apiHealth === 'error' ? (
                    <WifiOff className="size-3 text-red-500" aria-hidden="true" />
                  ) : (
                    <Activity className="size-3 text-amber-500 animate-pulse" aria-hidden="true" />
                  )}
                  <span className={
                    apiHealth === 'ok' ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                    : apiHealth === 'error' ? 'text-red-600 dark:text-red-400'
                    : 'text-amber-600 dark:text-amber-400'
                  }>
                    {apiHealth === 'ok' ? 'Connected' : apiHealth === 'error' ? 'Offline' : 'Connecting...'}
                  </span>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {apiHealth === 'ok' ? 'Connected to API server' : apiHealth === 'error' ? 'Server connection lost' : 'Establishing connection...'}
              </TooltipContent>
            </Tooltip>

            {/* Quick-access links */}
            <div className="hidden md:flex items-center gap-2">
              <Separator orientation="vertical" className="h-3" />
              <button
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all active:scale-95"
                onClick={() => document.getElementById('global-search')?.focus()}
                aria-label="Focus search"
              >
                <Search className="size-2.5" aria-hidden="true" />Find
              </button>
              <button
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all active:scale-95"
                onClick={() => {
                  const uploadBtn = document.querySelector('[data-upload-trigger]') as HTMLElement;
                  uploadBtn?.click();
                }}
                aria-label="Upload script"
              >
                <Upload className="size-2.5" aria-hidden="true" />Upload
              </button>
              <button
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all active:scale-95"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                aria-label="Scroll to top"
              >
                <ArrowUp className="size-2.5" aria-hidden="true" />Top
              </button>
              <button
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all active:scale-95"
                onClick={() => window.open('/api/executions/export?period=30d', '_blank')}
                aria-label="Export execution history as CSV"
              >
                <Download className="size-2.5" aria-hidden="true" />Export
              </button>
            </div>
          </div>

          {/* Center: Activity Timeline + Keyboard Shortcuts */}
          <div className="flex items-center gap-3">
            {/* Activity Timeline */}
            {recentNotifications.length > 0 && (
              <div className="hidden md:flex items-center gap-2">
                <AnimatePresence mode="popLayout">
                  {recentNotifications.map((notif, idx) => (
                    <Tooltip key={notif.id}>
                      <TooltipTrigger asChild>
                        <motion.span
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -8 }}
                          transition={{ delay: idx * 0.05, duration: 0.2 }}
                          className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-default max-w-[140px]"
                        >
                          <span className={`size-1.5 rounded-full shrink-0 ${
                            notif.type === 'success' ? 'bg-emerald-500' :
                            notif.type === 'error' ? 'bg-red-500' : 'bg-sky-500'
                          }`} />
                          <span className="truncate">{notif.message.length > 30 ? notif.message.slice(0, 30) + '...' : notif.message}</span>
                          <span className="text-muted-foreground/40 shrink-0">{formatRelative(notif.timestamp)}</span>
                        </motion.span>
                      </TooltipTrigger>
                      <TooltipContent>{notif.message}</TooltipContent>
                    </Tooltip>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Keyboard shortcuts as ghost buttons */}
            <div className="hidden lg:flex items-center gap-2">
              <Separator orientation="vertical" className="h-3" />
              <button
                className="flex items-center gap-1 px-2 py-0.5 rounded-full border bg-background/80 border-border/60 text-[9px] font-medium text-muted-foreground shadow-sm cursor-pointer hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 dark:hover:bg-emerald-950/30 dark:hover:border-emerald-800 dark:hover:text-emerald-400 active:scale-95 transition-all"
                onClick={() => document.getElementById('global-search')?.focus()}
                aria-label="Focus search (keyboard shortcut Cmd+K)"
              >
                <Command className="size-2.5" aria-hidden="true" />K
                <span className="text-muted-foreground/60">Search</span>
              </button>
              <button
                className="flex items-center gap-1 px-2 py-0.5 rounded-full border bg-background/80 border-border/60 text-[9px] font-medium text-muted-foreground shadow-sm cursor-pointer hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 dark:hover:bg-emerald-950/30 dark:hover:border-emerald-800 dark:hover:text-emerald-400 active:scale-95 transition-all"
                onClick={() => {
                  const uploadBtn = document.querySelector('[data-upload-trigger]') as HTMLElement;
                  uploadBtn?.click();
                }}
                aria-label="Upload script (keyboard shortcut Cmd+N)"
              >
                <Command className="size-2.5" aria-hidden="true" />N
                <span className="text-muted-foreground/60">New</span>
              </button>
            </div>
          </div>

          {/* Right: Time + Credit + Version */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-muted-foreground/70">
              Made with <Heart className="size-2.5 text-rose-500 inline" aria-hidden="true" /> by ScriptHub
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1.5 cursor-default">
                  <Clock className="size-3" aria-hidden="true" />{footerTime}
                </span>
              </TooltipTrigger>
              <TooltipContent>Current time (updates every 30s)</TooltipContent>
            </Tooltip>

            {/* Session timer -- only rendered on client to avoid hydration mismatch */}
            {timerMounted && uptime && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="hidden sm:flex items-center gap-1 cursor-default text-muted-foreground/60">
                    <Timer className="size-2.5" aria-hidden="true" />
                    <span className="font-mono text-[10px] session-timer-pulse">{uptime}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Session duration</TooltipContent>
              </Tooltip>
            )}

            {/* Keyboard shortcuts help button */}
            {onShortcutsOpen && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onShortcutsOpen}
                    className="flex items-center justify-center size-5 rounded-full border border-border/60 bg-background/80 text-muted-foreground hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 dark:hover:bg-emerald-950/30 dark:hover:border-emerald-800 dark:hover:text-emerald-400 transition-all active:scale-90 cursor-pointer"
                    aria-label="Show keyboard shortcuts"
                  >
                    <HelpCircle className="size-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Keyboard shortcuts (Cmd+/)</TooltipContent>
              </Tooltip>
            )}

            {/* Version with shimmer and hover summary popup */}
            <Popover>
              <PopoverTrigger asChild>
                <span className="footer-shimmer font-mono cursor-default hover:text-foreground transition-colors">{APP_VERSION}</span>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-4" side="top" align="end">
                <div className="rounded-xl border bg-background/60 backdrop-blur-md p-4 space-y-3 shadow-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="size-6 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm">
                      <Zap className="size-3 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">ScriptHub {APP_VERSION}</p>
                      <p className="text-[9px] text-muted-foreground">Session Overview</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-muted/30 p-2 text-center">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <FileCode className="size-3 text-emerald-500" />
                        <span className="text-xs font-bold">{totalScripts}</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground">Scripts</span>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-2 text-center">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Hash className="size-3 text-amber-500" />
                        <span className="text-xs font-bold">{totalLines ?? 0}</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground">Lines of Code</span>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-2 text-center">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Zap className="size-3 text-emerald-500" />
                        <span className="text-xs font-bold">{totalExecutions ?? 0}</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground">Executions</span>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-2 text-center">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Search className="size-3 text-sky-500" />
                        <span className="text-xs font-bold">{mostPopularLang || '--'}</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground">Top Language</span>
                    </div>
                  </div>
                  {uptime && (
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1 border-t">
                      <Timer className="size-2.5" />
                      <span>Session uptime: <span className="font-mono font-medium">{uptime}</span></span>
                    </div>
                  )}
                  <p className="text-[9px] text-muted-foreground/40 text-center pt-1 border-t">
                    Made with love by ScriptHub
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </footer>
  );
}
