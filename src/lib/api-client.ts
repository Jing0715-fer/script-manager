/**
 * Shared API client for ScriptHub.
 *
 * Wrapper around fetch() with consistent error handling and JSON parsing.
 * Use these functions instead of raw fetch() in page.tsx and other components.
 */

import type { APIResponse } from '@/types';

const BASE_URL = '';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export { ApiError };

async function handleResponse<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    try {
      const json = JSON.parse(text);
      throw new ApiError(json.error || json.message || `Request failed (${r.status})`, r.status);
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError(`Request failed (${r.status}: ${text.slice(0, 100)})`, r.status);
    }
  }
  return r.json();
}

export async function apiGet<T = any>(url: string): Promise<T> {
  const r = await fetch(`${BASE_URL}${url}`);
  return handleResponse<T>(r);
}

export async function apiPost<T = any>(url: string, body?: unknown): Promise<T> {
  const r = await fetch(`${BASE_URL}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(r);
}

export async function apiPut<T = any>(url: string, body?: unknown): Promise<T> {
  const r = await fetch(`${BASE_URL}${url}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(r);
}

export async function apiDelete<T = any>(url: string): Promise<T> {
  const r = await fetch(`${BASE_URL}${url}`, { method: 'DELETE' });
  return handleResponse<T>(r);
}

/**
 * Simple fetch that returns response without JSON parsing (for pre-hydration, etc.)
 */
export async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE_URL}${url}`, init);
}
