import { create } from 'zustand';
import type { SelectedScriptData } from '@/types';

// ─── Unique ID Generator ──────────────────────────────────────
let _notifCounter = 0;
function uniqueNotifId(): string {
  return `${Date.now()}-${++_notifCounter}`;
}

// ─── localStorage Persistence Helpers ──────────────────────────────

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(`scripthub-${key}`);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`scripthub-${key}`, JSON.stringify(value));
  } catch {
    // localStorage might be full or unavailable
  }
}

// ─── Notification Store Interface ───────────────────────────────────

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  timestamp: number;
}

export type AccentTheme = 'emerald' | 'blue' | 'violet' | 'rose' | 'amber' | 'cyan';

export const ACCENT_COLORS: Record<AccentTheme, { primary: string; light: string; dark: string; bg: string; ring: string; gradient: string }> = {
  emerald: { primary: '#10b981', light: '#34d399', dark: '#059669', bg: 'rgba(16,185,129,0.1)', ring: 'rgba(16,185,129,0.3)', gradient: 'from-emerald-400 to-emerald-600' },
  blue:    { primary: '#3b82f6', light: '#60a5fa', dark: '#2563eb', bg: 'rgba(59,130,246,0.1)', ring: 'rgba(59,130,246,0.3)', gradient: 'from-blue-400 to-blue-600' },
  violet:  { primary: '#8b5cf6', light: '#a78bfa', dark: '#7c3aed', bg: 'rgba(139,92,246,0.1)', ring: 'rgba(139,92,246,0.3)', gradient: 'from-violet-400 to-violet-600' },
  rose:    { primary: '#f43f5e', light: '#fb7185', dark: '#e11d48', bg: 'rgba(244,63,94,0.1)', ring: 'rgba(244,63,94,0.3)', gradient: 'from-rose-400 to-rose-600' },
  amber:   { primary: '#f59e0b', light: '#fbbf24', dark: '#d97706', bg: 'rgba(245,158,11,0.1)', ring: 'rgba(245,158,11,0.3)', gradient: 'from-amber-400 to-amber-600' },
  cyan:    { primary: '#06b6d4', light: '#22d3ee', dark: '#0891b2', bg: 'rgba(6,182,212,0.1)', ring: 'rgba(6,182,212,0.3)', gradient: 'from-cyan-400 to-cyan-600' },
};

// ─── Store Interface ──────────────────────────────────────────────

