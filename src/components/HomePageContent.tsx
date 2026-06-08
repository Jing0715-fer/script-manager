'use client';

// This component is loaded dynamically with ssr: false from page.tsx
// to avoid SSR memory issues in the sandbox environment

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import JSZip from 'jszip';
import {
  Terminal, Upload, ExternalLink, Zap,
  Play, Loader2, RefreshCw, GitBranch, Trash2,
  X, Heart, Star,
  WifiOff, AlertTriangle,
  Plus, CopyPlus,
  ArrowUpDown, GitCompareArrows, CheckSquare, Copy,
  TrendingUp,
  Tag,
  Download, Pin, FileText, Clock3,
  FolderDown,
  ChevronLeft, ChevronRight, Package,
  Activity,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from '@/lib/framer-motion-shim';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuShortcut,
} from '@/components/ui/context-menu';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useScriptStore } from '@/store/script-store';
import { ExecPanel } from '@/components/ExecPanel';
// Demo data import removed — real scripts loaded from DB
import { apiGet, apiPost, apiDelete } from '@/lib/api-client';
import type { ScriptData } from '@/types';

import { useAnimatedCount } from '@/hooks/useAnimatedCount';
import dynamic from 'next/dynamic';
import Script from 'next/script';

// ─── Extracted Components ─────────────────────────────────────────
import { ScriptCardInner, ScriptCardSkeleton, SortableScriptCard } from '@/components/ScriptCard';
import { AdvancedFilterPanel } from '@/components/AdvancedFilterPanel';
import { DesktopSidebar, MobileSidebarSheet } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { EmptyState, NoResultsEmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DiffDialog } from '@/components/DiffDialog';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { StatsDialog } from '@/components/StatsDialog';
import { BackToTopButton } from '@/components/BackToTopButton';
import { ShortcutsDialog } from '@/components/ShortcutsDialog';
import { CommandPalette } from '@/components/CommandPalette';
import { QuickStatsBar } from '@/components/QuickStatsBar';
import { ExecStatsDialog } from '@/components/ExecStatsDialog';
import { ScriptGraph } from '@/components/ScriptGraph';

const UploadDialog = dynamic(() => import('@/components/UploadDialogSimple'), { ssr: false });
const LLMConfigDialog = dynamic(() => import('@/components/LLMConfigDialogSimple'), { ssr: false });
const ExternalAppDialog = dynamic(() => import('@/components/ExternalAppDialogSimple'), { ssr: false });
const CreateScriptDialog = dynamic(() => import('@/components/CreateScriptDialog'), { ssr: false });
const ContentSearchDialog = dynamic(() => import('@/components/ContentSearchDialog'), { ssr: false });
const TemplateGallery = dynamic(() => import('@/components/TemplateGallery').then(m => ({ default: m.TemplateGallery })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  ),
});
const BatchTagDialog = dynamic(() => import('@/components/BatchTagDialog'), { ssr: false });

// ─── Constants (module-level) ─────────────────────────────────────
const ALLOWED_EXTENSIONS = ['.py', '.sh', '.js', '.ts', '.r', '.rb', '.pl', '.java', '.go'];

// ─── Shared: Auto-seed if no scripts ──────────────────────────────
// Eliminates duplicate seed logic in both loadScripts and mount useEffect
function autoSeedIfNeeded(
  hasAutoSeededRef: React.MutableRefObject<boolean>,
  setScripts: (scripts: any[]) => void,
  setUsingFallback: (v: boolean) => void,
  usingFallbackRef: React.MutableRefObject<boolean>
) {
  if (hasAutoSeededRef.current) return;
  hasAutoSeededRef.current = true;
  fetch('/api/seed')
    .then(r => r?.json())
    .then(seedD => {
      if (seedD?.imported > 0) {
        toast.success(seedD.message || `Imported ${seedD.imported} scripts`);
        fetch('/api/scripts')
          .then(r2 => r2?.json())
          .then(d2 => {
            if (d2?.scripts?.length > 0) {
              setScripts(d2.scripts);
              setUsingFallback(false);
              usingFallbackRef.current = false;
            }
          })
          .catch(() => {/* keep existing data */});
      }
    })
    .catch(() => {
      toast.error('Auto-seed failed. Use the Import button to add scripts.');
    });
}

// ─── Main Component ───────────────────────────────────────────────

