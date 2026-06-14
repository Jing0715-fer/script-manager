// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, Upload, CopyPlus, ChevronUp, ExternalLink, PanelRightClose, Keyboard,
  FileSearch, LayoutGrid, List, RotateCcw, Trash2, Eye, Download, Play, Heart,
} from 'lucide-react';
import { motion, AnimatePresence } from '@/lib/framer-motion-shim';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ─── Platform Detection ────────────────────────────────────────────
function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}

// ─── KeyBadge & CommandIcon ──────────────────────────────────────

function CommandIcon({ className = 'size-3' }: { className?: string }) {
  const mac = isMac();
  return (
    <span className={className}>
      {mac ? '⌘' : 'Ctrl'}
    </span>
  );
}

function ShiftIcon({ className = 'size-3' }: { className?: string }) {
  const mac = isMac();
  return (
    <span className={className}>
      {mac ? '⇧' : 'Shift'}
    </span>
  );
}

function KeyBadge({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-[20px] select-none items-center justify-center gap-0.5 rounded-[4px] border border-border/60 bg-gray-100 px-1.5 font-mono text-[10px] font-medium text-muted-foreground shadow-[0_1px_1px_rgba(0,0,0,0.1)] dark:bg-gray-800 dark:border-gray-700">
      {children}
    </kbd>
  );
}

// ─── Shortcut Definition ──────────────────────────────────────────

interface Shortcut {
  description: string;
  icon: React.ReactNode;
  keys: React.ReactNode;
  category: string;
  keywords: string;
}

const SHORTCUTS: Shortcut[] = [
  // Navigation
  { description: 'Focus search', icon: <Search className="size-3.5 text-muted-foreground" />, keys: <><CommandIcon />K</>, category: 'Navigation', keywords: 'search focus find' },
  { description: 'Navigate scripts', icon: <ChevronUp className="size-3.5 text-muted-foreground" />, keys: <><KeyBadge>↑</KeyBadge><KeyBadge>↓</KeyBadge></>, category: 'Navigation', keywords: 'navigate arrow up down' },
  { description: 'Open focused script', icon: <ExternalLink className="size-3.5 text-muted-foreground" />, keys: <KeyBadge>Enter</KeyBadge>, category: 'Navigation', keywords: 'open enter select' },
  { description: 'Close execution panel', icon: <PanelRightClose className="size-3.5 text-muted-foreground" />, keys: <KeyBadge>Esc</KeyBadge>, category: 'Navigation', keywords: 'close escape panel' },
  // Execution
  { description: 'Quick run selected script', icon: <Play className="size-3.5 text-muted-foreground" />, keys: <><CommandIcon /><KeyBadge>Enter</KeyBadge></>, category: 'Execution', keywords: 'run execute play start quick' },
  { description: 'Toggle execution panel', icon: <Eye className="size-3.5 text-muted-foreground" />, keys: <><CommandIcon /><ShiftIcon />E</>, category: 'Execution', keywords: 'execution panel toggle open close' },
  { description: 'Duplicate script', icon: <CopyPlus className="size-3.5 text-muted-foreground" />, keys: <><CommandIcon />D</>, category: 'Execution', keywords: 'duplicate copy clone' },
  { description: 'Toggle fullscreen output', icon: <Eye className="size-3.5 text-muted-foreground" />, keys: <><CommandIcon /><ShiftIcon />F</>, category: 'Execution', keywords: 'fullscreen output maximize expand' },
  // Script Actions
  { description: 'Upload new script', icon: <Upload className="size-3.5 text-muted-foreground" />, keys: <><CommandIcon />N</>, category: 'Script Actions', keywords: 'upload new create add' },
  { description: 'Favorite script', icon: <Heart className="size-3.5 text-muted-foreground" />, keys: <><CommandIcon />F</>, category: 'Script Actions', keywords: 'favorite heart like bookmark' },
  // Search
  { description: 'Command palette', icon: <Search className="size-3.5 text-muted-foreground" />, keys: <><CommandIcon />K</>, category: 'Search', keywords: 'command palette quick actions' },
  { description: 'Search in code content', icon: <FileSearch className="size-3.5 text-muted-foreground" />, keys: <><CommandIcon /><ShiftIcon />F</>, category: 'Search', keywords: 'content search find code text' },
  // View
  { description: 'Toggle grid/list view', icon: <LayoutGrid className="size-3.5 text-muted-foreground" />, keys: <><CommandIcon />G</>, category: 'View', keywords: 'grid list toggle view layout' },
  { description: 'Refresh scripts', icon: <RotateCcw className="size-3.5 text-muted-foreground" />, keys: <><CommandIcon />R</>, category: 'View', keywords: 'refresh reload sync update' },
  // General
  { description: 'Delete focused script', icon: <Trash2 className="size-3.5 text-muted-foreground" />, keys: <><CommandIcon /><ShiftIcon />Delete</>, category: 'General', keywords: 'delete remove trash' },
  { description: 'Download script', icon: <Download className="size-3.5 text-muted-foreground" />, keys: <><CommandIcon />S</>, category: 'General', keywords: 'download save export' },
  { description: 'Show keyboard shortcuts', icon: <Keyboard className="size-3.5 text-muted-foreground" />, keys: <><CommandIcon />/</>, category: 'General', keywords: 'shortcuts help keyboard' },
];