interface ScriptStore {
  selectedScriptId: string | null;
  selectedScript: SelectedScriptData | null;
  searchQuery: string;
  selectedCategory: string;
  viewMode: 'grid' | 'list' | 'graph';
  sidebarOpen: boolean;
  sidebarWidth: number;
  favorites: string[];
  recentScripts: string[];
  sortBy: 'name' | 'date' | 'language' | 'category' | 'custom' | 'runs' | 'size' | 'recency' | 'health' | 'rating';
  selectedForBatch: string[];
  batchMode: boolean;
  pageSize: 12 | 24 | 48;
  selectedTag: string | null;
  selectedSource: string | null;
  selectedLanguages: string[];
  pinnedScripts: string[];
  customOrder: string[];
  notifications: Notification[];
  recentExecutions: Array<{ id: string; name: string; status: string; timestamp: number }>;
  lastRunDurations: Record<string, number>;
  lastRunStatuses: Record<string, 'success' | 'error' | 'running'>;
  accentTheme: AccentTheme;
  searchMode: 'name' | 'content' | 'all';
  setSelectedScript: (id: string | null, script?: SelectedScriptData | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  setViewMode: (mode: 'grid' | 'list' | 'graph') => void;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  toggleFavorite: (id: string) => void;
  addRecent: (id: string) => void;
  setSortBy: (sortBy: 'name' | 'date' | 'language' | 'category' | 'custom' | 'runs' | 'size' | 'recency' | 'health' | 'rating') => void;
  setPageSize: (pageSize: 12 | 24 | 48) => void;
  toggleBatchSelect: (id: string) => void;
  clearBatchSelect: () => void;
  setBatchMode: (mode: boolean) => void;
  setSelectedTag: (tag: string | null) => void;
  setSelectedSource: (source: string | null) => void;
  setSelectedLanguages: (languages: string[]) => void;
  toggleLanguageFilter: (language: string) => void;
  clearAllFilters: () => void;
  togglePin: (id: string) => void;
  isPinned: (id: string) => boolean;
  setCustomOrder: (order: string[]) => void;
  pruneCustomOrder: (validIds: string[]) => void;
  addNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearNotifications: () => void;
  addRecentExecution: (execution: { id: string; name: string; status: string; timestamp?: number }) => void;
  setLastRunDuration: (id: string, duration: number) => void;
  setLastRunStatus: (id: string, status: 'success' | 'error' | 'running') => void;
  setAccentTheme: (theme: AccentTheme) => void;
  setSearchMode: (mode: 'name' | 'content' | 'all') => void;
}

// ─── Store ────────────────────────────────────────────────────────

export const useScriptStore = create<ScriptStore>((set) => ({
  selectedScriptId: null,
  selectedScript: null,
  searchQuery: '',
  selectedCategory: 'All',
  viewMode: loadFromStorage<'grid' | 'list' | 'graph'>('viewMode', 'grid'),
  sidebarOpen: loadFromStorage<boolean>('sidebarOpen', true),
  sidebarWidth: loadFromStorage<number>('sidebarWidth', 260),
  favorites: loadFromStorage<string[]>('favorites', []),
  recentScripts: loadFromStorage<string[]>('recent', []),
  sortBy: loadFromStorage<'name' | 'date' | 'language' | 'category' | 'custom' | 'runs' | 'size' | 'recency' | 'health' | 'rating'>('sortBy', 'name'),
  selectedForBatch: [],
  batchMode: false,
  pageSize: loadFromStorage<12 | 24 | 48>('pageSize', 12),
  selectedTag: loadFromStorage<string | null>('selectedTag', null),
  selectedSource: loadFromStorage<string | null>('selectedSource', null),
  selectedLanguages: loadFromStorage<string[]>('selectedLanguages', []),
  pinnedScripts: loadFromStorage<string[]>('pinned', []),
  customOrder: loadFromStorage<string[]>('customOrder', []),
  notifications: loadFromStorage<Notification[]>('notifications', []),
  recentExecutions: loadFromStorage<Array<{ id: string; name: string; status: string; timestamp: number }>>('recentExecutions', []),
  lastRunDurations: loadFromStorage<Record<string, number>>('lastRunDurations', {}),
  lastRunStatuses: loadFromStorage<Record<string, 'success' | 'error' | 'running'>>('lastRunStatuses', {}),
  accentTheme: loadFromStorage<AccentTheme>('accentTheme', 'emerald'),
  searchMode: loadFromStorage<'name' | 'content' | 'all'>('searchMode', 'all'),
  setSelectedScript: (id, script) => set({ selectedScriptId: id, selectedScript: script ?? null }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setViewMode: (mode) => { set({ viewMode: mode }); saveToStorage('viewMode', mode); },
  toggleSidebar: () => set((state) => { const next = !state.sidebarOpen; saveToStorage('sidebarOpen', next); return { sidebarOpen: next }; }),
  setSidebarWidth: (width) => { const clamped = Math.max(200, Math.min(480, width)); set({ sidebarWidth: clamped }); saveToStorage('sidebarWidth', clamped); },
  toggleFavorite: (id) =>
    set((state) => {
      const next = state.favorites.includes(id)
        ? state.favorites.filter((fid) => fid !== id)
        : [...state.favorites, id];
      saveToStorage('favorites', next);
      return { favorites: next };
    }),
  addRecent: (id) =>
    set((state) => {
      const filtered = state.recentScripts.filter((rid) => rid !== id);
      const next = [id, ...filtered].slice(0, 5);
      saveToStorage('recent', next);
      return { recentScripts: next };
    }),
  setSortBy: (sortBy) => { set({ sortBy }); saveToStorage('sortBy', sortBy); },
  setPageSize: (pageSize) => { set({ pageSize }); saveToStorage('pageSize', pageSize); },
  setSelectedTag: (selectedTag) => { set({ selectedTag }); saveToStorage('selectedTag', selectedTag); },
  setSelectedSource: (selectedSource) => { set({ selectedSource }); saveToStorage('selectedSource', selectedSource); },
  setSelectedLanguages: (selectedLanguages) => { set({ selectedLanguages }); saveToStorage('selectedLanguages', selectedLanguages); },
  toggleLanguageFilter: (language) => set((state) => {
    const next = state.selectedLanguages.includes(language)
      ? state.selectedLanguages.filter(l => l !== language)
      : [...state.selectedLanguages, language];
    saveToStorage('selectedLanguages', next);
    return { selectedLanguages: next };
  }),
  clearAllFilters: () => {
    set({ searchQuery: '', selectedCategory: 'All', selectedTag: null, selectedSource: null, selectedLanguages: [] });
    saveToStorage('selectedTag', null);
    saveToStorage('selectedSource', null);
    saveToStorage('selectedLanguages', []);
  },
  togglePin: (id) =>
    set((state) => {
      const next = state.pinnedScripts.includes(id)
        ? state.pinnedScripts.filter((sid) => sid !== id)
        : [...state.pinnedScripts, id];
      saveToStorage('pinned', next);
      return { pinnedScripts: next };
    }),
  isPinned: (id: string): boolean => useScriptStore.getState().pinnedScripts.includes(id),
  setCustomOrder: (customOrder) => {
    set({ customOrder, sortBy: 'custom' });
    saveToStorage('customOrder', customOrder);
  },
  pruneCustomOrder: (validIds: string[]) => {
    const current = useScriptStore.getState().customOrder;
    const pruned = current.filter((id: string) => validIds.includes(id));
    set({ customOrder: pruned });
    saveToStorage('customOrder', pruned);
  },
  toggleBatchSelect: (id) =>
    set((state) => ({
      selectedForBatch: state.selectedForBatch.includes(id)
        ? state.selectedForBatch.filter((sid) => sid !== id)
        : [...state.selectedForBatch, id],
    })),
  clearBatchSelect: () => set({ selectedForBatch: [] }),
  setBatchMode: (mode) => { set({ batchMode: mode }); if (!mode) set({ selectedForBatch: [] }); },
  addNotification: (message, type = 'info') =>
    set((state) => {
      const next: Notification[] = [
        { id: uniqueNotifId(), message, type, timestamp: Date.now() },
        ...state.notifications,
      ].slice(0, 50);
      saveToStorage('notifications', next);
      return { notifications: next };
    }),
  clearNotifications: () => {
    set({ notifications: [] });
    saveToStorage('notifications', []);
  },
  addRecentExecution: (execution) =>
    set((state) => {
      const enriched = { ...execution, timestamp: execution.timestamp ?? Date.now() } as { id: string; name: string; status: string; timestamp: number };
      const next = [enriched, ...state.recentExecutions].slice(0, 5);
      saveToStorage('recentExecutions', next);
      return { recentExecutions: next };
    }),
  setLastRunDuration: (id, duration) =>
    set((state) => {
      const next = { ...state.lastRunDurations, [id]: duration };
      saveToStorage('lastRunDurations', next);
      return { lastRunDurations: next };
    }),
  setLastRunStatus: (id, status) =>
    set((state) => {
      const next = { ...state.lastRunStatuses, [id]: status };
      saveToStorage('lastRunStatuses', next);
      return { lastRunStatuses: next };
    }),
  setAccentTheme: (theme) => { set({ accentTheme: theme }); saveToStorage('accentTheme', theme); },
  setSearchMode: (mode) => { set({ searchMode: mode }); saveToStorage('searchMode', mode); },
}));
