'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { APP_VERSION } from '@/lib/shared-constants';
import {
  Search, Sun, Moon, Menu, Upload, Zap, LayoutGrid, List, Share2,
  RefreshCw, Settings, ExternalLink, HelpCircle, BarChart3, PieChart,
  ChevronRight, ChevronLeft, Command, X,
  FileCode, Terminal, Palette, SearchCode, Download, FileText,
  Monitor, PackageOpen, Loader2, Filter, CheckSquare, Square,
} from 'lucide-react';
import { useScriptStore, ACCENT_COLORS, type AccentTheme } from '@/store/script-store';
import { motion, AnimatePresence } from '@/lib/framer-motion-shim';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { NotificationsPanel } from '@/components/NotificationsPanel';

// ─── Header Component ─────────────────────────────────────────────

export function Header({
  theme, setTheme, mounted, searchFocused, setSearchFocused,
  searchClearing, setSearchClearing, recentRuns,
  onToggleMobileSidebar, onUploadOpen, onImportBundle, onAppOpen, onLlmOpen, onShortcutsOpen,
  onStatsOpen, onRefresh, scripts, onSelectScript,
  onToggleStatsBar, statsExpanded, importInProgress,
  onFilterToggle, filterPanelOpen, onToggleBatchMode, batchMode,
}: {
  theme: string | undefined;
  setTheme: (theme: string) => void;
  mounted: boolean;
  searchFocused: boolean;
  setSearchFocused: (v: boolean) => void;
  searchClearing: boolean;
  setSearchClearing: (v: boolean) => void;
  recentRuns: number;
  onToggleMobileSidebar: () => void;
  onUploadOpen: () => void;
  onImportBundle: () => void;
  onAppOpen: () => void;
  onLlmOpen: () => void;
  onShortcutsOpen: () => void;
  onStatsOpen: () => void;
  onRefresh: () => void;
  scripts?: Array<{ id: string; name: string; language: string }>;
  onSelectScript?: (scriptId: string) => void;
  onToggleStatsBar?: () => void;
  statsExpanded?: boolean;
  importInProgress?: boolean;
  onFilterToggle?: () => void;
  filterPanelOpen?: boolean;
  onToggleBatchMode?: () => void;
  batchMode?: boolean;
}) {
  const store = useScriptStore();
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const statsClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Feature 1: Search debounce (300ms) -- prevents excessive re-renders on rapid typing
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // View mode toggle with fade label
  const [viewLabelVisible, setViewLabelVisible] = useState(false);
  const viewLabelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleViewToggle = useCallback(() => {
    // Cycle: grid → list → graph → grid
    const modeOrder: Array<'grid' | 'list' | 'graph'> = ['grid', 'list', 'graph'];
    const currentIdx = modeOrder.indexOf(store.viewMode);
    const next = modeOrder[(currentIdx + 1) % modeOrder.length];
    store.setViewMode(next);
    setViewLabelVisible(true);
    if (viewLabelTimerRef.current) clearTimeout(viewLabelTimerRef.current);
    viewLabelTimerRef.current = setTimeout(() => setViewLabelVisible(false), 1200);
  }, [store]);

  // Sync accent theme with CSS custom properties
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const colors = ACCENT_COLORS[store.accentTheme as AccentTheme];
    if (colors) {
      const root = document.documentElement;
      root.style.setProperty('--accent-primary', colors.primary);
      root.style.setProperty('--accent-ring', colors.ring);
      root.style.setProperty('--accent-dark', colors.dark);
      root.style.setProperty('--accent-light', colors.light);
    }
  }, [store.accentTheme]);

  // Compute suggestions
  const query = store.searchQuery.toLowerCase().trim();
  const suggestions = query.length > 0 && scripts
    ? scripts
        .filter(s => s.name.toLowerCase().includes(query))
        .slice(0, 5)
    : [];

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSuggestionClick = (scriptId: string) => {
    setSuggestionsOpen(false);
    store.setSearchQuery('');
    if (onSelectScript) onSelectScript(scriptId);
  };

  const highlightMatch = (text: string) => {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query);
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-emerald-200/70 dark:bg-emerald-800/50 text-inherit rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b-0 bg-background/70 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-background/50 shadow-sm shadow-black/5 header-gradient-border">
      <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2">
        <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={onToggleMobileSidebar} aria-label="Toggle menu">
          <Menu className="size-4" />
        </Button>

        {/* Brand/Logo with animated underline on hover */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 sm:gap-2.5 mr-1 sm:mr-3 cursor-default group">
              <div className="size-7 sm:size-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/20 transition-transform duration-300 group-hover:scale-105">
                <Zap className="size-4 text-white" />
              </div>
              <div className="hidden sm:flex flex-col">
                <h1 className="text-sm font-bold leading-tight bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent logo-shimmer brand-hover-underline">ScriptHub</h1>
                <span className="text-[10px] text-muted-foreground leading-tight transition-colors duration-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">AI-Powered</span>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>ScriptHub {APP_VERSION}</TooltipContent>
        </Tooltip>

        {/* Style 6: Breadcrumb with AnimatePresence */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground overflow-hidden">
          <AnimatePresence mode="popLayout">
            <motion.span key="scripts" className="text-foreground font-medium" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}>
              Scripts
            </motion.span>
            {store.selectedCategory !== 'All' && (
              <motion.div key="cat" className="flex items-center gap-1.5" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}>
                <ChevronRight className="size-3" />
                <span>{store.selectedCategory}</span>
              </motion.div>
            )}
            {store.selectedTag && (
              <motion.div key="tag" className="flex items-center gap-1.5" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}>
                <ChevronRight className="size-3" />
                <span className="text-emerald-600">Tag: &quot;{store.selectedTag}&quot;</span>
              </motion.div>
            )}
            {store.searchQuery && (
              <motion.div key="search" className="flex items-center gap-1.5" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}>
                <ChevronRight className="size-3" />
                <span className="text-emerald-600">Search: &quot;{store.searchQuery}&quot;</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Search with suggestions - full width on mobile */}
        <div className="relative flex-1 max-w-lg min-w-0 header-search-glow rounded-lg" ref={suggestionsRef}>
          <Search className={`absolute left-3 top-1/2 size-4 -translate-y-1/2 transition-colors duration-200 ${searchFocused || suggestionsOpen || isSearching ? 'text-emerald-500' : 'text-muted-foreground'} ${isSearching ? 'animate-pulse' : ''}`} />
          <Input
            id="global-search"
            ref={searchInputRef}
            placeholder="Search scripts... ⌘K"
            role="search"
            aria-label="Search scripts"
            value={store.searchQuery}
            onChange={e => {
              const val = e.target.value;
              // Update input immediately for responsive UI, but debounce the store query
              if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
              if (val.length === 0) {
                // Clear immediately -- no debounce needed
                store.setSearchQuery('');
                setIsSearching(false);
                setSuggestionsOpen(false);
              } else {
                setIsSearching(true);
                searchDebounceRef.current = setTimeout(() => {
                  store.setSearchQuery(val);
                  setIsSearching(false);
                  setSuggestionsOpen(val.trim().length > 0);
                }, 300);
              }
            }}
            onFocus={() => { setSearchFocused(true); if (store.searchQuery.trim()) setSuggestionsOpen(true); }}
            onBlur={() => { setSearchFocused(false); setTimeout(() => setSuggestionsOpen(false), 200); }}
            onKeyDown={e => {
              if (e.key === 'Escape') { setSuggestionsOpen(false); searchInputRef.current?.blur(); }
              if (e.key === 'ArrowDown' && suggestions.length > 0) { e.preventDefault(); const first = document.querySelector('[data-suggestion]'); (first as HTMLElement)?.focus(); }
            }}
            className={`pl-9 h-8 sm:h-9 text-xs sm:text-sm pr-16 transition-all duration-200 rounded-lg ${searchClearing ? 'scale-95' : 'scale-100'} ${searchFocused ? 'focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:ring-offset-2 ring-2 ring-emerald-500/30 border-emerald-500/50 shadow-sm shadow-emerald-500/10 bg-background search-glow-active' : 'bg-muted/30 hover:bg-muted/50'} ${isSearching ? 'opacity-80' : ''}`}
          />
          {/* Feature 1: Searching indicator when debounce is active */}
          <AnimatePresence>
            {isSearching && (
              <motion.span
                initial={{ opacity: 0, x: 4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 4 }}
                className="absolute left-9 top-1/2 -translate-y-1/2 text-[10px] text-emerald-500/70 font-medium pointer-events-none whitespace-nowrap"
              >searching...</motion.span>
            )}
          </AnimatePresence>
          <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 ${isSearching ? 'pr-20' : 'pr-16'} transition-all duration-200`}>
            <kbd className="hidden md:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground transition-colors">
              <Command className="size-2.5" />K
            </kbd>
            {store.searchQuery && (
              <Button variant="ghost" size="icon-xs" onClick={() => { setSearchClearing(true); store.setSearchQuery(''); setSuggestionsOpen(false); setTimeout(() => setSearchClearing(false), 200); }} className="ml-1">
                <X className="size-3" />
              </Button>
            )}
          </div>

          {/* Search mode indicator */}
          <AnimatePresence>
            {store.searchQuery.trim().length > 0 && mounted && (
              <motion.div
                className="search-mode-bar absolute -bottom-5 left-0 text-[9px] text-muted-foreground/60 flex items-center gap-1.5 whitespace-nowrap pointer-events-none"
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -2 }}
              >
                <SearchCode className="size-2.5" />
                <span>{store.searchMode === 'all' ? 'All' : store.searchMode === 'name' ? 'Names' : 'Content'}</span>
                <span className="text-muted-foreground/40">·</span>
                <span>Press Esc to clear</span>
              </motion.div>
            )}
          </AnimatePresence>

          {!suggestionsOpen && !store.searchQuery.trim() && (
            <div className="absolute -bottom-5 left-0 text-[9px] text-muted-foreground/60 whitespace-nowrap pointer-events-none">
              Press Esc to clear
            </div>
          )}
          <AnimatePresence>
            {suggestionsOpen && suggestions.length > 0 && (
              <motion.div
                className="absolute top-full left-0 right-0 mt-1 rounded-lg border bg-popover shadow-lg z-50 overflow-hidden"
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
              >
                <div className="px-2 py-1.5 border-b">
                  <span className="text-[10px] text-muted-foreground font-medium">{suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}</span>
                </div>
                {suggestions.map((s, i) => (
                  <button
                    key={s.id}
                    data-suggestion
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors active:scale-[0.99] rounded-md m-0.5"
                    onMouseDown={e => { e.preventDefault(); handleSuggestionClick(s.id); }}
                  >
                    <Terminal className="size-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate font-medium">{highlightMatch(s.name)}</span>
                    <span className="ml-auto shrink-0 text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{s.language}</span>
                  </button>
                ))}
                <div className="px-3 py-1.5 border-t">
                  <span className="text-[10px] text-muted-foreground/60">Press <kbd className="inline-flex h-3.5 select-none items-center rounded border bg-muted px-1 font-mono text-[8px] font-medium text-muted-foreground mx-0.5">Enter</kbd> to search, <kbd className="inline-flex h-3.5 select-none items-center rounded border bg-muted px-1 font-mono text-[8px] font-medium text-muted-foreground mx-0.5">Esc</kbd> to clear</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* View mode toggle - compact icon button with fade label */}
        <div className="hidden sm:flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleViewToggle}
                className="relative active:scale-90 transition-transform"
                aria-label={`Switch view (current: ${store.viewMode})`}
              >
                <AnimatePresence mode="wait">
                  {store.viewMode === 'grid' ? (
                    <motion.div
                      key="grid"
                      initial={{ opacity: 0, rotate: -90 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: 90 }}
                      transition={{ duration: 0.15 }}
                    >
                      <LayoutGrid className="size-3.5" />
                    </motion.div>
                  ) : store.viewMode === 'list' ? (
                    <motion.div
                      key="list"
                      initial={{ opacity: 0, rotate: -90 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: 90 }}
                      transition={{ duration: 0.15 }}
                    >
                      <List className="size-3.5" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="graph"
                      initial={{ opacity: 0, rotate: -90 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: 90 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Share2 className="size-3.5" />
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* Fade label */}
                <AnimatePresence>
                  {viewLabelVisible && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8, y: 2 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: 2 }}
                      transition={{ duration: 0.15 }}
                      className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap pointer-events-none bg-background/90 px-1.5 py-0.5 rounded shadow-sm"
                    >
                      {store.viewMode === 'grid' ? 'Grid' : store.viewMode === 'list' ? 'List' : 'Graph'}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{store.viewMode === 'grid' ? 'List view' : store.viewMode === 'list' ? 'Graph view' : 'Grid view'}</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />

        <div className="flex items-center gap-0.5 sm:gap-1">
          {/* Advanced filter toggle */}
          {onFilterToggle && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className={`hidden sm:flex hover:bg-accent/50 active:scale-90 transition-all duration-200 ${filterPanelOpen ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30' : ''}`}
                  onClick={onFilterToggle}
                  aria-label="Toggle filters"
                >
                  <Filter className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{filterPanelOpen ? 'Hide filters' : 'Show filters'}</TooltipContent>
            </Tooltip>
          )}
          {/* Batch/Multi-select mode toggle - visible on all screen sizes */}
          {onToggleBatchMode && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className={`hover:bg-accent/50 active:scale-90 transition-all duration-200 ${batchMode ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-500/30' : ''}`}
                  onClick={onToggleBatchMode}
                  aria-label="Toggle multi-select mode"
                >
                  {batchMode ? <CheckSquare className="size-3.5" /> : <Square className="size-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{batchMode ? 'Exit multi-select' : 'Multi-select mode'}</TooltipContent>
            </Tooltip>
          )}
          {/* Collapse sidebar toggle (desktop only) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="hidden lg:flex hover:bg-accent/50 active:scale-90 transition-all duration-200"
                onClick={store.toggleSidebar}
                aria-label={store.sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                {store.sidebarOpen ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{store.sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-6 mx-0.5 hidden lg:block" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="hidden md:flex h-8 gap-1.5 hover:bg-accent/50 active:scale-90 transition-all duration-200" onClick={onUploadOpen}>
                <Upload className="size-3.5" />
                <span>Upload</span>
                <kbd className="pointer-events-none ml-1 hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-50">⌘U</kbd>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Upload a new script</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="hidden md:flex h-8 gap-1.5 hover:bg-accent/50 active:scale-90 transition-all duration-200"
                onClick={onImportBundle}
                disabled={importInProgress}
              >
                {importInProgress ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <PackageOpen className="size-3.5" />
                )}
                <span>Import Bundle</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{importInProgress ? 'Importing...' : 'Import ZIP or JSON bundle'}</TooltipContent>
          </Tooltip>

          {/* Mobile upload icon - visible only on very small screens */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={onUploadOpen} aria-label="Upload script" className="md:hidden hover:bg-accent/50 active:scale-90 transition-all duration-200">
                <Upload className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Upload script</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={onRefresh} aria-label="Refresh scripts" className="hover:bg-accent/50 active:scale-90 transition-all duration-200">
                <RefreshCw className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh scripts</TooltipContent>
          </Tooltip>

          {/* Notifications panel */}
          <NotificationsPanel />

          {/* Theme toggle - hidden on mobile, available in overflow */}
          {mounted && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Toggle theme" className="hidden sm:flex hover:bg-accent/50 active:scale-90 transition-all duration-200 relative">
                  <Sun className="size-4 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute inset-0 m-auto size-4 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-2 theme-picker-panel" side="bottom" align="end">
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground px-1">Theme</p>
                  <button
                    type="button"
                    onClick={() => { setTheme('light'); localStorage.setItem('scripthub-theme-preference', 'light'); }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/30 ${theme !== 'dark' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20' : 'text-foreground'}`}
                  >
                    <Sun className="size-3.5" />
                    Light
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTheme('dark'); localStorage.setItem('scripthub-theme-preference', 'dark'); }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/30 ${theme === 'dark' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20' : 'text-foreground'}`}
                  >
                    <Moon className="size-3.5" />
                    Dark
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTheme('system'); localStorage.setItem('scripthub-theme-preference', 'system'); }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/30`}
                  >
                    <Monitor className="size-3.5" />
                    System
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Accent Theme Picker - hidden on mobile */}
          {mounted && (
            <Popover>
              <PopoverTrigger asChild>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="Accent theme" className="hidden sm:flex hover:bg-accent/50 active:scale-90 transition-all duration-200 relative">
                      <Palette className="size-4" style={{ color: ACCENT_COLORS[store.accentTheme as AccentTheme]?.primary || '#10b981' }} />
                      <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ACCENT_COLORS[store.accentTheme as AccentTheme]?.primary || '#10b981', boxShadow: `0 0 4px ${ACCENT_COLORS[store.accentTheme as AccentTheme]?.ring || 'rgba(16,185,129,0.3)'}` }} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Accent color</TooltipContent>
                </Tooltip>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-3 theme-picker-panel" side="bottom" align="end">
                <div className="space-y-2">
                  <p className="text-[10px] font-medium text-muted-foreground">Accent Color</p>
                  <div className="grid grid-cols-6 gap-2">
                    {(Object.entries(ACCENT_COLORS) as [AccentTheme, typeof ACCENT_COLORS[AccentTheme]][]).map(([name, colors]) => (
                      <button
                        key={name}
                        onClick={() => { store.setAccentTheme(name); toast.success(`Theme: ${name}`); }}
                        className="w-7 h-7 rounded-full border-2 transition-all duration-200 hover:scale-110 active:scale-95"
                        style={{
                          backgroundColor: colors.primary,
                          borderColor: store.accentTheme === name ? colors.dark : 'transparent',
                          boxShadow: store.accentTheme === name ? `0 0 8px ${colors.ring}` : 'none',
                        }}
                        title={name}
                      />
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* External apps - hidden on very small screens */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={onAppOpen} aria-label="External apps" className="hidden sm:flex hover:bg-accent/50 active:scale-90 transition-all duration-200">
                <ExternalLink className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>External apps</TooltipContent>
          </Tooltip>

          {/* LLM settings - hidden on very small screens */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={onLlmOpen} aria-label="LLM settings" className="hidden sm:flex hover:bg-accent/50 active:scale-90 transition-all duration-200">
                <Settings className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>LLM configuration</TooltipContent>
          </Tooltip>

          {/* Stats - always visible */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  if (statsClickTimerRef.current) {
                    clearTimeout(statsClickTimerRef.current);
                    statsClickTimerRef.current = null;
                    onStatsOpen();
                  } else {
                    statsClickTimerRef.current = setTimeout(() => {
                      statsClickTimerRef.current = null;
                      onToggleStatsBar?.();
                    }, 250);
                  }
                }}
                aria-label="Toggle quick stats (double-click for details)"
                className={`${statsExpanded ? 'text-emerald-600 dark:text-emerald-400' : ''} hover:bg-accent/50 active:scale-90 transition-all duration-200`}
              >
                <BarChart3 className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{statsExpanded ? 'Hide' : 'Show'} quick stats (dbl-click: details)</TooltipContent>
          </Tooltip>

          {/* Shortcuts - hidden on very small screens */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={onShortcutsOpen} aria-label="Keyboard shortcuts" className="hidden sm:flex hover:bg-accent/50 active:scale-90 transition-all duration-200">
                <HelpCircle className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Keyboard shortcuts</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="size-6 sm:size-7 cursor-pointer hover:ring-2 hover:ring-emerald-500/30 transition-all ml-0 sm:ml-1">
                <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-[10px] sm:text-xs font-semibold">U</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>User profile</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
