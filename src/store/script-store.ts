import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Script, ExecutionLog, ExternalApp, ScriptTemplate, FilterState, ViewMode } from '@/types';
import { api } from '@/lib/api-client';

interface ScriptStore {
  // Data
  scripts: Script[];
  selectedScript: Script | null;
  executionLogs: ExecutionLog[];
  externalApps: ExternalApp[];
  templates: ScriptTemplate[];

  // UI State
  filters: FilterState;
  sidebarOpen: boolean;
  detailPanelOpen: boolean;
  generatorOpen: boolean;
  isLoading: boolean;
  isExecuting: boolean;
  executionOutput: string;
  executionError: string;
  lastResultFiles: Array<{ name: string; path: string; size: number }>;
  error: string | null;

  // Actions
  loadScripts: () => Promise<void>;
  retryLoad: () => Promise<void>;
  loadExternalApps: () => Promise<void>;
  loadTemplates: (appType?: string) => Promise<void>;
  selectScript: (script: Script | null) => void;
  createScript: (data: Partial<Script>) => Promise<Script>;
  updateScript: (id: string, data: Partial<Script>) => Promise<Script>;
  deleteScript: (id: string) => Promise<void>;
  executeScript: (
    id: string,
    params?: Record<string, unknown>,
    inputFiles?: Record<string, string>
  ) => Promise<{ output: string; error: string; resultFiles: Array<{ name: string; path: string; size: number }> }>;
  loadExecutions: (scriptId?: string) => Promise<void>;
  deleteExecution: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  togglePinned: (id: string) => Promise<void>;
  setRating: (id: string, rating: number) => Promise<void>;
  setFilters: (filters: Partial<FilterState>) => void;
  setSidebarOpen: (open: boolean) => void;
  setDetailPanelOpen: (open: boolean) => void;
  setGeneratorOpen: (open: boolean) => void;
  addExternalApp: (data: Partial<ExternalApp>) => Promise<ExternalApp>;
  removeExternalApp: (id: string) => Promise<void>;
  checkAppConnection: (id: string) => Promise<void>;
  seedDatabase: () => Promise<void>;
  clearError: () => void;

  // Computed
  filteredScripts: () => Script[];
  categories: () => { name: string; count: number }[];
}

const defaultFilters: FilterState = {
  category: 'All',
  search: '',
  tags: [],
  sortBy: 'updatedAt',
  sortOrder: 'desc',
  viewMode: 'grid',
  language: '',
};

