/**
 * Shared type definitions for ScriptHub.
 *
 * Single source of truth for all data interfaces used across components.
 * Eliminates duplication from ExecPanel.tsx, script-store.ts, demo-data.ts, etc.
 */

// ─── Script Data ────────────────────────────────────────────────────

export interface ScriptData {
  id: string;
  name: string;
  description: string;
  filename: string;
  content: string;
  category: string;
  language: string;
  source: string;
  sourceUrl: string | null;
  params: string;
  inputFiles: string;
  outputFiles: string;
  tags?: string | null;
  rating?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { executions: number };
  externalApps?: Array<{
    id: string;
    appId: string;
    app: {
      id: string;
      name: string;
      appType: string;
      icon: string;
      scriptExt: string;
      runCommand: string;
    };
  }>;
}

// Alias for backward compatibility with demo-data.ts
export type DemoScript = ScriptData;

// Alias for Zustand store's selectedScript field
export type SelectedScriptData = ScriptData;

// ─── Script Parameter ──────────────────────────────────────────────

export interface ScriptParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'file';
  description: string;
  required: boolean;
  default?: string;
}

// ─── Execution Record ──────────────────────────────────────────────

export interface ExecutionRecord {
  id: string;
  status: string;
  duration: number;
  output: string;
  error: string;
  exitCode: number | null;
  createdAt: string;
}

// ─── External App ────────────────────────────────────────────────────

export interface ExternalAppData {
  id: string;
  name: string;
  description: string;
  appPath: string;
  appType: string;
  icon: string;
  scriptExt: string;
  runCommand: string;
  createdAt: string;
  updatedAt: string;
  _count?: { scripts: number };
}

// ─── LLM Config ────────────────────────────────────────────────────

export interface LLMConfigData {
  id: string;
  name: string;
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  createdAt: string;
  updatedAt: string;
}

// ─── API Response ───────────────────────────────────────────────────

export interface APIResponse<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}
