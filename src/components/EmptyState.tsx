// @ts-nocheck
'use client';

import React from 'react';
import { motion } from '@/lib/framer-motion-shim';
import { SearchX, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Empty State Component ────────────────────────────────────────

export function EmptyState({
  icon, title, description, actions, showTip = true,
}: {
  icon: React.ReactNode; title: string; description: string;
  actions?: React.ReactNode; showTip?: boolean;
}) {
  // Clone action buttons children and add staggered delays
  const enhancedActions = actions ? (
    <div className="flex flex-col items-center gap-3 mt-2">
      {React.Children.map(actions, (child, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + index * 0.1, duration: 0.3 }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  ) : null;

  return (
    <div className="relative flex flex-col items-center justify-center py-16 text-center px-4 overflow-hidden">
      {/* Dot pattern background */}
      <div className="absolute inset-0 empty-state-dots opacity-60" />

      {/* Animated gradient mesh blobs */}
      <div
        className="absolute top-1/4 left-1/4 size-32 rounded-full blur-3xl opacity-30"
        style={{
          background: 'radial-gradient(circle, rgba(16,185,129,0.4) 0%, transparent 70%)',
          animation: 'mesh-drift 8s ease-in-out infinite',
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 size-40 rounded-full blur-3xl opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(20,184,166,0.4) 0%, transparent 70%)',
          animation: 'mesh-drift 10s ease-in-out infinite reverse',
        }}
      />

      <div className="relative z-10">
        <div className="relative mb-6">
          {/* Pulsing emerald glow behind icon */}
          <div className="absolute inset-0 rounded-full size-40 mx-auto -z-10 animate-pulse opacity-50" style={{
            background: 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, rgba(16,185,129,0.05) 50%, transparent 70%)',
          }} />
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-950/30 dark:to-emerald-900/10 rounded-full blur-2xl size-40 mx-auto -z-10 opacity-60 animate-[emptyStateGlow_3s_ease-in-out_infinite]" />
          {/* Floating animation for icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ animation: 'float-icon 3s ease-in-out infinite' }}
          >
            {icon}
          </motion.div>
        </div>
        <motion.h3
          className="text-base font-semibold mb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {title}
        </motion.h3>
        <motion.p
          className="text-sm text-muted-foreground max-w-[300px]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {description}
        </motion.p>
        {enhancedActions}
        {showTip && (
          <motion.p
            className="text-[11px] text-muted-foreground/60 mt-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <kbd className="inline-flex h-4 min-w-[16px] select-none items-center justify-center gap-0.5 rounded-[3px] border border-border/60 bg-gray-100 px-1 font-mono text-[9px] font-medium text-muted-foreground shadow-[0_1px_1px_rgba(0,0,0,0.05)] dark:bg-gray-800 dark:border-gray-700 mr-0.5">⌘</kbd>
            <kbd className="inline-flex h-4 min-w-[16px] select-none items-center justify-center gap-0.5 rounded-[3px] border border-border/60 bg-gray-100 px-1 font-mono text-[9px] font-medium text-muted-foreground shadow-[0_1px_1px_rgba(0,0,0,0.05)] dark:bg-gray-800 dark:border-gray-700 mr-1">K</kbd>
            to quickly search scripts
          </motion.p>
        )}
      </div>
    </div>
  );
}

// ─── No Results Empty State (for search/filter with 0 matches) ──────

export function NoResultsEmptyState({
  searchQuery,
  selectedCategory,
  selectedTag,
  totalScripts,
  onClearFilters,
}: {
  searchQuery?: string;
  selectedCategory?: string;
  selectedTag?: string | null;
  totalScripts?: number;
  onClearFilters: () => void;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center py-16 text-center px-4 overflow-hidden">
      {/* Dot pattern background */}
      <div className="absolute inset-0 empty-state-dots opacity-40" />

      {/* Subtle gradient blobs */}
      <div
        className="absolute top-1/3 left-1/3 size-28 rounded-full blur-3xl opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%)',
          animation: 'mesh-drift 10s ease-in-out infinite',
        }}
      />

      <div className="relative z-10">
        <div className="relative mb-5">
          {/* Glow behind icon */}
          <div className="absolute inset-0 rounded-full size-36 mx-auto -z-10 opacity-40" style={{
            background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)',
          }} />
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <div className="size-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-50 dark:from-emerald-950/40 dark:to-teal-900/20 flex items-center justify-center shadow-lg">
              <SearchX className="size-8 text-emerald-600 dark:text-emerald-400" />
            </div>
          </motion.div>
        </div>

        <motion.h3
          className="text-base font-semibold mb-2 text-foreground"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          No matching scripts
        </motion.h3>

        <motion.div
          className="space-y-1.5 mb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <p className="text-sm text-muted-foreground max-w-[320px]">
            No scripts match your current filters.
          </p>
          {/* Active filter pills */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
            {searchQuery && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Search: &quot;{searchQuery}&quot;
                <XCircle className="size-2.5 opacity-60" />
              </span>
            )}
            {selectedCategory && selectedCategory !== 'All' && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                Category: {selectedCategory}
                <XCircle className="size-2.5 opacity-60" />
              </span>
            )}
            {selectedTag && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                Tag: &quot;{selectedTag}&quot;
                <XCircle className="size-2.5 opacity-60" />
              </span>
            )}
          </div>
          {totalScripts !== undefined && totalScripts > 0 && (
            <p className="text-[11px] text-muted-foreground/50">
              {totalScripts} script{totalScripts !== 1 ? 's' : ''} available in total
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Button
            size="sm"
            className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-[1.02] hover:shadow-md hover:shadow-emerald-500/20 transition-all active:scale-95"
            onClick={onClearFilters}
          >
            <XCircle className="size-3.5" />
            Clear filters
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
