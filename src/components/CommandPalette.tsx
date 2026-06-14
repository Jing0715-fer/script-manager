// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, Terminal, Plus, Upload, GitBranch, Settings, BarChart3,
  Sun, Moon, Keyboard, Code2, Play, Heart, Zap,
  ChevronRight, FolderOpen, LayoutGrid, List, Star, Clock, RotateCcw,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useScriptStore } from '@/store/script-store';
import type { ScriptData } from '@/types';

// ─── Types ────────────────────────────────────────────────────────

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scripts: ScriptData[];
  onSelectScript: (script: ScriptData) => void;
  onAction: (action: string) => void;
}

interface GroupedSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: CommandItem[];
}

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  data?: ScriptData;
}

// ─── Component ─────────────────────────────────────────────────────

export function CommandPalette({
  open, onOpenChange, scripts, onSelectScript, onAction,
}: CommandPaletteProps) {
  const { theme, setTheme } = useTheme();
  const store = useScriptStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build flat list of all command items
  const allItems = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];

    // ── Actions section ──
    items.push(
      {
        id: 'action-new-script',
        label: 'New Script',
        description: 'Create a new script from scratch',
        icon: <Plus className="size-4 text-emerald-500" />,
        shortcut: '⌘N',
        action: () => { onAction('create'); onOpenChange(false); },
      },
      {
        id: 'action-upload',
        label: 'Upload Script',
        description: 'Upload a script file from your computer',
        icon: <Upload className="size-4 text-blue-500" />,
        action: () => { onAction('upload'); onOpenChange(false); },
      },
      {
        id: 'action-import-demo',
        label: 'Import Demo Scripts',
        description: 'Load example scripts to get started',
        icon: <GitBranch className="size-4 text-violet-500" />,
        action: () => { onAction('import-demo'); onOpenChange(false); },
      },
      {
        id: 'action-toggle-view',
        label: `Switch to ${store.viewMode === 'grid' ? 'List' : 'Grid'} View`,
        description: 'Toggle between grid and list layout',
        icon: store.viewMode === 'grid'
          ? <List className="size-4 text-amber-500" />
          : <LayoutGrid className="size-4 text-amber-500" />,
        action: () => {
          store.setViewMode(store.viewMode === 'grid' ? 'list' : 'grid');
          onOpenChange(false);
          toast.success(`Switched to ${store.viewMode === 'grid' ? 'list' : 'grid'} view`);
        },
      },
      {
        id: 'action-toggle-theme',
        label: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
        description: 'Toggle dark/light theme',
        icon: theme === 'dark' ? <Sun className="size-4 text-amber-500" /> : <Moon className="size-4 text-indigo-500" />,
        action: () => {
          setTheme(theme === 'dark' ? 'light' : 'dark');
          onOpenChange(false);
        },
      },
      {
        id: 'action-refresh',
        label: 'Refresh Scripts',
        description: 'Reload scripts from server',
        icon: <RotateCcw className="size-4 text-muted-foreground" />,
        shortcut: '⌘R',
        action: () => { onAction('refresh'); onOpenChange(false); },
      },
      {
        id: 'action-stats',
        label: 'View Statistics',
        description: 'Open detailed statistics dialog',
        icon: <BarChart3 className="size-4 text-emerald-500" />,
        action: () => { onAction('stats'); onOpenChange(false); },
      },
      {
        id: 'action-shortcuts',
        label: 'Keyboard Shortcuts',
        description: 'View all available keyboard shortcuts',
        icon: <Keyboard className="size-4 text-muted-foreground" />,
        shortcut: '?',
        action: () => { onAction('shortcuts'); onOpenChange(false); },
      },
    );

    // ── Scripts section (filtered) ──
    const q = query.toLowerCase();
    const filteredScripts = q
      ? scripts.filter(s =>
          s.name.toLowerCase().includes(q) ||
          (s.description || '').toLowerCase().includes(q) ||
          s.language.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q)
        ).slice(0, 8)
      : scripts.slice(0, 6);

    for (const s of filteredScripts) {
      const isFav = store.favorites.includes(s.id);
      items.push({
        id: `script-${s.id}`,
        label: s.name,
        description: `${s.language} · ${(s.content || '').split('\n').length} lines`,
        icon: <Terminal className="size-4 text-emerald-500" />,
        action: () => { onSelectScript(s); onOpenChange(false); },
        data: s,
        _isFav: isFav,
      } as CommandItem & { _isFav?: boolean });
    }

    // ── Recent section (always, no filter) ──
    const recentScripts = store.recentScripts
      .slice(0, 3)
      .map((id: string) => scripts.find(s => s.id === id))
      .filter(Boolean) as ScriptData[];

    for (const s of recentScripts) {
      if (!items.find(i => i.id === `script-${s.id}`)) {
        items.push({
          id: `recent-${s.id}`,
          label: s.name,
          description: 'Recently viewed',
          icon: <Clock className="size-4 text-amber-500" />,
          action: () => { onSelectScript(s); onOpenChange(false); },
          data: s,
        });
      }
    }

    // ── Categories section ──
    const categoryMap: Record<string, number> = {};
    scripts.forEach(s => {
      const cat = s.category || 'Uncategorized';
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });

    const categories = Object.entries(categoryMap)
      .sort((a, b) => a[0].localeCompare(b[0]));

    for (const [cat, count] of categories) {
      if (q && !cat.toLowerCase().includes(q)) continue;
      items.push({
        id: `cat-${cat}`,
        label: cat,
        description: `${count} script${count !== 1 ? 's' : ''}`,
        icon: <FolderOpen className="size-4 text-violet-500" />,
        action: () => {
          store.setSelectedCategory(cat);
          onOpenChange(false);
        },
      });
    }

    return items;
  }, [scripts, query, theme, store.viewMode, store.favorites, store.recentScripts, store.setSelectedCategory, store.setViewMode, onSelectScript, onOpenChange, onAction, setTheme]);

  // Filter items by query
  const filteredItems = useMemo(() => {
    if (!query) return allItems;
    // All items are already pre-filtered in the build step
    return allItems;
  }, [allItems, query]);

  // Group items into sections
  const sections = useMemo<GroupedSection[]>(() => {
    const groups: GroupedSection[] = [];

    const actionItems = filteredItems.filter(i => i.id.startsWith('action-'));
    if (actionItems.length > 0) {
      groups.push({
        id: 'actions',
        label: 'Actions',
        icon: <Zap className="size-3" />,
        items: actionItems,
      });
    }

    const recentItems = filteredItems.filter(i => i.id.startsWith('recent-'));
    if (recentItems.length > 0) {
      groups.push({
        id: 'recent',
        label: 'Recent',
        icon: <Clock className="size-3" />,
        items: recentItems,
      });
    }

    const scriptItems = filteredItems.filter(i => i.id.startsWith('script-'));
    if (scriptItems.length > 0) {
      groups.push({
        id: 'scripts',
        label: 'Scripts',
        icon: <Terminal className="size-3" />,
        items: scriptItems,
      });
    }

    const catItems = filteredItems.filter(i => i.id.startsWith('cat-'));
    if (catItems.length > 0) {
      groups.push({
        id: 'categories',
        label: 'Categories',
        icon: <FolderOpen className="size-3" />,
        items: catItems,
      });
    }

    return groups;
  }, [filteredItems]);

  // Flatten for index tracking
  const flatItems = useMemo(() => {
    return sections.flatMap(g => g.items);
  }, [sections]);

  // Reset selection when query or items change
  useEffect(() => { setSelectedIndex(0); }, [query, flatItems.length]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, flatItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && flatItems[selectedIndex]) {
        e.preventDefault();
        flatItems[selectedIndex].action();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, flatItems, selectedIndex]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-selected="true"]');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 top-[15%] translate-y-0 overflow-hidden rounded-xl border shadow-2xl shadow-black/20 bg-background/95 backdrop-blur-xl [&>button]:hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Command Palette</DialogTitle>
          <DialogDescription>Search scripts, actions, and categories</DialogDescription>
        </DialogHeader>
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search scripts, actions, categories..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 font-medium"
            spellCheck={false}
            autoFocus
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border/60 bg-muted/50 text-[10px] font-mono text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[360px] overflow-y-auto py-2 px-2">
          {flatItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="size-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No results found</p>
              <p className="text-[11px] text-muted-foreground/60 mt-1">Try a different search term</p>
            </div>
          ) : (
            sections.map((section) => (
              <div key={section.id} className="mb-1">
                <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {section.icon}
                  {section.label}
                  <span className="ml-auto text-muted-foreground/40">{section.items.length}</span>
                </div>
                {section.items.map((item) => {
                  const globalIdx = flatItems.indexOf(item);
                  const isSelected = globalIdx === selectedIndex;
                  const isFav = (item as any)._isFav as boolean | undefined;

                  return (
                    <button
                      key={item.id}
                      data-selected={isSelected}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors cursor-pointer group ${
                        isSelected
                          ? 'bg-emerald-500/10 border-l-2 border-emerald-500 text-foreground shadow-sm shadow-emerald-500/5'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      }`}
                      onClick={item.action}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                    >
                      <div className={`shrink-0 ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/60 group-hover:text-muted-foreground'}`}>
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="truncate block font-medium text-[13px]">{item.label}</span>
                        {item.description && (
                          <span className="text-[10px] text-muted-foreground/60 truncate block">{item.description}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isFav && <Heart className="size-3 text-rose-500 fill-current" />}
                        {item.shortcut && (
                          <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/30 text-[10px] font-mono text-muted-foreground/50">
                            {item.shortcut}
                          </kbd>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/20 text-[10px] text-muted-foreground/60">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><ChevronRight className="size-2.5" />Navigate</span>
            <span className="flex items-center gap-1"><Search className="size-2.5" />Select</span>
          </div>
          <span>{flatItems.length} result{flatItems.length !== 1 ? 's' : ''}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
