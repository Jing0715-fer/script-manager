'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Code2, Play, Heart, FolderOpen, Clock, Info } from 'lucide-react';
import { motion, AnimatePresence } from '@/lib/framer-motion-shim';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { ScriptData } from '@/types';
import { langAccentColors } from '@/lib/shared-constants';

// ─── Animated Counter Hook ────────────────────────────────────────
function useCountUp(value: number, duration: number = 600) {
  const [displayed, setDisplayed] = useState(value);
  const prevRef = useRef(value);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev === value) return;
    prevRef.current = value;
    const startTime = Date.now();
    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(prev + (value - prev) * eased));
      if (progress < 1) {
        animRef.current = requestAnimationFrame(step);
      }
    };
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [value, duration]);

  return displayed;
}

// ─── Props ────────────────────────────────────────────────────────

interface QuickStatsBarProps {
  expanded: boolean;
  scripts: ScriptData[];
  totalScripts: number;
  totalExecutions: number;
  favoritesCount: number;
  langDistribution: Array<[string, number]>;
}

// ─── Component ────────────────────────────────────────────────────

export function QuickStatsBar({
  expanded,
  totalScripts,
  totalExecutions,
  favoritesCount,
  langDistribution,
}: QuickStatsBarProps) {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const top3Langs = langDistribution.slice(0, 3);
  const maxLangCount = top3Langs[0]?.[1] || 1;
  const totalLangCount = langDistribution.reduce((sum, [, c]) => sum + c, 0);

  // Feature 4: Session uptime counter
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (totalSec: number): string => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  // Animated counters
  const animScripts = useCountUp(totalScripts);
  const animExecutions = useCountUp(totalExecutions);
  const animFavs = useCountUp(favoritesCount);

  const langBarColors: Record<string, string> = {
    python: 'bg-emerald-500',
    bash: 'bg-amber-500',
    shell: 'bg-amber-500',
    javascript: 'bg-yellow-400',
    typescript: 'bg-blue-500',
    r: 'bg-sky-500',
    perl: 'bg-violet-500',
    ruby: 'bg-rose-500',
    chimerax: 'bg-purple-500',
    pymol: 'bg-teal-500',
  };

  const langStackedColors: Record<string, string> = {
    python: 'bg-emerald-500',
    bash: 'bg-amber-500',
    shell: 'bg-orange-500',
    javascript: 'bg-yellow-400',
    typescript: 'bg-blue-500',
    r: 'bg-sky-500',
    perl: 'bg-violet-500',
    ruby: 'bg-rose-500',
    chimerax: 'bg-purple-500',
    pymol: 'bg-teal-500',
  };

  return (
    <AnimatePresence>
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="overflow-hidden border-b bg-gradient-to-r from-muted/20 via-muted/30 to-muted/20"
        >
          <div className="flex items-stretch gap-3 px-4 py-2.5 overflow-x-auto">
            {/* Total Scripts */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="stat-card-hover flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-background/60 border shrink-0 cursor-default">
                  <div className="size-7 rounded-md bg-emerald-500/10 flex items-center justify-center">
                    <Code2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-sm font-bold leading-none counter-animate">{animScripts}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Scripts</div>
                    <div className="stat-mini-bar mt-1.5 h-1 rounded-full bg-muted/60 overflow-hidden">
                      <div className="stat-mini-fill h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${Math.min(totalScripts / 30 * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>Total number of scripts in your collection</TooltipContent>
            </Tooltip>

            {/* Languages with stacked bar chart */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="stat-card-hover flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-background/60 border shrink-0 min-w-[200px] cursor-default">
                  <div className="size-7 rounded-md bg-violet-500/10 flex items-center justify-center">
                    <FolderOpen className="size-3.5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <div className="text-[10px] text-muted-foreground mb-1.5">Languages</div>
                    {/* Stacked horizontal bar chart */}
                    {totalLangCount > 0 && (
                      <div className="flex items-center gap-0 h-3 rounded-full overflow-hidden bg-muted/40 mb-1.5">
                        {langDistribution.map(([lang, count]) => {
                          const pct = (count / totalLangCount) * 100;
                          if (pct < 2) return null;
                          return (
                            <Tooltip key={lang}>
                              <TooltipTrigger asChild>
                                <div
                                  className={`h-full first:rounded-l-full last:rounded-r-full transition-all duration-200 cursor-default ${langStackedColors[lang] || 'bg-gray-400'} ${hoveredSegment === lang ? 'opacity-100 scale-y-125' : 'opacity-80 hover:opacity-100'}`}
                                  style={{ width: `${pct}%` }}
                                  onMouseEnter={() => setHoveredSegment(lang)}
                                  onMouseLeave={() => setHoveredSegment(null)}
                                />
                              </TooltipTrigger>
                              <TooltipContent className="text-[10px]">
                                {lang}: {count} script{count !== 1 ? 's' : ''} ({pct.toFixed(0)}%)
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    )}
                    {/* Labels + Top Language mini-badge */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      {langDistribution.length > 0 && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-[8px] font-semibold">
                          Top: {langDistribution[0][0]} ({Math.round((langDistribution[0][1] / totalLangCount) * 100)}%)
                        </span>
                      )}
                      {langDistribution.map(([lang, count]) => (
                        <span key={lang} className="text-[8px] text-muted-foreground capitalize">
                          {lang} ({count})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>Language distribution across all scripts</TooltipContent>
            </Tooltip>

            {/* Executions */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="stat-card-hover flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-background/60 border shrink-0 cursor-default">
                  <div className="size-7 rounded-md bg-amber-500/10 flex items-center justify-center">
                    <Play className="size-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <div className="text-sm font-bold leading-none counter-animate">{animExecutions}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Executions</div>
                    <div className="stat-mini-bar mt-1.5 h-1 rounded-full bg-muted/60 overflow-hidden">
                      <div className="stat-mini-fill h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400" style={{ width: `${Math.min(totalExecutions / 20 * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>Total script executions across all sessions</TooltipContent>
            </Tooltip>

            {/* Favorites */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="stat-card-hover flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-background/60 border shrink-0 cursor-default">
                  <div className="size-7 rounded-md bg-rose-500/10 flex items-center justify-center">
                    <Heart className="size-3.5 text-rose-500" />
                  </div>
                  <div>
                    <div className="text-sm font-bold leading-none counter-animate">{animFavs}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Favorites</div>
                    <div className="stat-mini-bar mt-1.5 h-1 rounded-full bg-muted/60 overflow-hidden">
                      <div className="stat-mini-fill h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400" style={{ width: `${Math.min(favoritesCount / 10 * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>Number of scripts marked as favorite</TooltipContent>
            </Tooltip>

            {/* Session Uptime */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="stat-card-hover flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-background/60 border shrink-0 cursor-default">
                  <div className="size-7 rounded-md bg-sky-500/10 flex items-center justify-center">
                    <Clock className="size-3.5 text-sky-600 dark:text-sky-400 session-timer-pulse" />
                  </div>
                  <div>
                    <div className="text-sm font-bold leading-none font-mono">{formatUptime(elapsedSeconds)}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Session</div>
                    <div className="stat-mini-bar mt-1.5 h-1 rounded-full bg-muted/60 overflow-hidden">
                      <div className="stat-mini-fill h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-400" style={{ width: `${Math.min((elapsedSeconds / 3600) * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>Current session uptime</TooltipContent>
            </Tooltip>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
