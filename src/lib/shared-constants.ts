// ─── Category Background Colors ────────────────────────────────────
// Used for category badges across the app

// ─── Application Version ──────────────────────────────────────────
// Single source of truth for the version string (used in Header, Footer, SSR)
export const APP_VERSION = 'v5.1.0';

export const catBgColors: Record<string, string> = {
  Uncategorized: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  Automation: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Data: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  Utility: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  Security: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Network: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  System: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Web: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  Visualization: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Structural Biology': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Runner: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400',
  Test: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  'Antibody Analysis': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  'PDB Processing': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Image Processing': 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400',
  ChimeraX: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Cryo-EM': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  PyMOL: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'AI / Media': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Web / Search': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  'Academic / Research': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  'Document Processing': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Presentation': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'OOXML Processing': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  'Career / Job': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  'Content / Creative': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  'Quiz / Education': 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400',
  'Data / Spreadsheet': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  'Finance': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Web / Shader': 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400',
  'Lifestyle / Fun': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Creative / Writing': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Developer Tools': 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
  'Design / UI': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
};

// ─── Category Dot Colors ───────────────────────────────────────────
// Used for small colored dots next to category names in sidebar and cards

export const catDotColors: Record<string, string> = {
  Uncategorized: 'bg-gray-400',
  Automation: 'bg-amber-500', Data: 'bg-cyan-500',
  Utility: 'bg-violet-500', Security: 'bg-red-500',
  Network: 'bg-sky-500', System: 'bg-orange-500',
  Web: 'bg-teal-500', Visualization: 'bg-purple-500',
  'Structural Biology': 'bg-emerald-500', Runner: 'bg-lime-500', Test: 'bg-rose-500',
  'Antibody Analysis': 'bg-pink-500', 'PDB Processing': 'bg-emerald-500',
  'Image Processing': 'bg-fuchsia-500', ChimeraX: 'bg-orange-500',
  'Cryo-EM': 'bg-cyan-500', PyMOL: 'bg-amber-500',
  'AI / Media': 'bg-blue-500', 'Web / Search': 'bg-teal-500',
  'Academic / Research': 'bg-indigo-500', 'Document Processing': 'bg-emerald-500',
  'Presentation': 'bg-orange-500', 'OOXML Processing': 'bg-rose-500',
  'Career / Job': 'bg-violet-500', 'Content / Creative': 'bg-pink-500',
  'Quiz / Education': 'bg-lime-500', 'Data / Spreadsheet': 'bg-cyan-500',
  'Finance': 'bg-green-500', 'Web / Shader': 'bg-fuchsia-500',
  'Lifestyle / Fun': 'bg-yellow-500', 'Creative / Writing': 'bg-purple-500',
  'Developer Tools': 'bg-slate-500', 'Design / UI': 'bg-sky-500',
};

// ─── Language Gradient Colors ───────────────────────────────────────
// Subtle gradient backgrounds for script cards based on language

export const langGradientColors: Record<string, string> = {
  python: 'from-emerald-500/5 to-emerald-600/10 dark:from-emerald-500/10 dark:to-emerald-600/5',
  bash: 'from-amber-500/5 to-amber-600/10 dark:from-amber-500/10 dark:to-amber-600/5',
  shell: 'from-amber-500/5 to-amber-600/10 dark:from-amber-500/10 dark:to-amber-600/5',
  javascript: 'from-yellow-500/5 to-yellow-600/10 dark:from-yellow-500/10 dark:to-yellow-600/5',
  typescript: 'from-blue-500/5 to-blue-600/10 dark:from-blue-500/10 dark:to-blue-600/5',
  r: 'from-indigo-500/5 to-indigo-600/10 dark:from-indigo-500/10 dark:to-indigo-600/5',
  perl: 'from-rose-500/5 to-rose-600/10 dark:from-rose-500/10 dark:to-rose-600/5',
  ruby: 'from-red-500/5 to-red-600/10 dark:from-red-500/10 dark:to-red-600/5',
};