const CATEGORIES = ['Navigation', 'Execution', 'Script Actions', 'Search', 'View', 'General'];
const CATEGORY_COLORS: Record<string, string> = {
  Navigation: 'text-emerald-600 dark:text-emerald-400',
  Execution: 'text-orange-600 dark:text-orange-400',
  'Script Actions': 'text-amber-600 dark:text-amber-400',
  Search: 'text-sky-600 dark:text-sky-400',
  View: 'text-violet-600 dark:text-violet-400',
  General: 'text-rose-600 dark:text-rose-400',
};

// ─── Shortcuts Dialog Component ────────────────────────────────────

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) setSearchQuery('');
  }, [open]);

  // Filter shortcuts by search
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return SHORTCUTS;
    const q = searchQuery.toLowerCase();
    return SHORTCUTS.filter(s =>
      s.description.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.keywords.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, Shortcut[]> = {};
    filtered.forEach(s => {
      if (!groups[s.category]) groups[s.category] = [];
      groups[s.category].push(s);
    });
    return CATEGORIES.filter(c => groups[c]?.length).map(c => ({
      name: c,
      shortcuts: groups[c] || [],
    }));
  }, [filtered]);

  const resultCount = filtered.length;
  const totalCount = SHORTCUTS.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>Use these shortcuts to navigate ScriptHub faster.</DialogDescription>
        </DialogHeader>

        {/* Header with search */}
        <div className="p-4 pb-3 border-b bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-950/20">
          <div className="flex items-center gap-2 mb-3">
            <div className="size-7 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <Keyboard className="size-4 text-white" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold">Keyboard Shortcuts</DialogTitle>
              <DialogDescription className="text-[10px]">Navigate ScriptHub faster</DialogDescription>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter shortcuts..."
              className="pl-8 h-8 text-xs"
            />
            {searchQuery && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                {resultCount}/{totalCount}
              </span>
            )}
          </div>
        </div>

        {/* Shortcuts grouped by category */}
        <div className="max-h-[400px] overflow-y-auto p-3 space-y-4">
          <AnimatePresence mode="popLayout">
            {grouped.map((group) => (
              <motion.div
                key={group.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                <h4 className={`shortcut-category text-[10px] font-semibold uppercase tracking-wider mb-2 pl-2 border-l-2 ${CATEGORY_COLORS[group.name] || 'text-emerald-600 dark:text-emerald-400'}`} style={{ borderColor: 'currentColor' }}>
                  {group.name}
                </h4>
                <div className="space-y-1">
                  {group.shortcuts.map((shortcut, idx) => (
                    <motion.div
                      key={shortcut.description}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02, duration: 0.1 }}
                      className="flex items-center justify-between rounded-lg border p-2.5 hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-xs flex items-center gap-2">
                        {shortcut.icon}
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {shortcut.keys}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {grouped.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Search className="size-5 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No shortcuts match your search</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t bg-muted/20">
          <Button onClick={() => onOpenChange(false)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 transition-transform h-8 text-xs">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
