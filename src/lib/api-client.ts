import type { Script, ExecutionLog, ExternalApp, ScriptTemplate, FilterState } from '@/types';

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// Scripts
export const api = {
  // Scripts
  getScripts: async (filters?: Partial<FilterState>) => {
    const params = new URLSearchParams();
    if (filters?.category && filters.category !== 'All') params.set('category', filters.category);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.sortBy) params.set('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.set('sortOrder', filters.sortOrder);
    if (filters?.language) params.set('language', filters.language);
    // API returns { scripts: Script[] } envelope — unwrap it so callers get a plain array.
    const data = await request<Script[] | { scripts: Script[] }>(`/scripts?${params.toString()}`);
    return Array.isArray(data) ? data : (data?.scripts ?? []);
  },

  getScript: (id: string) => request<Script>(`/scripts/${id}`),

  createScript: (data: Partial<Script>) => request<Script>('/scripts', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updateScript: (id: string, data: Partial<Script>) => request<Script>(`/scripts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  deleteScript: (id: string) => request<{ success: boolean }>(`/scripts/${id}`, {
    method: 'DELETE',
  }),

  // Execution
  executeScript: (id: string, params?: Record<string, unknown>, inputFiles?: Record<string, string>) => request<ExecutionLog>('/execute', {
    method: 'POST',
    body: JSON.stringify({ id, params: params || {}, inputFiles: inputFiles || {} }),
  }),

  getExecutions: (scriptId?: string) => {
    const params = new URLSearchParams();
    if (scriptId) params.set('scriptId', scriptId);
    return request<ExecutionLog[]>(`/executions?${params.toString()}`);
  },

  // External Apps
  getExternalApps: async () => {
    // API returns { apps: ExternalApp[] } envelope — unwrap to plain array
    const data = await request<ExternalApp[] | { apps: ExternalApp[] }>('/external-apps');
    return Array.isArray(data) ? data : (data?.apps ?? []);
  },

  createExternalApp: (data: Partial<ExternalApp>) => request<ExternalApp>('/external-apps', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updateExternalApp: (id: string, data: Partial<ExternalApp>) => request<ExternalApp>(`/external-apps/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  deleteExternalApp: (id: string) => request<{ success: boolean }>(`/external-apps/${id}`, {
    method: 'DELETE',
  }),

  checkAppConnection: (id: string) => request<{ status: string; message: string }>(`/external-apps/${id}/check`, {
    method: 'POST',
  }),

  // Templates
  getTemplates: (appType?: string) => {
    const params = new URLSearchParams();
    if (appType) params.set('appType', appType);
    return request<ScriptTemplate[]>(`/templates?${params.toString()}`);
  },

  // Generate script from template
  generateScript: (templateId: string, params: Record<string, unknown>, appId?: string) => request<{ script: string; filename: string }>('/generate-script', {
    method: 'POST',
    body: JSON.stringify({ templateId, params, appId }),
  }),

  // Seed
  seedDatabase: () => request<{ count: number }>('/seed', { method: 'POST' }),

  // AI Generate script
  aiGenerate: (description: string, appType: 'chimerax' | 'pymol', category?: string) => request<{
    script: string;
    filename: string;
    suggestedName: string;
    suggestedDescription: string;
    appType: string;
    language: string;
  }>('/ai-generate', {
    method: 'POST',
    body: JSON.stringify({ description, appType, category }),
  }),

  // File upload
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE}/files`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json() as Promise<{ path: string; name: string }>;
  },
};