export default function HomePage() {
  const { theme, setTheme } = useTheme();
  const store = useScriptStore();
  // Individual selectors for keyboard handler (avoid full-store dependency)
  const selectedScriptId = useScriptStore((s: any) => s.selectedScriptId);
  const setSelectedScript = useScriptStore((s: any) => s.setSelectedScript);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [llmOpen, setLlmOpen] = useState(false);
  const [appOpen, setAppOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [scripts, setScripts] = useState<ScriptData[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffScripts, setDiffScripts] = useState<[ScriptData | null, ScriptData | null]>([null, null]);
  const [apiHealth, setApiHealth] = useState<'checking' | 'ok' | 'error'>('checking');
  const [seeding, setSeeding] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [usingFallback, setUsingFallback] = useState(true);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [mobileExecOpen, setMobileExecOpen] = useState(false);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [mainDragOver, setMainDragOver] = useState(false);
  const [contentSearchOpen, setContentSearchOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [sessionStart] = useState(() => Date.now());
  const [batchCategoryOpen, setBatchCategoryOpen] = useState(false);
  const [batchTagOpen, setBatchTagOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [queueItems, setQueueItems] = useState<Array<{ id: string; name: string; status: 'pending' | 'running' | 'success' | 'error'; duration?: number; message?: string }>>([]);
  const queueCancelledRef = useRef(false);
  const [execStatsTriggerCount, setExecStatsTriggerCount] = useState(0);

  // Bundle import state
  const [importInProgress, setImportInProgress] = useState(false);
  const bundleInputRef = useRef<HTMLInputElement>(null);

  // Task 20-a: Execution durations for sparkline
  const [executionDurations, setExecutionDurations] = useState<Record<string, number[]>>({});
  const [sparklineLoadingIds, setSparklineLoadingIds] = useState<Set<string>>(new Set());

  // Task 5: Confirm dialog state for single delete
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleteConfirmLoading, setDeleteConfirmLoading] = useState(false);

  // Task 5: Confirm dialog state for batch delete
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [batchDeleteDialogLoading, setBatchDeleteDialogLoading] = useState(false);

  // Tags derived data
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    scripts.forEach(s => {
      try {
        const tags: string[] = JSON.parse(s.tags || '[]');
        tags.forEach(t => tagSet.add(t));
      } catch { /* ignore */ }
    });
    return Array.from(tagSet).sort();
  }, [scripts]);

  // Language distribution for dashboard
  const langDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    scripts.forEach(s => { dist[s.language] = (dist[s.language] || 0) + 1; });
    return Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [scripts]);

  // Feature 1: Category execution distribution for sparkline
  const categoryExecDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    scripts.forEach(s => {
      const cat = s.category || 'Uncategorized';
      dist[cat] = (dist[cat] || 0) + (s._count?.executions || 0);
    });
    return Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [scripts]);

  // Most run scripts (top 3)
  const topRunScripts = useMemo(() => {
    return [...scripts].sort((a, b) => (b._count?.executions || 0) - (a._count?.executions || 0)).slice(0, 3);
  }, [scripts]);

  const mountedRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  // Use refs for values used inside loadScripts to avoid stale closures
  const hasAutoSeededRef = useRef(false);
  const usingFallbackRef = useRef(true);
  const initialLoadDoneRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    setMounted(true);
  }, []);

  // ─── Load Scripts (with resilience) ────────────────────────────
  const loadScripts = useCallback(async (isAutoSeed = false) => {
    if (!isAutoSeed) setLoading(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const r = await fetch('/api/scripts?excludeContent=true&limit=500', { signal: controller.signal });
      clearTimeout(timeout);
      if (!r.ok) throw new Error('API error');
      const d: any = await r.json();
      const fetched = d.scripts || [];
      if (fetched.length > 0) {
        setScripts(fetched);
        // Prune stale IDs from customOrder
        store.pruneCustomOrder(fetched.map((s: any) => s.id));
      }
      setApiHealth('ok');
      setUsingFallback(false);
      usingFallbackRef.current = false;

      if (fetched.length === 0) {
        autoSeedIfNeeded(hasAutoSeededRef, setScripts, setUsingFallback, usingFallbackRef);
      }
    } catch {
      setApiHealth('error');
    } finally {
      setLoading(false);
      setInitialLoadDone(true);
    }
  }, []);

  // ─── Initial data fetch on mount (consolidated) ────────────────
  useEffect(() => {
    let cancelled = false;
    const applyData = (data: any) => {
      if (cancelled || initialLoadDoneRef.current) return;
      const fetched = data?.scripts || [];
      if (fetched.length > 0) {
        setScripts(fetched);
      }
      setApiHealth('ok');
      setUsingFallback(false);
      usingFallbackRef.current = false;
      initialLoadDoneRef.current = true;
      setInitialLoadDone(true);
      setLoading(false);

      // Auto-seed if no scripts
      if (fetched.length === 0) {
        autoSeedIfNeeded(hasAutoSeededRef, setScripts, setUsingFallback, usingFallbackRef);
      }
    };

    // 1. Check for preloaded data
    const preData = (window as any).__SCRIPTHUB_DATA__;
    if (preData?.scripts?.length > 0) {
      applyData(preData);
      return;
    }

    // 2. Listen for pre-hydration fetch event
    const onData = () => {
      const d = (window as any).__SCRIPTHUB_DATA__;
      if (d) applyData(d);
    };
    window.addEventListener('scripthub-data', onData);

    // 3. Fetch with 8s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    (async () => {
      try {
        const r = await fetch('/api/scripts?excludeContent=true&limit=500', { signal: controller.signal });
        clearTimeout(timeout);
        if (cancelled) return;
        if (!r.ok) throw new Error('API error');
        const d: any = await r.json();
        applyData(d);
      } catch {
        clearTimeout(timeout);
        if (!cancelled && !(window as any).__SCRIPTHUB_DATA__) {
          setApiHealth('error');
          initialLoadDoneRef.current = true;
          setInitialLoadDone(true);
          setLoading(false);
        }
      }
    })();

    // 4. 3s fallback timer (only if initialLoadDone is still false)
    const fallbackTimer = setTimeout(() => {
      if (!cancelled && !initialLoadDoneRef.current) {
        fetch('/api/scripts?excludeContent=true&limit=500')
          .then(r => { if (!r.ok) throw new Error(); return r.json(); })
          .then(d => {
            const fetched = d.scripts || [];
            if (!cancelled && !initialLoadDoneRef.current) {
              setScripts(fetched);
              setApiHealth('ok');
              setUsingFallback(false);
              usingFallbackRef.current = false;
              initialLoadDoneRef.current = true;
              setInitialLoadDone(true);
              setLoading(false);
            }
          })
          .catch(() => {
            if (!cancelled && !initialLoadDoneRef.current) {
              setApiHealth('error');
              initialLoadDoneRef.current = true;
              setInitialLoadDone(true);
              setLoading(false);
            }
          });
      }
    }, 3000);

    return () => {
      cancelled = true;
      window.removeEventListener('scripthub-data', onData);
      controller.abort();
      clearTimeout(fallbackTimer);
    };
  }, []);

  // Feature 5: Health score calculation
  const healthScores = useMemo(() => {
    const scores = new Map<string, number>();
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    scripts.forEach(s => {
      let score = 0;
      if (s.description) score += 20;
      try { if (JSON.parse(s.tags || '[]').length >= 1) score += 15; } catch { /* ignore */ }
      try { if (JSON.parse(s.params || '[]').length >= 1) score += 15; } catch { /* ignore */ }
      if ((s._count?.executions || 0) >= 1) score += 15;
      if ((s.content?.split('\n').length || 0) < 100) score += 10;
      if (now - new Date(s.createdAt).getTime() < sevenDays) score += 10;
      // Has active execution history (3+ runs)
      if ((s._count?.executions || 0) >= 3) score += 15;
      scores.set(s.id, Math.min(score, 100));
    });
    return scores;
  }, [scripts]);

  // Derived data
  const { categoryMap, sortedCategories, totalScripts } = useMemo(() => {
    const map: Record<string, number> = {};
    scripts.forEach(s => { const cat = s.category || 'Uncategorized'; map[cat] = (map[cat] || 0) + 1; });
    return {
      categoryMap: map,
      sortedCategories: Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])),
      totalScripts: scripts.length,
    };
  }, [scripts]);

  const filtered = useMemo(() => {
    const result = scripts.filter(s => {
      if (store.selectedCategory === 'Favorites' && !store.favorites.includes(s.id)) return false;
      if (store.selectedCategory === 'Recent' && !store.recentScripts.includes(s.id)) return false;
      if (!['All', 'Favorites', 'Recent'].includes(store.selectedCategory) && s.category !== store.selectedCategory) return false;
      if (store.selectedTag) {
        try {
          const tags: string[] = JSON.parse(s.tags || '[]');
          if (!tags.includes(store.selectedTag)) return false;
        } catch { return false; }
      }
      // Source filter
      if (store.selectedSource && s.source !== store.selectedSource) return false;
      // Language filter
      if (store.selectedLanguages.length > 0 && !store.selectedLanguages.includes(s.language)) return false;
      if (store.searchQuery) {
        const q = store.searchQuery.toLowerCase();
        const contentFull = (s.content || '').toLowerCase();
        const contentPrefix = contentFull.slice(0, 100);
        const tagsStr = (() => { try { return JSON.parse(s.tags || '[]').join(' ').toLowerCase(); } catch { return ''; } })();
        const matchesName = s.name.toLowerCase().includes(q) ||
          (s.description || '').toLowerCase().includes(q) ||
          s.filename.toLowerCase().includes(q) ||
          s.language.toLowerCase().includes(q) ||
          tagsStr.includes(q) ||
          (s.category || '').toLowerCase().includes(q);
        if (store.searchMode === 'name') return matchesName;
        if (store.searchMode === 'content') return matchesName || contentFull.includes(q);
        // 'all' mode: name match or first 100 chars of content
        return matchesName || contentPrefix.includes(q);
      }
      return true;
    });
    // Always sort pinned scripts to the top, regardless of sort mode
    result.sort((a, b) => {
      const aPinned = store.pinnedScripts.includes(a.id);
      const bPinned = store.pinnedScripts.includes(b.id);
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      switch (store.sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'date': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'language': return a.language.localeCompare(b.language);
        case 'category': return (a.category || '').localeCompare(b.category || '');
        case 'runs': return (b._count?.executions || 0) - (a._count?.executions || 0);
        case 'size': return (b.content?.split('\n').length || 0) - (a.content?.split('\n').length || 0);
        case 'recency': return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
        case 'health': return (healthScores.get(b.id) || 0) - (healthScores.get(a.id) || 0);
        case 'rating': return (b.rating || 0) - (a.rating || 0);
        case 'custom': {
          const orderA = store.customOrder.indexOf(a.id);
          const orderB = store.customOrder.indexOf(b.id);
          if (orderA === -1 && orderB === -1) return 0;
          if (orderA === -1) return 1;
          if (orderB === -1) return -1;
          return orderA - orderB;
        }
        default: return 0;
      }
    });
    return result;
  }, [scripts, store.selectedCategory, store.searchQuery, store.searchMode, store.favorites, store.recentScripts, store.sortBy, store.selectedTag, store.selectedSource, store.selectedLanguages, store.customOrder, store.pinnedScripts, healthScores]);

  const totalExecutions = useMemo(() => {
    return scripts.reduce((acc, s) => acc + (s._count?.executions || 0), 0);
  }, [scripts]);

  const recentRuns = totalExecutions;

  const selectedScript = useMemo(() => {
    if (!store.selectedScriptId) return null;
    // Prefer store's selectedScript (may have fetched full content)
    if (store.selectedScript?.id === store.selectedScriptId) return store.selectedScript;
    return scripts.find(s => s.id === store.selectedScriptId) ?? null;
  }, [scripts, store.selectedScriptId, store.selectedScript]);

  const handleSelectScript = useCallback(async (script: ScriptData) => {
    // Set the selection immediately for fast feedback
    store.setSelectedScript(script.id, script);
    store.addRecent(script.id);
    setMobileExecOpen(true);
    // Fetch full content if content is empty (due to excludeContent=true optimization)
    if (!script.content && script.id) {
      try {
        const r = await fetch(`/api/scripts/${script.id}`);
        if (r.ok) {
          const data = await r.json();
          if (data.script?.content) {
            // Update store with full content
            store.setSelectedScript(script.id, { ...script, content: data.script.content });
          }
        }
      } catch { /* content fetch is best-effort */ }
    }
  }, [store]);

  const handleDuplicateScript = useCallback(async (script: ScriptData) => {
    try {
      await apiPost('/api/scripts', {
        name: `${script.name} (Copy)`,
        description: script.description,
        filename: script.filename.replace(/(\.\w+)$/, '_copy$1'),
        content: script.content,
        category: script.category,
        language: script.language,
        source: 'manual',
        params: script.params,
        inputFiles: script.inputFiles,
        outputFiles: script.outputFiles,
      });
      toast.success('Script duplicated', { description: `${script.name} (Copy)` });
      store.addNotification(`Duplicated "${script.name}"`, 'info');
      loadScripts();
    } catch {
      toast.error('Failed to duplicate script');
    }
  }, [loadScripts, store]);

  // Rating handler
  const handleRateScript = useCallback(async (scriptId: string, rating: number) => {
    try {
      await fetch(`/api/scripts/${scriptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      });
      // Update local state immediately
      setScripts(prev => prev.map(s => s.id === scriptId ? { ...s, rating } : s));
      if (rating > 0) {
        toast.success(`Rated ${rating} star${rating !== 1 ? 's' : ''}`);
      } else {
        toast.success('Rating cleared');
      }
    } catch {
      toast.error('Failed to update rating');
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
      if (e.key === 'Escape' && selectedScriptId) {
        setSelectedScript(null, null);
        setMobileExecOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setUploadOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setShortcutsOpen(prev => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setContentSearchOpen(prev => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        setTemplateOpen(prev => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        setExecStatsTriggerCount(prev => prev + 1);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        if (focusedIndex >= 0 && filtered[focusedIndex]) {
          handleDuplicateScript(filtered[focusedIndex]);
        }
      }
      const noDialogsOpen = !uploadOpen && !createOpen && !shortcutsOpen && !diffOpen && !statsOpen && !commandPaletteOpen && !contentSearchOpen && !templateOpen;
      if (e.key === 'ArrowDown' && filtered.length > 0 && noDialogsOpen) {
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, filtered.length - 1));
      }
      if (e.key === 'ArrowUp' && noDialogsOpen) {
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
      }
      if (e.key === 'Enter' && focusedIndex >= 0 && filtered[focusedIndex] && noDialogsOpen) {
        e.preventDefault();
        handleSelectScript(filtered[focusedIndex]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedScriptId, setSelectedScript, filtered, focusedIndex, handleSelectScript, uploadOpen, createOpen, shortcutsOpen, diffOpen, statsOpen, commandPaletteOpen, contentSearchOpen, templateOpen, handleDuplicateScript]);

  // ─── Drag-and-drop file upload handler ───────────────────────

  const handleMainDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setMainDragOver(true);
    }
  }, []);

  const handleMainDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setMainDragOver(false);
  }, []);

  const handleMainDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMainDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    const validFiles = files.filter(f => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      return ALLOWED_EXTENSIONS.includes(ext);
    });
    if (validFiles.length === 0) {
      toast.error('No valid script files detected', { description: 'Accepted: .py, .sh, .js, .ts, .r, .rb, .pl, .java, .go' });
      return;
    }
    for (const file of validFiles) {
      try {
        const content = await file.text();
        const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';
        const langMap: Record<string, string> = { py: 'python', sh: 'shell', js: 'javascript', ts: 'typescript', r: 'r', rb: 'ruby', pl: 'perl', java: 'java', go: 'go' };
        await apiPost('/api/scripts', {
          name: file.name.replace(/\.[^.]+$/, ''),
          description: `Uploaded via drag-and-drop`,
          filename: file.name,
          content,
          category: 'General',
          language: langMap[ext] || ext,
          source: 'upload',
        });
        toast.success(`Imported "${file.name}"`);
      } catch {
        toast.error(`Failed to import "${file.name}"`);
      }
    }
    loadScripts();
  }, [loadScripts]);

  // Scroll to top on category/filter change
  useEffect(() => {
    setCurrentPage(1);
    const main = document.querySelector('main');
    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
  }, [store.selectedCategory, store.searchQuery, store.selectedTag, store.sortBy, store.pageSize]);

  const handleImportDemo = useCallback(async () => {
    setSeeding(true);
    try {
      const d = await apiGet<{imported: number; message: string}>('/api/seed');
      const count = d.imported || 0;
      toast.success(d.message || `Imported ${count} scripts`);
      store.addNotification(d.message || `Imported ${count} scripts`, 'success');
      loadScripts();
    } catch {
      toast.error('Failed to import scripts — server unavailable');
    } finally {
      setSeeding(false);
    }
  }, [loadScripts, store]);

  // Bundle import handler (ZIP or JSON)
  const handleBundleImport = useCallback(() => {
    bundleInputRef.current?.click();
  }, []);

  const handleBundleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset the input so the same file can be re-selected
    e.target.value = '';

    setImportInProgress(true);
    const langMap: Record<string, string> = { py: 'python', sh: 'shell', js: 'javascript' };
    const scriptsToCreate: Array<{ name: string; filename: string; content: string; language: string; category: string; tags: string[]; description: string }> = [];

    try {
      if (file.name.endsWith('.json')) {
        // Parse JSON bundle
        const text = await file.text();
        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch {
          toast.error('Invalid JSON file', { description: 'Could not parse the bundle file.' });
          setImportInProgress(false);
          return;
        }
        // Support both array format and single-script format
        const items = Array.isArray(parsed) ? parsed : parsed._format === 'scripthub-script-bundle' ? [parsed] : Array.isArray(parsed.scripts) ? parsed.scripts : [parsed];
        for (const item of items) {
          if (item.content) {
            scriptsToCreate.push({
              name: item.name || item.filename || 'Imported Script',
              filename: item.filename || item.name || 'script.txt',
              content: item.content,
              language: item.language || 'python',
              category: item.category || 'General',
              tags: item.tags || [],
              description: item.description || `Imported from bundle: ${file.name}`,
            });
          }
        }
      } else if (file.name.endsWith('.zip')) {
        // Parse ZIP file
        const zip = new JSZip();
        const contents = await zip.loadAsync(file);
        const allowedExts = ['.py', '.js', '.sh'];
        for (const [path, zipEntry] of Object.entries(contents.files)) {
          if (zipEntry.dir) continue;
          const ext = '.' + path.split('.').pop()?.toLowerCase();
          if (!allowedExts.includes(ext)) continue;
          // Skip files in __MACOSX or hidden dirs
          if (path.startsWith('__MACOSX') || path.split('/').some(seg => seg.startsWith('.'))) continue;
          const content = await zipEntry.async('string');
          const filename = path.split('/').pop() || path;
          const extKey = ext.replace('.', '');
          scriptsToCreate.push({
            name: filename.replace(/\.[^.]+$/, ''),
            filename,
            content,
            language: langMap[extKey] || extKey,
            category: 'General',
            tags: [],
            description: `Imported from ZIP: ${file.name}`,
          });
        }
      } else {
        toast.error('Unsupported file format', { description: 'Please select a .zip or .json file.' });
        setImportInProgress(false);
        return;
      }

      if (scriptsToCreate.length === 0) {
        toast.info('No scripts found in the bundle', { description: 'The file did not contain any importable scripts.' });
        setImportInProgress(false);
        return;
      }

      // Import each script via API (skip duplicates)
      let imported = 0;
      let failed = 0;
      let skipped = 0;
      for (const s of scriptsToCreate) {
        try {
          // Check for duplicate filename
          const checkRes = await fetch(`/api/scripts/check-duplicate?filename=${encodeURIComponent(s.filename)}`);
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            if (checkData.exists) {
              skipped++;
              continue;
            }
          }
          await apiPost('/api/scripts', {
            name: s.name,
            description: s.description,
            filename: s.filename,
            content: s.content,
            category: s.category,
            language: s.language,
            source: 'import',
            tags: JSON.stringify(s.tags),
          });
          imported++;
        } catch {
          failed++;
        }
      }

      if (imported > 0 || skipped > 0) {
        const skipMsg = skipped > 0 ? ` (${skipped} skipped as duplicates)` : '';
        const failMsg = failed > 0 ? ` (${failed} failed)` : '';
        toast.success(`Imported ${imported} script${imported !== 1 ? 's' : ''}${skipMsg}${failMsg}`, {
          description: `From: ${file.name}`,
        });
        store.addNotification(`Imported ${imported} script(s) from ${file.name}${skipMsg}`, 'success');
        loadScripts();
      } else if (skipped > 0) {
        toast.info('All scripts skipped as duplicates', { description: `${skipped} script(s) with existing filenames were skipped.` });
      } else {
        toast.error('All imports failed', { description: `Failed to import ${failed} script(s) from ${file.name}` });
      }
    } catch (err) {
      toast.error('Failed to process bundle', { description: String(err?.toString?.() || 'Unknown error').slice(0, 80) });
    }
    setImportInProgress(false);
  }, [loadScripts, store]);

  // Task 5: Request delete via ConfirmDialog
  const handleRequestDelete = useCallback((id: string) => {
    const script = scripts.find(s => s.id === id);
    setDeleteConfirmId(id);
    setDeleteConfirmName(script?.name || id.slice(0, 8));
    setDeleteConfirmOpen(true);
  }, [scripts]);

  // Task 5: Actual delete (called when ConfirmDialog confirms)
  const handleDeleteScript = useCallback(async (id: string) => {
    setDeleteConfirmLoading(true);
    const script = scripts.find(s => s.id === id);
    try {
      await apiDelete(`/api/scripts/${id}`);
      toast.success('Script deleted');
      store.addNotification(`Deleted "${script?.name || id.slice(0, 8)}"`, 'info');
      if (store.selectedScriptId === id) {
        store.setSelectedScript(null, null);
      }
      loadScripts();
    } catch {
      toast.error('Failed to delete script');
    } finally {
      setDeleteConfirmLoading(false);
      setDeleteConfirmOpen(false);
    }
  }, [loadScripts, store, scripts]);

  const [quickRunningId, setQuickRunningId] = useState<string | null>(null);
  const [quickRunConfirmId, setQuickRunConfirmId] = useState<string | null>(null);
  const quickRunConfirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQuickRun = useCallback((script: ScriptData) => {
    if (quickRunningId) return; // already running
    if (quickRunConfirmId === script.id) {
      // Second click — actually execute
      if (quickRunConfirmTimerRef.current) clearTimeout(quickRunConfirmTimerRef.current);
      setQuickRunConfirmId(null);
      // Actual execution
      setQuickRunningId(script.id);
      store.setLastRunStatus(script.id, 'running');
      apiPost<{status: string; duration: number; error?: string}>('/api/execute', { id: script.id, params: {}, inputFiles: {} })
        .then(data => {
          if (data.status === 'success') {
            toast.success(`✓ ${script.name}`, {
              description: `Completed in ${data.duration >= 1000 ? `${(data.duration / 1000).toFixed(2)}s` : `${data.duration}ms`}`,
            });
            store.addNotification(`Execution of "${script.name}" completed`, 'success');
            store.setLastRunDuration(script.id, data.duration);
            store.setLastRunStatus(script.id, 'success');
          } else {
            toast.error(`✗ ${script.name}`, {
              description: data.error?.slice(0, 80) || 'Execution failed',
            });
            store.addNotification(`Execution of "${script.name}" failed`, 'error');
            store.setLastRunStatus(script.id, 'error');
          }
          loadScripts();
        })
        .catch(() => {
          toast.error(`✗ ${script.name}`, { description: 'Network error' });
        })
        .finally(() => {
          setQuickRunningId(null);
        });
    } else {
      // First click — enter confirmation state
      setQuickRunConfirmId(script.id);
      toast.info('Click again to confirm execution');
      if (quickRunConfirmTimerRef.current) clearTimeout(quickRunConfirmTimerRef.current);
      quickRunConfirmTimerRef.current = setTimeout(() => {
        setQuickRunConfirmId(null);
      }, 3000);
    }
  }, [quickRunningId, quickRunConfirmId, loadScripts, store]);

  // Task 5: Open batch delete ConfirmDialog
  const handleBatchDeleteRequest = useCallback(() => {
    setBatchDeleteDialogOpen(true);
  }, []);

  // Task 5: Actual batch delete (called when ConfirmDialog confirms)
  const handleBatchDeleteConfirm = useCallback(async () => {
    const ids = store.selectedForBatch;
    if (ids.length === 0) return;
    setBatchDeleteDialogLoading(true);
    let deleted = 0;
    for (const id of ids) {
      try {
        await apiDelete(`/api/scripts/${id}`);
        deleted++;
      } catch { /* continue */ }
    }
    toast.success(`Deleted ${deleted} scripts`);
    // Clear selected script if it was among the deleted
    if (ids.includes(store.selectedScriptId || '')) {
      store.setSelectedScript(null, null);
    }
    store.clearBatchSelect();
    setBatchDeleteDialogLoading(false);
    setBatchDeleteDialogOpen(false);
    loadScripts();
  }, [store, loadScripts]);

  // Task 5: Clear all filters handler
  const handleClearFilters = useCallback(() => {
    store.setSearchQuery('');
    store.setSelectedCategory('All');
    store.setSelectedTag(null);
  }, [store]);

  const handleBatchExportZip = useCallback(async () => {
    const ids = store.selectedForBatch;
    const sourceScripts = ids.length > 0 ? scripts.filter(s => ids.includes(s.id)) : filtered;
    if (sourceScripts.length === 0) return;
    try {
      const zip = new JSZip();
      sourceScripts.forEach(s => {
        const category = s.category || 'Uncategorized';
        const filename = s.filename || `${s.name}.${s.language === 'python' ? 'py' : s.language === 'bash' ? 'sh' : 'txt'}`;
        zip.file(`${category}/${filename}`, s.content || '');
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scripthub-export-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      const sizeKB = (blob.size / 1024).toFixed(1);
      toast.success(`Exported ${sourceScripts.length} scripts as ZIP`, { description: `${sizeKB} KB` });
      if (ids.length > 0) store.clearBatchSelect();
    } catch {
      toast.error('Failed to generate ZIP file');
    }
  }, [store, scripts, filtered]);

  const handleBatchExport = useCallback(async () => {
    const ids = store.selectedForBatch;
    if (ids.length === 0) return;
    const selected = scripts.filter(s => ids.includes(s.id));
    const text = selected.map(s => '# ' + s.name + '\n# ' + s.description + '\n' + s.content).join('\n\n' + '='.repeat(60) + '\n\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${selected.length} scripts copied to clipboard`);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
    store.clearBatchSelect();
  }, [store, scripts]);

  const handleBatchCategory = useCallback(async (category: string) => {
    const ids = store.selectedForBatch;
    if (ids.length === 0) return;
    let updated = 0;
    for (const id of ids) {
      try {
        await fetch(`/api/scripts/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category }),
        });
        updated++;
      } catch { /* continue */ }
    }
    toast.success(`Changed category of ${updated} scripts to ${category}`);
    store.clearBatchSelect();
    loadScripts();
  }, [store, loadScripts]);

  const handleBatchFavorite = useCallback(() => {
    const ids = store.selectedForBatch;
    if (ids.length === 0) return;
    ids.forEach((id: string) => {
      if (!store.favorites.includes(id)) {
        store.toggleFavorite(id);
      }
    });
    toast.success(`Added ${ids.length} scripts to favorites`);
    store.clearBatchSelect();
  }, [store]);

  const handleSelectAll = useCallback(() => {
    const allIds = filtered.map(s => s.id);
    allIds.forEach(id => {
      if (!store.selectedForBatch.includes(id)) {
        store.toggleBatchSelect(id);
      }
    });
  }, [filtered, store]);

  const handleBatchRun = useCallback(async () => {
    const ids = store.selectedForBatch;
    if (ids.length === 0) return;
    setBatchRunning(true);
    let successCount = 0;
    let failCount = 0;
    const results: string[] = [];
    for (const id of ids) {
      // Check if batch was cancelled between iterations
      if (queueCancelledRef.current) break;
      const script = scripts.find(s => s.id === id);
      const name = script?.name || id.slice(0, 8);
      try {
        const startTime = Date.now();
        const data = await apiPost<{status: string; duration: number; error?: string}>('/api/execute', { id, params: {}, inputFiles: {} }).catch(() => { failCount++; results.push(`✗ ${name} - Error`); return null; });
        if (!data) { continue; }
        const elapsed = data.duration || (Date.now() - startTime);
        if (data.status === 'success') {
          successCount++;
          results.push(`✓ ${name} - ${elapsed >= 1000 ? `${(elapsed / 1000).toFixed(1)}s` : `${elapsed}ms`}`);
        } else {
          failCount++;
          results.push(`✗ ${name} - ${data.error?.slice(0, 40) || 'Error'}`);
        }
      } catch {
        failCount++;
        results.push(`✗ ${name} - Network error`);
      }
    }
    const summaryLine = '---\n' + successCount + ' succeeded, ' + failCount + ' failed';
    toast.success('Batch run complete', {
      description: [...results, summaryLine].join('\n'),
      className: 'font-mono text-xs whitespace-pre-line',
    });
    store.clearBatchSelect();
    setBatchRunning(false);
  }, [store, scripts]);

  const handleExportAll = useCallback(async () => {
    const text = filtered.map(s => '# ' + s.name + '\n# ' + s.description + '\n' + s.content).join('\n\n' + '='.repeat(60) + '\n\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${filtered.length} scripts copied to clipboard`);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  }, [filtered]);

  const handleBatchRunWithProgress = useCallback(async () => {
    const ids = store.selectedForBatch;
    if (ids.length === 0) return;
    queueCancelledRef.current = false;
    const items = scripts.filter(s => ids.includes(s.id)).map(s => ({
      id: s.id, name: s.name || s.id.slice(0, 8), status: 'pending' as const,
    }));
    setQueueItems(items);
    setQueueOpen(true);
    let successCount = 0;
    let failCount = 0;
    for (let i = 0; i < items.length; i++) {
      if (queueCancelledRef.current) break;
      const item = items[i];
      setQueueItems(prev => prev.map(q => q.id === item.id ? { ...q, status: 'running' } : q));
      try {
        const startTime = Date.now();
        const data = await apiPost<{status: string; duration: number; error?: string}>('/api/execute', { id: item.id, params: {}, inputFiles: {} });
        const elapsed = Date.now() - startTime;
        if (data.status === 'success') {
          successCount++;
          setQueueItems(prev => prev.map(q => q.id === item.id ? { ...q, status: 'success', duration: elapsed, message: `${elapsed >= 1000 ? `${(elapsed/1000).toFixed(1)}s` : `${elapsed}ms`}` } : q));
        } else {
          failCount++;
          setQueueItems(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error', message: data.error?.slice(0, 40) || 'Error' } : q));
        }
      } catch {
        failCount++;
        setQueueItems(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error', message: 'Network error' } : q));
      }
    }
    toast.success('Batch run complete', { description: `${successCount} succeeded, ${failCount} failed` });
    store.clearBatchSelect();
  }, [store, scripts]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / store.pageSize);
  const paginatedFiltered = useMemo(() => {
    const start = (currentPage - 1) * store.pageSize;
    return filtered.slice(start, start + store.pageSize);
  }, [filtered, currentPage, store.pageSize]);

  const downloadScript = useCallback((script: ScriptData) => {
    const blob = new Blob([script.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = script.filename || `${script.name}.${script.language === 'python' ? 'py' : script.language === 'bash' ? 'sh' : 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Script downloaded', { description: script.filename });
  }, []);

  const handleOpenDiff = useCallback((script: ScriptData) => {
    if (!diffScripts[0]) {
      setDiffScripts([script, null]);
      toast.info('Select a second script to compare');
    } else if (!diffScripts[1] && script.id !== diffScripts[0].id) {
      setDiffScripts([diffScripts[0], script]);
      setDiffOpen(true);
    } else {
      setDiffScripts([script, null]);
    }
  }, [diffScripts]);

  // Feature 3: DnD Kit setup
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = filtered.findIndex(s => s.id === active.id);
      const newIndex = filtered.findIndex(s => s.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = filtered.map(s => s.id);
        const moved = arrayMove(newOrder, oldIndex, newIndex);
        store.setCustomOrder(moved);
      }
    }
  }, [filtered, store]);

  // Footer clock
  const [footerTime, setFooterTime] = useState('');
  useEffect(() => {
    const update = () => setFooterTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  const showLoading = loading && !initialLoadDone && scripts.length === 0;
  const [showBrandedSpinner, setShowBrandedSpinner] = useState(true);

  // Transition from branded spinner to skeletons after 2 seconds
  useEffect(() => {
    if (!showLoading) {
      setShowBrandedSpinner(true);
      return;
    }
    const timer = setTimeout(() => setShowBrandedSpinner(false), 2000);
    return () => clearTimeout(timer);
  }, [showLoading]);

  // Animated counters
  const animTotalScripts = useAnimatedCount(totalScripts);
  const animRecentRuns = useAnimatedCount(recentRuns);
  const animTotalExecutions = useAnimatedCount(totalExecutions);
  const animFavs = useAnimatedCount(store.favorites.length);

  // Search input scale animation
  const [searchClearing, setSearchClearing] = useState(false);

  // Session stats for footer popup
  const sessionStats = useMemo(() => {
    const totalLines = scripts.reduce((acc, s) => acc + (s.content?.split('\n').length || 0), 0);
    const langCounts: Record<string, number> = {};
    scripts.forEach(s => { langCounts[s.language] = (langCounts[s.language] || 0) + 1; });
    const mostPopularLang = Object.entries(langCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    return { totalLines, mostPopularLang };
  }, [scripts]);

  const handleScriptRenamed = useCallback((id: string, newName: string) => {
    setScripts(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s));
    loadScripts();
  }, [loadScripts]);

  // ─── Task 20-a: Fetch execution durations for sparkline ────────
  useEffect(() => {
    if (!initialLoadDone || scripts.length === 0) return;

    // Only fetch for scripts with executions, sorted by count (top 10)
    const scriptsToFetch = scripts
      .filter(s => (s._count?.executions || 0) > 0)
      .sort((a, b) => (b._count?.executions || 0) - (a._count?.executions || 0))
      .slice(0, 10);

    if (scriptsToFetch.length === 0) return;

    // Set loading state for these scripts
    const loadingSet = new Set(scriptsToFetch.map(s => s.id));
    setSparklineLoadingIds(loadingSet);

    let cancelled = false;
    const fetchDurations = async () => {
      // Fetch sequentially (2 at a time) to avoid overwhelming the server
      const results: Record<string, number[]> = {};
      const batchSize = 2;
      for (let i = 0; i < scriptsToFetch.length; i += batchSize) {
        if (cancelled) break;
        const batch = scriptsToFetch.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (s) => {
            try {
              const r = await fetch(`/api/scripts/${s.id}/executions`);
              if (!r.ok) return { id: s.id, durations: [] as number[] };
              const d = await r.json();
              const durations: number[] = (d.executions || [])
                .filter((e: any) => e.duration != null && e.status === 'success')
                .map((e: any) => e.duration)
                .slice(0, 10);
              return { id: s.id, durations };
            } catch {
              return { id: s.id, durations: [] as number[] };
            }
          })
        );
        batchResults.forEach(r => { results[r.id] = r.durations; });

        // Incrementally update as each batch completes
        if (!cancelled) {
          setExecutionDurations(prev => ({ ...prev, ...results }));
          // Remove completed IDs from loading set
          setSparklineLoadingIds(prev => {
            const next = new Set(prev);
            batch.forEach(s => next.delete(s.id));
            return next;
          });
        }
      }
    };

    fetchDurations();
    return () => { cancelled = true; };
  }, [scripts, initialLoadDone]);

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-background">
        {/* ─── PRE-HYDRATION DATA FETCH ─────────────────────────── */}
        <Script id="scripthub-prefetch" strategy="afterInteractive">
          {`setTimeout(function(){fetch('/api/scripts').then(function(r){return r.json()}).then(function(d){window.__SCRIPTHUB_DATA__=d;window.dispatchEvent(new Event('scripthub-data'))}).catch(function(){})},100);`}
        </Script>
        {/* ─── LOADING PROGRESS BAR ────────────────────────────── */}
        <div className="fixed top-0 left-0 right-0 z-50 h-[2px]">
          <AnimatePresence>
            {(loading || batchRunning || quickRunningId) && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                exit={{ scaleX: 1 }}
                transition={{ duration: batchRunning ? 10 : 3, ease: 'linear' }}
                className="h-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 origin-left"
              />
            )}
          </AnimatePresence>
        </div>

        {/* ─── OFFLINE / CACHED DATA BANNER ─────────────────────── */}
        <AnimatePresence>
          {apiHealth === 'error' && scripts.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <div className="size-5 rounded-full bg-amber-200/50 dark:bg-amber-800/50 flex items-center justify-center shrink-0">
                    <WifiOff className="size-3" />
                  </div>
                  <span className="text-xs font-medium">
                    {usingFallback ? 'Showing cached data \u2014 server not yet reached' : 'Showing cached data \u2014 server connection lost'}
                  </span>
                  <Button
                    variant="outline"
                    size="xs"
                    className="ml-auto gap-1 text-[10px] border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 active:scale-95 transition-transform"
                    onClick={() => loadScripts()}
                  >
                    <RefreshCw className="size-3" />Retry
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── HEADER ──────────────────────────────────────────────── */}
        <Header
          theme={theme}
          setTheme={setTheme as (theme: string) => void}
          mounted={mounted}
          searchFocused={searchFocused}
          setSearchFocused={setSearchFocused}
          searchClearing={searchClearing}
          setSearchClearing={setSearchClearing}
          recentRuns={recentRuns}
          onToggleMobileSidebar={() => setMobileSidebar(true)}
          onUploadOpen={() => setUploadOpen(true)}
          onImportBundle={handleBundleImport}
          onAppOpen={() => setAppOpen(true)}
          onLlmOpen={() => setLlmOpen(true)}
          onShortcutsOpen={() => setShortcutsOpen(true)}
          onStatsOpen={() => setStatsOpen(true)}
          onRefresh={loadScripts}
          onToggleStatsBar={() => setStatsExpanded(prev => !prev)}
          statsExpanded={statsExpanded}
          scripts={scripts.map(s => ({ id: s.id, name: s.name, language: s.language }))}
          onSelectScript={(id) => { const s = scripts.find(sc => sc.id === id); if (s) handleSelectScript(s); }}
          importInProgress={importInProgress}
          onFilterToggle={() => setFilterPanelOpen(prev => !prev)}
          filterPanelOpen={filterPanelOpen}
          onToggleBatchMode={() => store.setBatchMode(!store.batchMode)}
          batchMode={store.batchMode}
        />

        {/* ─── QUICK STATS BAR ────────────────────────────────── */}
        <QuickStatsBar
          expanded={statsExpanded}
          scripts={scripts}
          totalScripts={totalScripts}
          totalExecutions={totalExecutions}
          favoritesCount={store.favorites.length}
          langDistribution={langDistribution}
        />

        {/* ─── EXEC STATS DIALOG ─────────────────────────────────── */}
        <div className="flex justify-end mb-2 px-1">
          <ExecStatsDialog scripts={scripts} totalExecutions={totalExecutions} externalTriggerCount={execStatsTriggerCount} />
        </div>

        {/* ─── ADVANCED FILTER PANEL ──────────────────────────────── */}
        <AdvancedFilterPanel
          scripts={scripts}
          open={filterPanelOpen}
          onClose={() => setFilterPanelOpen(false)}
        />

        {/* ─── MAIN LAYOUT ─────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ─── SIDEBAR ─────────────────────────────────────────── */}
          <DesktopSidebar
            scripts={scripts}
            sortedCategories={sortedCategories}
            categoryMap={categoryMap}
            allTags={allTags}
            langDistribution={langDistribution}
            categoryExecDistribution={categoryExecDistribution}
            topRunScripts={topRunScripts}
            animTotalScripts={animTotalScripts}
            animRecentRuns={animRecentRuns}
            animFavs={animFavs}
            animTotalExecutions={animTotalExecutions}
            totalScripts={totalScripts}
            totalExecutions={totalExecutions}
            onSelectScript={handleSelectScript}
          />

          {/* ─── MOBILE SIDEBAR ─────────────────────────────────────── */}
          <MobileSidebarSheet
            open={mobileSidebar}
            onOpenChange={setMobileSidebar}
            totalScripts={totalScripts}
            recentRuns={recentRuns}
            sortedCategories={sortedCategories}
          />

          {/* ─── MAIN CONTENT ──────────────────────────────────────── */}
          <main
            className="flex-1 overflow-y-auto relative"
            onDragOver={handleMainDragOver}
            onDragLeave={handleMainDragLeave}
            onDrop={handleMainDrop}
          >
            {/* Drag-and-drop overlay */}
            <AnimatePresence>
              {mainDragOver && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="drag-overlay absolute inset-0 z-50 flex items-center justify-center m-2"
                >
                  <div className="flex flex-col items-center gap-3 text-emerald-600 dark:text-emerald-400 relative z-10">
                    <div className="drag-overlay-icon">
                      <Upload className="size-12 opacity-90" />
                    </div>
                    <motion.p
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-sm font-semibold"
                    >
                      Drop script files here
                    </motion.p>
                    <p className="text-[10px] text-muted-foreground">.py, .sh, .js, .ts, .r, .rb, .pl, .java, .go</p>
                    <div className="flex items-center gap-2 mt-1">
                      {['.py', '.sh', '.js', '.ts', '.go'].map((ext, i) => (
                        <span
                          key={ext}
                          className="drag-overlay-badge inline-flex items-center px-2 py-1 rounded-md text-[10px] font-mono font-medium bg-background/80 border border-emerald-300/50 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-300 shadow-sm"
                          style={{ animationDelay: `${i * 80}ms` }}
                        >
                          {ext}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Page entrance animation wrapper */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
            {/* Action bar with gradient separator */}
            <div className="relative flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-background/50 flex-wrap">
              <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" style={{ backgroundSize: '200% 100%', animation: 'footer-gradient-shift 3s ease-in-out infinite' }} />
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs active:scale-95 transition-transform" onClick={handleImportDemo} disabled={seeding}>
                  {seeding ? <Loader2 className="size-3 animate-spin" /> : <GitBranch className="size-3" />}
                  Import
                </Button>
                <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950/50 active:scale-95 transition-transform" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-3" />
                  New Script
                  <kbd className="pointer-events-none ml-1 hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-50">⌘N</kbd>
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs active:scale-95 transition-transform btn-depth-press" onClick={() => setTemplateOpen(true)}>
                      <CopyPlus className="size-3" />
                      Templates
                      <kbd className="pointer-events-none ml-1 hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-50">⇧⌘T</kbd>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Browse script templates</TooltipContent>
                </Tooltip>
                <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs md:hidden" onClick={() => setUploadOpen(true)}>
                  <Upload className="size-3" />
                  Upload
                </Button>
              </div>
              <Separator orientation="vertical" className="h-5 mx-0.5 hidden sm:block" />
              {store.selectedForBatch.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="flex items-center gap-1.5 flex-wrap"
                >
                  <Badge variant="secondary" className="text-[10px] gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <CheckSquare className="size-2.5" />{store.selectedForBatch.length} script{store.selectedForBatch.length !== 1 ? 's' : ''} selected
                  </Badge>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 active:scale-95 transition-transform batch-bar-glow" onClick={handleBatchRunWithProgress} disabled={batchRunning}>
                        {batchRunning ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
                        Run All
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Run all selected scripts</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs active:scale-95 transition-transform" onClick={handleBatchDeleteRequest}>
                        <Trash2 className="size-3" />
                        Delete
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete selected scripts</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 active:scale-95 transition-transform" onClick={handleBatchExportZip}>
                        <Package className="size-3" />Export ZIP
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download as ZIP</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="xs" className="text-[10px] gap-1 active:scale-95 transition-transform" onClick={handleBatchExport}>
                        <Copy className="size-2.5" />Copy All
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy all to clipboard</TooltipContent>
                  </Tooltip>
                  <Popover open={batchCategoryOpen} onOpenChange={setBatchCategoryOpen}>
                    <PopoverTrigger asChild>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs active:scale-95 transition-transform">
                            <Tag className="size-3" />Category
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Change category</TooltipContent>
                      </Tooltip>
                    </PopoverTrigger>
                    <PopoverContent className="w-44 p-1.5" align="start">
                      <div className="space-y-0.5 max-h-48 overflow-y-auto">
                        {sortedCategories.map(([cat]) => (
                          <button key={cat} className="w-full text-left px-2 py-1.5 text-xs rounded-md hover:bg-muted transition-colors" onClick={() => { handleBatchCategory(cat); setBatchCategoryOpen(false); }}>
                            {cat}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs active:scale-95 transition-transform" onClick={handleBatchFavorite}>
                        <Heart className="size-3 text-rose-500" />Favorite
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add to favorites</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800 active:scale-95 transition-transform" onClick={() => setBatchTagOpen(true)}>
                        <Tag className="size-3" />Tags
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Manage tags on selected scripts</TooltipContent>
                  </Tooltip>
                  {store.selectedForBatch.length === 2 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800 active:scale-95 transition-transform" onClick={() => {
                          const sel = scripts.filter(s => store.selectedForBatch.includes(s.id));
                          if (sel.length === 2) {
                            setDiffScripts([sel[0], sel[1]]);
                            setDiffOpen(true);
                          }
                        }}>
                          <GitCompareArrows className="size-3" />Compare
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Compare selected scripts side-by-side</TooltipContent>
                    </Tooltip>
                  )}
                  <Separator orientation="vertical" className="h-5 mx-0.5" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="xs" className="text-[10px] gap-1 active:scale-95 transition-transform" onClick={handleSelectAll}>
                        <FolderDown className="size-2.5" />Select All
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Select all filtered scripts</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="xs" className="text-[10px] gap-1 active:scale-95 transition-transform" onClick={store.clearBatchSelect}>
                        <X className="size-2.5" />Deselect
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Clear selection</TooltipContent>
                  </Tooltip>
                </motion.div>
              )}
              <div className="flex-1" />
              {allTags.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                      <Tag className="size-3" />
                      {store.selectedTag ? (
                        <span className="max-w-[80px] truncate">{store.selectedTag}</span>
                      ) : (
                        <span>All Tags</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2" align="end">
                    <div className="space-y-1">
                      <button className="w-full text-left px-2 py-1.5 text-xs rounded-md hover:bg-muted transition-colors flex items-center gap-2" onClick={() => store.setSelectedTag(null)}>
                        {(!store.selectedTag ? '•' : '○')} All Tags
                      </button>
                      {allTags.map(tag => (
                        <button key={tag} className="w-full text-left px-2 py-1.5 text-xs rounded-md hover:bg-muted transition-colors flex items-center gap-2" onClick={() => store.setSelectedTag(store.selectedTag === tag ? null : tag)}>
                          {(store.selectedTag === tag ? '•' : '○')} {tag}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              <div className="flex items-center gap-1.5">
                <Select value={store.sortBy} onValueChange={(v) => store.setSortBy(v as 'name' | 'date' | 'language' | 'category' | 'custom' | 'runs' | 'size' | 'recency' | 'health' | 'rating')}>
                  <SelectTrigger className="h-7 w-[130px] text-xs gap-1">
                    <ArrowUpDown className="size-3" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="language">Language</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="runs"><span className="flex items-center gap-1"><TrendingUp className="size-3" />Most Runs</span></SelectItem>
                    <SelectItem value="size"><span className="flex items-center gap-1"><FileText className="size-3" />Size</span></SelectItem>
                    <SelectItem value="recency"><span className="flex items-center gap-1"><Clock3 className="size-3" />Recency</span></SelectItem>
                    <SelectItem value="health"><span className="flex items-center gap-1"><Activity className="size-3" />Health Score</span></SelectItem>
                    <SelectItem value="rating"><span className="flex items-center gap-1"><Star className="size-3" />Rating</span></SelectItem>
                    {store.customOrder.length > 0 && (
                      <SelectItem value="custom">Custom</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-sm" className="active:scale-90 transition-transform" onClick={() => { toast.info('Select scripts to compare using the compare button on script cards'); }}>
                      <GitCompareArrows className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Compare scripts</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-sm" className="active:scale-90 transition-transform" onClick={handleExportAll}>
                      <Copy className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export all to clipboard</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-sm" className="active:scale-90 transition-transform text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" onClick={() => handleBatchExportZip()}>
                      <Package className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export All as ZIP</TooltipContent>
                </Tooltip>
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline ml-1">
                {filtered.length} script{filtered.length !== 1 ? 's' : ''}
                {store.selectedCategory !== 'All' && ` in ${store.selectedCategory}`}
                {store.searchQuery && ` found`}
              </span>
            </div>

            {/* Tag filter chips — inline clickable tags below action bar */}
            {allTags.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center gap-1.5 mt-1.5 mb-0.5 flex-wrap"
              >
                <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider mr-0.5">Tags</span>
                {allTags.slice(0, 8).map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => store.setSelectedTag(store.selectedTag === tag ? null : tag)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-all duration-150 ${
                      store.selectedTag === tag
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 shadow-sm shadow-emerald-500/10'
                        : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:border-border'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
                {allTags.length > 8 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-[10px] px-2 py-0.5 rounded-full border border-dashed text-muted-foreground hover:bg-muted transition-colors">
                        +{allTags.length - 8} more
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2" align="start">
                      <div className="space-y-1">
                        {allTags.slice(8).map(tag => (
                          <button key={tag} className="w-full text-left px-2 py-1.5 text-xs rounded-md hover:bg-muted transition-colors" onClick={() => store.setSelectedTag(store.selectedTag === tag ? null : tag)}>
                            {store.selectedTag === tag ? '•' : '○'} {tag}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
                {store.selectedTag && (
                  <button
                    type="button"
                    onClick={() => store.setSelectedTag(null)}
                    className="text-[9px] text-emerald-600 dark:text-emerald-400 hover:underline ml-1"
                  >
                    Clear
                  </button>
                )}
              </motion.div>
            )}

            {/* Content */}
            {showLoading ? (
              <AnimatePresence mode="wait">
                {showBrandedSpinner ? (
                  <motion.div
                    key="branded-spinner"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center justify-center py-32 text-center"
                  >
                    <div className="relative mb-6 empty-state-float">
                      <div className="size-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                        <Zap className="size-8 text-white" style={{ animation: 'zap-spin 1.5s linear infinite' }} />
                      </div>
                      <div className="absolute -inset-3 rounded-3xl bg-emerald-500/10 animate-ping" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">Loading ScriptHub</h3>
                    <p className="text-xs text-muted-foreground">Preparing your scripts...</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="skeleton-grid"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={store.viewMode === 'grid'
                      ? 'grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'
                      : store.viewMode === 'list'
                      ? 'flex flex-col gap-2 p-4'
                      : 'p-4 h-[calc(100vh-12rem)] min-h-[400px] flex items-center justify-center'
                    }
                  >
                    {Array.from({ length: 6 }).map((_, i) => (
                      <ScriptCardSkeleton key={i} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            ) : apiHealth === 'error' && scripts.length === 0 ? (
              <EmptyState
                icon={
                  <div className="relative">
                    <WifiOff className="size-16 text-muted-foreground/30" />
                    <div className="absolute -bottom-1 -right-1 size-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                }
                title="Server unavailable"
                description="The server might be temporarily unavailable. Scripts will appear when ready."
                showTip={false}
                actions={
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" className="gap-1.5 hover:scale-[1.02] hover:shadow-md transition-all active:scale-95" onClick={() => loadScripts()}>
                      <RefreshCw className="size-3.5" /> Retry Connection
                    </Button>
                  </div>
                }
              />
            ) : filtered.length === 0 && initialLoadDone && scripts.length > 0 ? (
              <NoResultsEmptyState
                searchQuery={store.searchQuery || undefined}
                selectedCategory={store.selectedCategory}
                selectedTag={store.selectedTag}
                totalScripts={scripts.length}
                onClearFilters={handleClearFilters}
              />
            ) : filtered.length === 0 && initialLoadDone ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20 text-center px-4"
              >
                <div className="size-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
                  <Zap className="size-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No scripts found</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-[300px]">
                  {store.searchQuery ? 'Try a different search term or clear the filter' : 'Get started by importing scripts or creating a new one'}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5 hover:scale-[1.02] hover:shadow-md transition-all active:scale-95" onClick={handleImportDemo} disabled={seeding}>
                    {seeding ? <Loader2 className="size-3.5 animate-spin" /> : <GitBranch className="size-3.5" />}Import Scripts
                  </Button>
                  <Button size="sm" className="gap-1.5 bg-emerald-600 text-white hover:scale-[1.02] hover:shadow-md hover:shadow-emerald-500/20 transition-all active:scale-95" onClick={() => setCreateOpen(true)}>
                    <Plus className="size-3.5" />New Script
                  </Button>
                </div>
              </motion.div>
            ) : store.viewMode === 'graph' ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="p-3 sm:p-4 h-[calc(100vh-12rem)] min-h-[400px]"
              >
                <ScriptGraph scripts={scripts} onSelectScript={handleSelectScript} />
              </motion.div>
            ) : (
              <div className={store.viewMode === 'grid'
                ? 'grid grid-cols-1 gap-3 sm:gap-4 p-3 sm:p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 touch-manipulation'
                : 'flex flex-col gap-2 p-3 sm:p-4 touch-manipulation'
              }>
                {mounted ? <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={paginatedFiltered.map(s => s.id)} strategy={store.viewMode === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}>
                      <AnimatePresence mode="popLayout">
                        {paginatedFiltered.map((s, idx) => (
                          <ContextMenu key={s.id}>
                            <ContextMenuTrigger asChild>
                              <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: idx * 0.03, duration: 0.25 }}
                              >
                                <SortableScriptCard
                                  script={s}
                                  focused={focusedIndex === idx}
                                  isSelected={store.selectedScriptId === s.id}
                                  isFavorite={store.favorites.includes(s.id)}
                                  isBatchSelected={store.selectedForBatch.includes(s.id)}
                                  isPinned={store.pinnedScripts.includes(s.id)}
                                  viewMode={store.viewMode}
                                  onSelect={() => handleSelectScript(s)}
                                  onDelete={() => handleRequestDelete(s.id)}
                                  onToggleFavorite={() => store.toggleFavorite(s.id)}
                                  onDuplicate={() => handleDuplicateScript(s)}
                                  onQuickRun={() => handleQuickRun(s)}
                                  onToggleBatch={() => store.toggleBatchSelect(s.id)}
                                  onCompare={() => handleOpenDiff(s)}
                                  onCopyContent={async () => { try { await navigator.clipboard.writeText(s.content); toast.success('Script copied to clipboard'); } catch { toast.error('Failed to copy to clipboard'); } }}
                                  quickRunning={quickRunningId === s.id}
                                  searchQuery={store.searchQuery}
                                  isCustomSort={store.sortBy === 'custom'}
                                  onRenamed={handleScriptRenamed}
                                  healthScore={healthScores.get(s.id) || 0}
                                  lastRunDuration={store.lastRunDurations[s.id] || 0}
                                  lastRunStatus={store.lastRunStatuses[s.id] || null}
                                  recentDurations={executionDurations[s.id] || []}
                                  sparklineLoading={sparklineLoadingIds.has(s.id)}
                                  onRate={handleRateScript}
                                  batchMode={store.batchMode}
                                />
                              </motion.div>
                            </ContextMenuTrigger>
                            <ContextMenuContent className="w-56">
                              <ContextMenuItem onClick={() => handleQuickRun(s)} className="gap-2.5"><Play className="size-3.5 text-emerald-600" />Execute<ContextMenuShortcut>Click</ContextMenuShortcut></ContextMenuItem>
                              <ContextMenuItem onClick={() => handleSelectScript(s)} className="gap-2.5"><ExternalLink className="size-3.5" />Open<ContextMenuShortcut>Enter</ContextMenuShortcut></ContextMenuItem>
                              <ContextMenuItem onClick={() => handleDuplicateScript(s)} className="gap-2.5"><CopyPlus className="size-3.5" />Duplicate<ContextMenuShortcut>⌘D</ContextMenuShortcut></ContextMenuItem>
                              <ContextMenuSeparator />
                              <ContextMenuItem onClick={async () => { try { await navigator.clipboard.writeText(s.name); toast.success('Name copied'); } catch { toast.error('Failed'); } }} className="gap-2.5"><Copy className="size-3.5" />Copy Script Name<ContextMenuShortcut>⌘C</ContextMenuShortcut></ContextMenuItem>
                              <ContextMenuItem onClick={async () => { try { await navigator.clipboard.writeText(s.filename); toast.success('Path copied'); } catch { toast.error('Failed'); } }} className="gap-2.5"><Tag className="size-3.5" />Copy File Path</ContextMenuItem>
                              <ContextMenuItem onClick={() => downloadScript(s)} className="gap-2.5"><Download className="size-3.5" />Download</ContextMenuItem>
                              <ContextMenuItem onClick={async () => { try { await navigator.clipboard.writeText(s.content); toast.success('Copied'); } catch { toast.error('Failed'); } }} className="gap-2.5"><Copy className="size-3.5" />Copy Content</ContextMenuItem>
                              <ContextMenuItem onClick={() => handleOpenDiff(s)} className="gap-2.5"><GitCompareArrows className="size-3.5" />Compare</ContextMenuItem>
                              <ContextMenuItem onClick={() => handleBatchExportZip()} className="gap-2.5"><Package className="size-3.5 text-emerald-600" />Export ZIP</ContextMenuItem>
                              <ContextMenuSeparator />
                              <ContextMenuItem onClick={() => { store.togglePin(s.id); toast.success(store.pinnedScripts.includes(s.id) ? 'Pinned to top' : 'Unpinned'); }} className="gap-2.5"><Pin className={`size-3.5 ${store.pinnedScripts.includes(s.id) ? 'text-emerald-500 fill-current' : ''}`} />{store.pinnedScripts.includes(s.id) ? 'Unpin' : 'Pin to Top'}</ContextMenuItem>
                              <ContextMenuSeparator />
                              <ContextMenuItem onClick={() => store.toggleFavorite(s.id)} className="gap-2.5"><Heart className={`size-3.5 ${store.favorites.includes(s.id) ? 'text-rose-500 fill-current' : ''}`} />{store.favorites.includes(s.id) ? 'Unfavorite' : 'Favorite'}</ContextMenuItem>
                              <ContextMenuItem variant="destructive" onClick={() => handleRequestDelete(s.id)} className="gap-2.5"><Trash2 className="size-3.5" />Delete</ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                        ))}
                      </AnimatePresence>
                    </SortableContext>
                  </DndContext> : null}
                {!mounted && (
                  <AnimatePresence mode="popLayout">
                    {paginatedFiltered.map((s, idx) => (
                      <ContextMenu key={s.id}>
                        <ContextMenuTrigger asChild>
                          <motion.div
                            initial={{ opacity: 1, y: 0 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: idx * 0.03, duration: 0.25 }}
                          >
                            <ScriptCardInner
                              script={s}
                              focused={focusedIndex === idx}
                              isSelected={store.selectedScriptId === s.id}
                              isFavorite={store.favorites.includes(s.id)}
                              isBatchSelected={store.selectedForBatch.includes(s.id)}
                              isPinned={store.pinnedScripts.includes(s.id)}
                              viewMode={store.viewMode}
                              onSelect={() => handleSelectScript(s)}
                              onDelete={() => handleRequestDelete(s.id)}
                              onToggleFavorite={() => store.toggleFavorite(s.id)}
                              onDuplicate={() => handleDuplicateScript(s)}
                              onQuickRun={() => handleQuickRun(s)}
                              onToggleBatch={() => store.toggleBatchSelect(s.id)}
                              onCompare={() => handleOpenDiff(s)}
                              onCopyContent={async () => { try { await navigator.clipboard.writeText(s.content); toast.success('Script copied to clipboard'); } catch { toast.error('Failed to copy to clipboard'); } }}
                              quickRunning={quickRunningId === s.id}
                              searchQuery={store.searchQuery}
                              isCustomSort={store.sortBy === 'custom'}
                              onRenamed={handleScriptRenamed}
                              healthScore={healthScores.get(s.id) || 0}
                              lastRunDuration={store.lastRunDurations[s.id] || 0}
                              lastRunStatus={store.lastRunStatuses[s.id] || null}
                              recentDurations={executionDurations[s.id] || []}
                              sparklineLoading={sparklineLoadingIds.has(s.id)}
                              onRate={handleRateScript}
                              batchMode={store.batchMode}
                            />
                          </motion.div>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-56">
                          <ContextMenuItem onClick={() => handleQuickRun(s)} className="gap-2.5"><Play className="size-3.5 text-emerald-600" />Execute<ContextMenuShortcut>Click</ContextMenuShortcut></ContextMenuItem>
                          <ContextMenuItem onClick={() => handleDuplicateScript(s)} className="gap-2.5"><CopyPlus className="size-3.5" />Duplicate<ContextMenuShortcut>⌘D</ContextMenuShortcut></ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem onClick={async () => { try { await navigator.clipboard.writeText(s.name); toast.success('Name copied'); } catch { toast.error('Failed'); } }} className="gap-2.5"><Copy className="size-3.5" />Copy Script Name<ContextMenuShortcut>⌘C</ContextMenuShortcut></ContextMenuItem>
                          <ContextMenuItem onClick={async () => { try { await navigator.clipboard.writeText(s.filename); toast.success('Path copied'); } catch { toast.error('Failed'); } }} className="gap-2.5"><Tag className="size-3.5" />Copy File Path</ContextMenuItem>
                          <ContextMenuItem onClick={() => downloadScript(s)} className="gap-2.5"><Download className="size-3.5" />Download</ContextMenuItem>
                          <ContextMenuItem onClick={async () => { try { await navigator.clipboard.writeText(s.content); toast.success('Copied'); } catch { toast.error('Failed'); } }} className="gap-2.5"><Copy className="size-3.5" />Copy Content</ContextMenuItem>
                          <ContextMenuItem onClick={() => handleOpenDiff(s)} className="gap-2.5"><GitCompareArrows className="size-3.5" />Compare</ContextMenuItem>
                          <ContextMenuItem onClick={() => handleBatchExportZip()} className="gap-2.5"><Package className="size-3.5 text-emerald-600" />Export ZIP</ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem onClick={() => { store.togglePin(s.id); toast.success(store.pinnedScripts.includes(s.id) ? 'Pinned to top' : 'Unpinned'); }} className="gap-2.5"><Pin className={`size-3.5 ${store.pinnedScripts.includes(s.id) ? 'text-emerald-500 fill-current' : ''}`} />{store.pinnedScripts.includes(s.id) ? 'Unpin' : 'Pin to Top'}</ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem onClick={() => store.toggleFavorite(s.id)} className="gap-2.5"><Heart className={`size-3.5 ${store.favorites.includes(s.id) ? 'text-rose-500 fill-current' : ''}`} />{store.favorites.includes(s.id) ? 'Unfavorite' : 'Favorite'}</ContextMenuItem>
                          <ContextMenuItem variant="destructive" onClick={() => handleRequestDelete(s.id)} className="gap-2.5"><Trash2 className="size-3.5" />Delete</ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            )}
            {/* ─── PAGINATION ──────────────────────────────────── */}
            {filtered.length > store.pageSize && totalPages > 1 && (
              <div className="pagination-enter flex items-center justify-between px-3 sm:px-4 py-3">
                <span className="text-xs text-muted-foreground">
                  Showing {(currentPage - 1) * store.pageSize + 1}–{Math.min(currentPage * store.pageSize, filtered.length)} of {filtered.length} scripts
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline" size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                  >
                    <ChevronLeft className="size-3" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={page === currentPage ? 'default' : 'outline'}
                      size="sm"
                      className={`h-7 w-7 text-xs ${page === currentPage ? 'page-item-active' : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline" size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                  >
                    <ChevronRight className="size-3" />
                  </Button>
                </div>
                <Select value={String(store.pageSize)} onValueChange={(v) => store.setPageSize(Number(v) as 12 | 24 | 48)}>
                  <SelectTrigger className="h-7 w-[70px] text-xs gap-1">
                    <span>{store.pageSize}/page</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12</SelectItem>
                    <SelectItem value="24">24</SelectItem>
                    <SelectItem value="48">48</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            </motion.div>
          </main>

          {/* ─── EXECUTION PANEL (Floating Sheet on all screens) ──────── */}
          {store.selectedScriptId && selectedScript && (
            <Sheet open={mobileExecOpen} onOpenChange={(open) => {
              setMobileExecOpen(open);
              if (!open) store.setSelectedScript(null, null);
            }}>
              <SheetContent side="right" className="w-full sm:w-[570px] sm:max-w-[570px] lg:w-[630px] lg:max-w-[630px] p-0">
                <SheetHeader className="px-4 py-3 border-b">
                  <SheetTitle className="flex items-center gap-2 text-sm">
                    <div className="size-5 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                      <Terminal className="size-3 text-white" />
                    </div>
                    {selectedScript.name}
                  </SheetTitle>
                  <SheetDescription className="sr-only">Script execution panel</SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
                  <ExecPanel script={selectedScript} onClose={() => { store.setSelectedScript(null, null); setMobileExecOpen(false); }} onUpdated={loadScripts} allTags={allTags} />
                </div>
              </SheetContent>
            </Sheet>
          )}

          {/* Feature 10: FAB on mobile */}
          <div className="md:hidden fixed bottom-6 right-6 z-30">
            <Button
              size="icon"
              className="size-14 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 text-white shadow-xl shadow-emerald-600/30 active:scale-95 transition-transform animate-[fab-pulse_2s_ease-in-out_infinite]"
              onClick={() => setCreateOpen(true)}
              aria-label="Create new script"
            >
              <Plus className="size-6" />
            </Button>
          </div>
        </div>

        {/* ─── FOOTER ──────────────────────────────────────────────── */}
        <Footer
          totalScripts={totalScripts}
          categoryCount={Object.keys(categoryMap).length}
          apiHealth={apiHealth}
          footerTime={footerTime}
          totalExecutions={totalExecutions}
          favoritesCount={store.favorites.length}
          notifications={store.notifications}
          totalLines={sessionStats.totalLines}
          mostPopularLang={sessionStats.mostPopularLang}
          sessionStart={sessionStart}
          langBreakdown={Object.fromEntries(langDistribution)}
          onShortcutsOpen={() => setShortcutsOpen(true)}
        />

        {/* ─── HIDDEN FILE INPUT FOR BUNDLE IMPORT ──────────────────── */}
        <input
          ref={bundleInputRef}
          type="file"
          accept=".zip,.json"
          className="hidden"
          onChange={handleBundleFileChange}
          aria-label="Import bundle file"
        />

        {/* ─── DIALOGS ─────────────────────────────────────────────── */}
        {uploadOpen && <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onSaved={loadScripts} />}
        {createOpen && <CreateScriptDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={loadScripts} />}
        {llmOpen && <LLMConfigDialog open={llmOpen} onOpenChange={setLlmOpen} />}
        {appOpen && <ExternalAppDialog open={appOpen} onOpenChange={setAppOpen} />}

        {/* ─── CONFIRM DIALOGS ─────────────────────────────────────── */}
        <ConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          onConfirm={() => deleteConfirmId && handleDeleteScript(deleteConfirmId)}
          title="Delete Script"
          description={`Are you sure you want to delete "${deleteConfirmName}"? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="destructive"
          loading={deleteConfirmLoading}
        />
        <ConfirmDialog
          open={batchDeleteDialogOpen}
          onOpenChange={setBatchDeleteDialogOpen}
          onConfirm={handleBatchDeleteConfirm}
          title="Delete Selected Scripts"
          description={`Are you sure you want to delete ${store.selectedForBatch.length} selected script${store.selectedForBatch.length !== 1 ? 's' : ''}? This action cannot be undone.`}
          confirmLabel="Delete All"
          variant="destructive"
          loading={batchDeleteDialogLoading}
        />

        {/* ─── KEYBOARD SHORTCUTS DIALOG ────────────────────────────── */}
        <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

        {/* ─── COMMAND PALETTE ────────────────────────────────── */}
        <CommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
          scripts={scripts}
          onSelectScript={handleSelectScript}
          onAction={(action) => {
            switch (action) {
              case 'create': setCreateOpen(true); break;
              case 'upload': setUploadOpen(true); break;
              case 'import-demo': handleImportDemo(); break;
              case 'refresh': loadScripts(); break;
              case 'stats': setStatsOpen(true); break;
              case 'shortcuts': setShortcutsOpen(true); break;
              case 'llm': setLlmOpen(true); break;
              case 'apps': setAppOpen(true); break;
            }
          }}
        />

        {/* ─── TEMPLATE GALLERY DIALOG (Cmd+Shift+T) ────────────── */}
        {templateOpen && <TemplateGallery open={templateOpen} onOpenChange={setTemplateOpen} />}

        {/* ─── CONTENT SEARCH DIALOG (Ctrl+Shift+F) ────────────── */}
        <ContentSearchDialog
          open={contentSearchOpen}
          onOpenChange={setContentSearchOpen}
          scripts={scripts}
          onSelectScript={handleSelectScript}
        />

        {/* ─── DIFF VIEW DIALOG ───────────────────────────────────── */}
        <DiffDialog
          open={diffOpen}
          onOpenChange={(open) => { setDiffOpen(open); if (!open) setDiffScripts([null, null]); }}
          diffScripts={diffScripts}
        />

        {/* ─── BATCH RUN QUEUE PROGRESS DIALOG ──────────────── */}
        <Dialog open={queueOpen} onOpenChange={(open) => { setQueueOpen(open); if (!open) queueCancelledRef.current = true; }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Zap className="size-4 text-emerald-500" />Batch Execution Queue</DialogTitle>
              <DialogDescription>Running {queueItems.length} scripts sequentially</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              {/* Progress bar */}
              <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-300 queue-progress-shine"
                  style={{ width: `${queueItems.length > 0 ? (queueItems.filter(q => q.status === 'success' || q.status === 'error').length / queueItems.length) * 100 : 0}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground text-center">
                {queueItems.filter(q => q.status === 'success').length} / {queueItems.length} completed
              </div>
              {/* Script list */}
              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                {queueItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`queue-item-enter flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                      item.status === 'success' ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800' :
                      item.status === 'error' ? 'bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-800' :
                      item.status === 'running' ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800' :
                      'bg-muted/30 border-border'
                    }`}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="shrink-0">
                      {item.status === 'pending' && <div className="size-3 rounded-full bg-gray-300 dark:bg-gray-600" />}
                      {item.status === 'running' && <Loader2 className="size-3 animate-spin text-amber-500" />}
                      {item.status === 'success' && <CheckSquare className="size-3 text-emerald-500" />}
                      {item.status === 'error' && <X className="size-3 text-red-500" />}
                    </div>
                    <span className="flex-1 truncate font-medium">{item.name}</span>
                    {item.duration && (
                      <span className="text-[10px] text-muted-foreground">{item.duration >= 1000 ? `${(item.duration / 1000).toFixed(1)}s` : `${item.duration}ms`}</span>
                    )}
                    {item.message && item.status !== 'running' && (
                      <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{item.message}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button variant="outline" size="sm" onClick={() => { queueCancelledRef.current = true; setQueueOpen(false); }}>
                {queueItems.some(q => q.status === 'pending' || q.status === 'running') ? 'Cancel' : 'Close'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ─── BATCH TAG MANAGEMENT DIALOG ────────────────────────── */}
        <BatchTagDialog
          open={batchTagOpen}
          onOpenChange={setBatchTagOpen}
          selectedScripts={scripts.filter(s => store.selectedForBatch.includes(s.id))}
          allTags={allTags}
          onDone={loadScripts}
        />

        {/* ─── STATS DIALOG ────────────────────────────────────────── */}
        <StatsDialog
          open={statsOpen}
          onOpenChange={setStatsOpen}
          scripts={scripts}
          totalExecutions={totalExecutions}
          notifications={store.notifications}
        />

        {/* ─── BACK TO TOP ─────────────────────────────────────────── */}
        <BackToTopButton />
      </div>
    </ErrorBoundary>
  );
}