// ─── Language Accent Colors ────────────────────────────────────────
// Solid accent colors for language-specific accent bars

export const langAccentColors: Record<string, string> = {
  python: 'bg-emerald-500',
  bash: 'bg-amber-500',
  shell: 'bg-amber-500',
  sh: 'bg-amber-500',
  javascript: 'bg-yellow-500',
  js: 'bg-yellow-500',
  node: 'bg-yellow-500',
  typescript: 'bg-blue-500',
  ts: 'bg-blue-500',
  r: 'bg-indigo-500',
  perl: 'bg-rose-500',
  ruby: 'bg-red-500',
  chimerax: 'bg-orange-500',
  pymol: 'bg-amber-600',
};

// ─── Language Icon Gradients ───────────────────────────────────────
// Gradient colors for script card icon backgrounds

export const langIconGradients: Record<string, string> = {
  python: 'from-emerald-400 to-emerald-600',
  bash: 'from-amber-400 to-amber-600',
  shell: 'from-amber-400 to-amber-600',
  sh: 'from-amber-400 to-amber-600',
  javascript: 'from-yellow-400 to-yellow-600',
  js: 'from-yellow-400 to-yellow-600',
  node: 'from-yellow-400 to-yellow-600',
  typescript: 'from-blue-400 to-blue-600',
  ts: 'from-blue-400 to-blue-600',
  r: 'from-indigo-400 to-indigo-600',
  chimerax: 'from-orange-400 to-orange-600',
  pymol: 'from-amber-400 to-amber-600',
};

// ─── Source Badge Styles ───────────────────────────────────────────
// Styles for script source badges (Demo, Manual, GitHub, Upload)

export const sourceBadgeStyles: Record<string, string> = {
  demo: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  manual: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  github: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  upload: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  import: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

export const sourceLabels: Record<string, string> = {
  demo: 'Demo',
  manual: 'Manual',
  github: 'GitHub',
  upload: 'Upload',
  import: 'Import',
};

// ─── Category Bar Colors (for sparkline charts) ───────────────────────

export const catBarColors: Record<string, string> = {
  Uncategorized: 'bg-gray-400',
  Automation: 'bg-amber-500',
  Data: 'bg-cyan-500',
  Utility: 'bg-violet-500',
  Security: 'bg-red-500',
  Network: 'bg-sky-500',
  System: 'bg-orange-500',
  Web: 'bg-teal-500',
  Visualization: 'bg-purple-500',
  'Structural Biology': 'bg-emerald-500',
  Runner: 'bg-lime-500',
  Test: 'bg-rose-500',
  'Antibody Analysis': 'bg-pink-500',
  'PDB Processing': 'bg-emerald-500',
  'Image Processing': 'bg-fuchsia-500',
  ChimeraX: 'bg-orange-500',
  'Cryo-EM': 'bg-cyan-500',
  PyMOL: 'bg-amber-500',
  'AI / Media': 'bg-blue-500',
  'Web / Search': 'bg-teal-500',
  'Academic / Research': 'bg-indigo-500',
  'Document Processing': 'bg-emerald-500',
  'Presentation': 'bg-orange-500',
  'OOXML Processing': 'bg-rose-500',
  'Career / Job': 'bg-violet-500',
  'Content / Creative': 'bg-pink-500',
  'Quiz / Education': 'bg-lime-500',
  'Data / Spreadsheet': 'bg-cyan-500',
  'Finance': 'bg-green-500',
  'Web / Shader': 'bg-fuchsia-500',
  'Lifestyle / Fun': 'bg-yellow-500',
  'Creative / Writing': 'bg-purple-500',
  'Developer Tools': 'bg-slate-500',
  'Design / UI': 'bg-sky-500',
};

// ─── Available Script Categories

export const SCRIPT_CATEGORIES = [
  'Uncategorized', 'Automation', 'Data', 'Utility', 'Security',
  'Network', 'System', 'Web', 'Visualization', 'Structural Biology', 'Runner', 'Test',
] as const;

export type ScriptCategory = (typeof SCRIPT_CATEGORIES)[number];