export const useScriptStore = create<ScriptStore>()(
  persist(
    (set, get) => ({
      scripts: [],
      selectedScript: null,
      executionLogs: [],
      externalApps: [],
      templates: [],
      filters: defaultFilters,
      sidebarOpen: true,
      detailPanelOpen: false,
      generatorOpen: false,
      isLoading: false,
      isExecuting: false,
      executionOutput: '',
      executionError: '',
      lastResultFiles: [],
      error: null,

      loadScripts: async () => {
        set({ isLoading: true, error: null });
        try {
          const scripts = await api.getScripts(get().filters);
          set({ scripts, isLoading: false, error: null });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to load scripts';
          console.error('Failed to load scripts:', error);
          set({ isLoading: false, error: message });
        }
      },

      retryLoad: async () => {
        await get().loadScripts();
      },

      clearError: () => {
        set({ error: null });
      },

      loadExternalApps: async () => {
        try {
          const apps = await api.getExternalApps();
          set({ externalApps: apps });
        } catch (error) {
          console.error('Failed to load external apps:', error);
        }
      },

      loadTemplates: async (appType?: string) => {
        try {
          const templates = await api.getTemplates(appType);
          set({ templates });
        } catch (error) {
          console.error('Failed to load templates:', error);
        }
      },

      selectScript: (script) => {
        set({
          selectedScript: script,
          detailPanelOpen: !!script,
          // Isolate execution output per script: clear stale output when switching scripts
          executionOutput: '',
          executionError: '',
          isExecuting: false,
        });
      },

      createScript: async (data) => {
        const script = await api.createScript(data);
        set((state) => ({ scripts: [...state.scripts, script] }));
        return script;
      },

      updateScript: async (id, data) => {
        const script = await api.updateScript(id, data);
        set((state) => ({
          scripts: state.scripts.map((s) => (s.id === id ? { ...s, ...script } : s)),
          selectedScript: state.selectedScript?.id === id ? { ...state.selectedScript, ...script } : state.selectedScript,
        }));
        return script;
      },

      deleteScript: async (id) => {
        await api.deleteScript(id);
        set((state) => ({
          scripts: state.scripts.filter((s) => s.id !== id),
          selectedScript: state.selectedScript?.id === id ? null : state.selectedScript,
          detailPanelOpen: state.selectedScript?.id === id ? false : state.detailPanelOpen,
        }));
      },

      executeScript: async (id, params, inputFiles) => {
        set({ isExecuting: true, executionOutput: '', executionError: '' });
        try {
          const log = await api.executeScript(id, params, inputFiles);
          set((state) => ({
            isExecuting: false,
            executionOutput: log.output,
            executionError: log.error,
            lastResultFiles: log.resultFiles || [],
            scripts: state.scripts.map((s) =>
              s.id === id ? { ...s, runCount: s.runCount + 1 } : s
            ),
          }));
          return log;
        } catch (error) {
          set({ isExecuting: false, executionError: String(error) });
          throw error;
        }
      },

      loadExecutions: async (scriptId) => {
        try {
          const logs = await api.getExecutions(scriptId);
          set({ executionLogs: logs });
        } catch (error) {
          console.error('Failed to load executions:', error);
        }
      },

      deleteExecution: async (id) => {
        try {
          // Optimistic: remove from local state immediately
          set((state) => ({
            executionLogs: state.executionLogs.filter((e) => e.id !== id),
          }));
          await api.deleteExecution(id);
        } catch (error) {
          console.error('Failed to delete execution:', error);
          throw error;
        }
      },

      toggleFavorite: async (id) => {
        const script = get().scripts.find((s) => s.id === id);
        if (!script) return;
        await api.updateScript(id, { isFavorite: !script.isFavorite });
        set((state) => ({
          scripts: state.scripts.map((s) =>
            s.id === id ? { ...s, isFavorite: !s.isFavorite } : s
          ),
          selectedScript: state.selectedScript?.id === id
            ? { ...state.selectedScript, isFavorite: !state.selectedScript.isFavorite }
            : state.selectedScript,
        }));
      },

      togglePinned: async (id) => {
        const script = get().scripts.find((s) => s.id === id);
        if (!script) return;
        await api.updateScript(id, { isPinned: !script.isPinned });
        set((state) => ({
          scripts: state.scripts.map((s) =>
            s.id === id ? { ...s, isPinned: !s.isPinned } : s
          ),
          selectedScript: state.selectedScript?.id === id
            ? { ...state.selectedScript, isPinned: !state.selectedScript.isPinned }
            : state.selectedScript,
        }));
      },

      setRating: async (id, rating) => {
        await api.updateScript(id, { rating });
        set((state) => ({
          scripts: state.scripts.map((s) =>
            s.id === id ? { ...s, rating } : s
          ),
          selectedScript: state.selectedScript?.id === id
            ? { ...state.selectedScript, rating }
            : state.selectedScript,
        }));
      },

      setFilters: (filters) => {
        set((state) => ({ filters: { ...state.filters, ...filters } }));
      },

      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setDetailPanelOpen: (open) => set({ detailPanelOpen: open }),
      setGeneratorOpen: (open) => set({ generatorOpen: open }),

      addExternalApp: async (data) => {
        const app = await api.createExternalApp(data);
        set((state) => ({ externalApps: [...state.externalApps, app] }));
        return app;
      },

      removeExternalApp: async (id) => {
        await api.deleteExternalApp(id);
        set((state) => ({ externalApps: state.externalApps.filter((a) => a.id !== id) }));
      },

      checkAppConnection: async (id) => {
        try {
          const result = await api.checkAppConnection(id);
          set((state) => ({
            externalApps: state.externalApps.map((a) =>
              a.id === id ? { ...a, status: result.status as ExternalApp['status'] } : a
            ),
          }));
        } catch {
          set((state) => ({
            externalApps: state.externalApps.map((a) =>
              a.id === id ? { ...a, status: 'error' as const } : a
            ),
          }));
        }
      },

      seedDatabase: async () => {
        await api.seedDatabase();
        await get().loadScripts();
      },

      filteredScripts: () => {
        const { scripts, filters } = get();
        let result = [...scripts];

        if (filters.category && filters.category !== 'All') {
          result = result.filter((s) => s.category === filters.category);
        }
        if (filters.search) {
          const search = filters.search.toLowerCase();
          result = result.filter(
            (s) =>
              s.name.toLowerCase().includes(search) ||
              s.description.toLowerCase().includes(search) ||
              s.code.toLowerCase().includes(search)
          );
        }
        if (filters.language) {
          result = result.filter((s) => s.language === filters.language);
        }
        if (filters.tags.length > 0) {
          result = result.filter((s) =>
            filters.tags.every((tag) => s.tags.includes(tag))
          );
        }

        // Sort
        const { sortBy, sortOrder } = filters;
        result.sort((a, b) => {
          let comparison = 0;
          switch (sortBy) {
            case 'name':
              comparison = a.name.localeCompare(b.name);
              break;
            case 'createdAt':
              comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
              break;
            case 'updatedAt':
              comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
              break;
            case 'runCount':
              comparison = a.runCount - b.runCount;
              break;
            case 'rating':
              comparison = a.rating - b.rating;
              break;
          }
          return sortOrder === 'desc' ? -comparison : comparison;
        });

        // Pinned first
        result.sort((a, b) => (a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1));

        return result;
      },

      categories: () => {
        const { scripts } = get();
        const catMap = new Map<string, number>();
        scripts.forEach((s) => {
          catMap.set(s.category, (catMap.get(s.category) || 0) + 1);
        });
        return Array.from(catMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);
      },
    }),
    {
      name: 'scripthub-store',
      partialize: (state) => ({
        filters: state.filters,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
