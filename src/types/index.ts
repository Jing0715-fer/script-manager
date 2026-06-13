export interface Script {
  id: string;
  name: string;
  description: string;
  code: string;
  language: string;
  category: string;
  tags: string[];
  params: ScriptParam[];
  inputFiles?: string;   // JSON array of {name, description, required, format}
  outputFiles?: string;  // JSON array of {name, description, format}
  dependencies?: string; // JSON array of dependency names
  source: string;
  sourceUrl?: string;
  version: number;
  isFavorite: boolean;
  isPinned: boolean;
  rating: number;
  runCount: number;
  createdAt: string;
  updatedAt: string;
  executions?: ExecutionLog[];
  apps?: ScriptExternalApp[];
}

export interface ScriptParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'file' | 'path';
  label: string;
  description?: string;
  default?: string | number | boolean;
  required?: boolean;
  options?: { label: string; value: string }[];
  placeholder?: string;
}

export interface ExecutionLog {
  id: string;
  scriptId: string;
  params: Record<string, unknown>;
  output: string;
  error: string;
  exitCode: number | null;
  duration: number;
  status: 'pending' | 'running' | 'success' | 'error' | 'timeout';
  createdAt: string;
}

export interface ScriptVersion {
  id: string;
  scriptId: string;
  version: number;
  code: string;
  message: string;
  createdAt: string;
}

export interface ExternalApp {
  id: string;
  name: string;
  type: 'chimerax' | 'pymol';
  host: string;
  port: number;
  status: 'connected' | 'disconnected' | 'error';
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ScriptExternalApp {
  id: string;
  scriptId: string;
  appId: string;
  launcherCmd: string;
  createdAt: string;
  app?: ExternalApp;
}

export interface ScriptTemplate {
  id: string;
  name: string;
  description: string;
  appType: 'chimerax' | 'pymol';
  category: string;
  code: string;
  params: ScriptParam[];
  icon: string;
  isBuiltin: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ViewMode = 'grid' | 'list';
export type SortBy = 'name' | 'createdAt' | 'updatedAt' | 'runCount' | 'rating';
export type SortOrder = 'asc' | 'desc';

export interface FilterState {
  category: string;
  search: string;
  tags: string[];
  sortBy: SortBy;
  sortOrder: SortOrder;
  viewMode: ViewMode;
  language: string;
}

export const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'ChimeraX': { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-300 dark:border-teal-700' },
  'PyMOL': { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-700' },
  'Structural Biology': { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-700' },
  'Antibody Analysis': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-700' },
  'PDB Processing': { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-300 dark:border-cyan-700' },
  'Cryo-EM': { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-300 dark:border-indigo-700' },
  'Visualization': { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-300 dark:border-rose-700' },
  'Image Processing': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700' },
  'AI/ML': { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-300 dark:border-violet-700' },
  'Data Processing': { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-300 dark:border-sky-700' },
  'General': { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-700' },
  'Uncategorized': { bg: 'bg-slate-100 dark:bg-slate-900/30', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-700' },
};

export const APP_TYPE_INFO: Record<string, { name: string; icon: string; color: string; defaultPort: number }> = {
  'chimerax': { name: 'ChimeraX', icon: 'Atom', color: 'teal', defaultPort: 54321 },
  'pymol': { name: 'PyMOL', icon: 'FlaskConical', color: 'orange', defaultPort: 9123 },
};
