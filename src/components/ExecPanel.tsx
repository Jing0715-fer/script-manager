// @ts-nocheck
'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  Terminal, Play, Loader2, RefreshCw,
  Copy, Check, Download, X, Heart, Clock,
  Sliders, Paperclip,
  History, Pencil, Save, RotateCcw, PanelRightClose, Plus,
  StickyNote, ExternalLink, Timer, Pin, PinOff,
  ChevronDown, ChevronUp, FileArchive, AlertTriangle, Star,
  HardDrive, FileText, Hash, Type, Calendar, Tag, GitBranch,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from '@/lib/framer-motion-shim';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useScriptStore } from '@/store/script-store';
import { formatDistanceToNow } from 'date-fns';
import { catBgColors, sourceBadgeStyles, sourceLabels } from '@/lib/shared-constants';
import type { ScriptData } from '@/types';
import { LanguageIcon } from '@/components/LanguageIcon';

// Tab components
import { CodeTab } from '@/components/tabs/CodeTab';
import { ParamsTab } from '@/components/tabs/ParamsTab';
import { FilesTab } from '@/components/tabs/FilesTab';
import { AppsTab } from '@/components/tabs/AppsTab';
import { HistoryTab } from '@/components/tabs/HistoryTab';
import { VersionsTab } from '@/components/tabs/VersionsTab';
import { NotesTab } from '@/components/tabs/NotesTab';
import { ScheduleTab } from '@/components/tabs/ScheduleTab';
import { formatTimer, parseAnsiToSpans, loadNotes, saveNotes } from '@/components/tabs/shared';
const TemplateGallery = dynamic(() => import('@/components/TemplateGallery').then(m => ({ default: m.TemplateGallery })), { ssr: false });

// ─── Exec Panel Header ───────────────────────────────────────────

export function ExecPanelHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b bg-gradient-to-r from-muted/30 via-background/50 to-muted/30 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <div className="size-6 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-500/20">
          <Terminal className="size-3.5 text-white" />
        </div>
        <div>
          <span className="text-xs font-semibold">Script Details</span>
          <p className="text-[9px] text-muted-foreground leading-tight">View, edit & execute</p>
        </div>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-xs" onClick={onClose} className="active:scale-90 transition-transform" aria-label="Close execution panel"><PanelRightClose className="size-4" /></Button>
        </TooltipTrigger>
        <TooltipContent>Close panel</TooltipContent>
      </Tooltip>
    </div>
  );
}

// ─── Language extension map ─────────────────────────────────────

const LANG_EXT: Record<string, string> = {
  python: 'py', bash: 'sh', shell: 'sh', sh: 'sh', javascript: 'js',
  typescript: 'ts', ruby: 'rb', perl: 'pl', r: 'R', java: 'java', go: 'go',
};

// ─── Execution Panel Component ───────────────────────────────────

export function ExecPanel({ script, onClose, onUpdated, allTags = [] }: { script: ScriptData; onClose: () => void; onUpdated?: () => void; allTags?: string[] }) {
  const store = useScriptStore();
  const [params, setParams] = useState<Record<string, string>>({});
  const [inputFiles, setInputFiles] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ status: string; output?: string; error?: string; duration?: number; exitCode?: number; timestamp?: string } | null>(null);
  const [executing, setExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState('code');
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [outputCopied, setOutputCopied] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<Array<{
    id: string; status: string; duration: number; output: string; error: string; timestamp: string; exitCode: number | null;
  }>>([]);
  const [dragOver, setDragOver] = useState(false);
  const [scriptContent, setScriptContent] = useState(script.content || '');
  const execStartTimeRef = useRef<number | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Execution timeout selector (default 60s)
  const [execTimeout, setExecTimeout] = useState<number>(60);
  // Description editing
  const [descEditing, setDescEditing] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [descSaving, setDescSaving] = useState(false);

  // Execution timer
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Notes
  const [notes, setNotes] = useState(() => loadNotes(script.id));

  // Template gallery (for CodeTab inline template selection)
  const [templateGalleryOpen, setTemplateGalleryOpen] = useState(false);
  const hasNotes = notes.length > 0;

  // Fullscreen output
  const [fullscreenOutput, setFullscreenOutput] = useState(false);

  // Raw output toggle
  const [rawOutput, setRawOutput] = useState(false);

  // Pinned state
  const [pinned, setPinned] = useState(() => {
    try { return localStorage.getItem(`scripthub-pinned-${script.id}`) === 'true'; } catch { return false; }
  });



  // Scroll shadow state
  const [codeShadow, setCodeShadow] = useState<'none' | 'top' | 'bottom' | 'both'>('none');

  // Reset state when script changes
  useEffect(() => {
    setResult(null);
    setParams({});
    setInputFiles({});
    setActiveTab('code');
    setEditing(false);
    setEditContent('');
    setDescEditing(false);
    setEditDescription('');
    setElapsedTime(0);
    setNotes(loadNotes(script.id));
    setRawOutput(false);
    setScriptContent(script.content || '');
    setCopied(false);
    setOutputCopied(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // Fetch full content if content is empty (due to excludeContent=true optimization)
    if (!script.content && script.id) {
      fetch(`/api/scripts/${script.id}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.script?.content) {
            setScriptContent(data.script.content);
            // Also update the store so the parent knows about the content
            const store = useScriptStore.getState();
            if (store.selectedScriptId === script.id) {
              store.setSelectedScript(script.id, { ...script, content: data.script.content });
            }
          }
        })
        .catch(() => { /* best-effort */ });
    }
  }, [script.id]);

  // Timer cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Fetch execution history
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const r = await fetch(`/api/scripts/${script.id}/executions`);
      if (r.ok) {
        const data = await r.json();
        const execs = (data.executions || []).map((e: any) => ({
          id: e.id, status: e.status, duration: e.duration,
          output: (e.output || '').slice(0, 100), error: (e.error || '').slice(0, 100),
          exitCode: e.exitCode,
          timestamp: new Date(e.createdAt).toLocaleString(),
        }));
        setExecutionHistory(execs);
      }
    } catch { /* silently fail */ }
    setHistoryLoading(false);
  }, [script.id]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleExecClick = () => {
    if (executing) return;
    exec();
  };

  const exec = async () => {
    setExecuting(true);
    setElapsedTime(0);
    execStartTimeRef.current = Date.now();
    setActiveTab('code');

    timerRef.current = setInterval(() => {
      if (execStartTimeRef.current) {
        setElapsedTime(Date.now() - execStartTimeRef.current);
      }
    }, 100);

    try {
      const r = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: script.id, params, inputFiles, timeout: execTimeout * 1000 }),
      });
      if (!r.ok) throw new Error('Execution failed');
      const data = await r.json();
      const endTime = Date.now();
      const clientDuration = execStartTimeRef.current ? endTime - execStartTimeRef.current : 0;
      const displayDuration = data.duration || clientDuration;

      setResult({ ...data, duration: displayDuration, timestamp: new Date().toISOString() });
      setExecutionHistory(prev => [{
        id: Date.now().toString(), status: data.status, duration: displayDuration,
        output: data.output?.slice(0, 100) || '', error: data.error?.slice(0, 100) || '',
        exitCode: data.exitCode ?? null, timestamp: new Date().toLocaleString(),
      }, ...prev].slice(0, 20));

      if (data.status === 'success') {
        toast.success('Execution completed', { description: `Duration: ${displayDuration >= 1000 ? `${(displayDuration / 1000).toFixed(2)}s` : `${displayDuration}ms`}` });
      } else {
        toast.error('Execution failed', { description: data.error?.slice(0, 80) || 'Unknown error' });
      }
    } catch (e: any) {
      const clientDuration = execStartTimeRef.current ? Date.now() - execStartTimeRef.current : 0;
      setResult({ status: 'error', error: e.message, output: '', duration: clientDuration, exitCode: 1, timestamp: new Date().toISOString() });
      setExecutionHistory(prev => [{
        id: Date.now().toString(), status: 'error', duration: clientDuration,
        output: '', error: e.message?.slice(0, 100) || '', exitCode: 1,
        timestamp: new Date().toLocaleString(),
      }, ...prev].slice(0, 20));
      toast.error('Execution failed', { description: e.message?.slice(0, 80) || 'Network error' });
    }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setExecuting(false);
    execStartTimeRef.current = null;
  };

  const copyCode = async () => {
    if (script?.content) {
      try {
        await navigator.clipboard.writeText(script.content);
        setCopied(true);
        toast.success('Code copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      } catch { toast.error('Failed to copy to clipboard'); }
    }
  };

  const downloadScript = (ext?: string) => {
    if (!script?.content) return;
    const language = script.language?.toLowerCase() || 'txt';
    const fileExt = ext || LANG_EXT[language] || language;
    const filename = script.filename || `${script.name}.${fileExt}`;
    const blob = new Blob([script.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Script downloaded', { description: filename });
  };

  const downloadBundle = () => {
    if (!script?.content) return;
    const language = script.language?.toLowerCase() || 'txt';
    const fileExt = LANG_EXT[language] || language;

    // Create a JSON wrapper with script content + metadata
    const bundle = JSON.stringify({
      _format: 'scripthub-script-bundle',
      _version: '1.0',
      metadata: {
        name: script.name,
        description: script.description,
        category: script.category,
        language: script.language,
        filename: script.filename || `${script.name}.${fileExt}`,
        source: script.source,
        tags: script.tags,
        params: script.params,
        inputFiles: script.inputFiles,
        outputFiles: script.outputFiles,
        exportedAt: new Date().toISOString(),
      },
      content: script.content,
    }, null, 2);

    const blob = new Blob([bundle], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${script.name.replace(/\s+/g, '-')}.script.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Script bundle downloaded');
  };

  const startEditing = () => { setEditContent(script.content || ''); setEditing(true); };
  const cancelEditing = () => { setEditing(false); setEditContent(''); };

  const saveEditing = async () => {
    setSaving(true);
    try {
      const r = await fetch(`/api/scripts/${script.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      });
      if (!r.ok) throw new Error('Save failed');
      // Auto-create version snapshot after save
      fetch(`/api/scripts/${script.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent, message: 'Saved via editor' }),
      }).catch(() => { /* version creation is best-effort */ });
      toast.success('Script saved successfully');
      setScriptContent(editContent);
      setEditing(false);
      setEditContent('');
      onUpdated?.();
    } catch { toast.error('Failed to save script'); }
    setSaving(false);
  };

  const startDescEditing = () => { setEditDescription(script.description || ''); setDescEditing(true); };

  const saveDescEditing = async () => {
    setDescSaving(true);
    try {
      const r = await fetch(`/api/scripts/${script.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: editDescription }),
      });
      if (!r.ok) throw new Error('Save failed');
      toast.success('Description updated');
      setDescEditing(false);
      onUpdated?.();
    } catch { toast.error('Failed to save description'); }
    setDescSaving(false);
  };

  const cancelDescEditing = () => { setDescEditing(false); setEditDescription(''); };

  const handleNotesBlur = () => { saveNotes(script.id, notes); };

  const formatHistoryTime = (timestamp: string) => {
    try { return formatDistanceToNow(new Date(timestamp), { addSuffix: true }); }
    catch { return timestamp; }
  };

  const copyOutput = async () => {
    if (result?.output) {
      try {
        await navigator.clipboard.writeText(result.output);
        setOutputCopied(true);
        toast.success('Output copied to clipboard');
        setTimeout(() => setOutputCopied(false), 2000);
      } catch { toast.error('Failed to copy to clipboard'); }
    }
  };

  const handleScrollShadow = useCallback((
    el: HTMLDivElement | null,
    setShadow: (s: 'none' | 'top' | 'bottom' | 'both') => void
  ) => {
    if (!el) return;
    const atTop = el.scrollTop <= 4;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
    if (atTop && atBottom) setShadow('none');
    else if (atTop) setShadow('bottom');
    else if (atBottom) setShadow('top');
    else setShadow('both');
  }, []);

  const clearHistory = useCallback(() => {
    setExecutionHistory([]);
    toast.success('Execution history cleared');
  }, []);

  const togglePin = () => {
    const next = !pinned;
    setPinned(next);
    try { localStorage.setItem(`scripthub-pinned-${script.id}`, String(next)); } catch { /* ignore */ }
    toast.success(next ? 'Panel pinned' : 'Panel unpinned');
  };

  // Parsed data
  const pp = (() => { try { return JSON.parse(script.params || '[]'); } catch { return []; } })();
  const ifi = (() => { try { return JSON.parse(script.inputFiles || '[]'); } catch { return []; } })();
  const ofi = (() => { try { return JSON.parse(script.outputFiles || '[]'); } catch { return []; } })();
  const apps = script.externalApps || [];
  const lineCount = script.content?.split('\n').length || 0;
  const scriptTags = (() => { try { return JSON.parse(script.tags || '[]'); } catch { return []; } })();
  const lineNumWidth = Math.max(String(lineCount).length, 3);
  const language = script.language?.toLowerCase() || 'txt';

  // Tab order for indicator bar
  const tabOrder: Record<string, number> = { code: 0, params: 1, files: 2, apps: 3, history: 4, versions: 5, schedule: 6, notes: 7 };

  // Tags management
  const [tagInput, setTagInput] = useState('');
  const [localTags, setLocalTags] = useState<string[]>(scriptTags);
  const [tagSuggestionsOpen, setTagSuggestionsOpen] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const tagSuggestionsRef = useRef<HTMLDivElement>(null);
  const [metadataExpanded, setMetadataExpanded] = useState(false);

  // Tag autocomplete: filter suggestions based on input
  const tagSuggestions = useMemo(() => {
    if (!tagInput.trim()) return [];
    const q = tagInput.trim().toLowerCase();
    return allTags.filter(t =>
      t.toLowerCase().includes(q) && !localTags.includes(t)
    ).slice(0, 6);
  }, [tagInput, allTags, localTags]);

  // Close tag suggestions on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tagSuggestionsRef.current && !tagSuggestionsRef.current.contains(e.target as Node)) {
        setTagSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Star rating
  const [hoverRating, setHoverRating] = useState(0);
  const currentRating = script.rating || 0;
  const displayRating = hoverRating || currentRating;

  const handleSetRating = async (value: number) => {
    if (value === currentRating) return;
    try {
      const r = await fetch(`/api/scripts/${script.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: value }),
      });
      if (r.ok) {
        toast.success(`Rating set to ${value}/5`);
        onUpdated?.();
      }
    } catch { toast.error('Failed to save rating'); }
  };

  useEffect(() => {
    try { setLocalTags(JSON.parse(script.tags || '[]')); } catch { setLocalTags([]); }
    setTagInput('');
  }, [script.id, script.tags]);

  const addTag = (tagValue?: string) => {
    const t = (tagValue || tagInput).trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    if (t && !localTags.includes(t)) {
      const next = [...localTags, t];
      setLocalTags(next);
      fetch(`/api/scripts/${script.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: JSON.stringify(next) }),
      }).then(() => { onUpdated?.(); toast.success(`Tag "${t}" added`); }).catch(() => toast.error('Failed to save tag'));
    }
    setTagInput('');
    setTagSuggestionsOpen(false);
  };

  const removeTag = (tag: string) => {
    const next = localTags.filter(t => t !== tag);
    setLocalTags(next);
    fetch(`/api/scripts/${script.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: JSON.stringify(next) }),
    }).then(() => { onUpdated?.(); toast.success(`Tag "${tag}" removed`); }).catch(() => toast.error('Failed to remove tag'));
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 relative exec-panel-glow rounded-lg">
      {/* Indeterminate progress bar when executing */}
      {executing && (
        <div className="absolute top-0 left-0 right-0 z-20 h-0.5 overflow-hidden rounded-t-lg">
          <div className="h-full w-1/2 bg-emerald-500 animate-[progress_2s_ease-in-out_infinite]" />
        </div>
      )}
      {/* Task 5: Animated gradient border at top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-600 z-10 rounded-t-lg" style={{
        backgroundSize: '200% 100%',
        animation: 'execPanelGradient 3s linear infinite',
      }} />

      {/* Script info card */}
      <div className="p-2 sm:p-4 border-b shrink-0">
        <div className="flex items-center gap-2 mb-1.5">
          <div className={`size-6 sm:size-7 rounded-lg bg-gradient-to-br ${
            language.includes('python') ? 'from-emerald-400 to-emerald-600'
            : language.includes('bash') || language.includes('shell') ? 'from-amber-400 to-amber-600'
            : 'from-gray-400 to-gray-600'
          } flex items-center justify-center shrink-0`}>
            <LanguageIcon language={script.language} className="text-sm" onGradient />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs sm:text-sm font-semibold truncate">{script.name}</h3>
              {/* Task 5: Category badge next to name */}
              <Badge variant="secondary" className={`text-[9px] shrink-0 ${catBgColors[script.category] || catBgColors.Uncategorized}`}>
                {script.category}
              </Badge>
            </div>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">{script.filename}</p>
          </div>
          {/* Task 5: Pin button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-xs"
                variant="ghost"
                className={pinned ? 'text-emerald-600 dark:text-emerald-400' : ''}
                onClick={togglePin}
              >
                {pinned ? <Pin className="size-3.5 fill-current" /> : <PinOff className="size-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{pinned ? 'Unpin panel' : 'Pin panel'}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-xs"
                variant="ghost"
                className={store.favorites.includes(script.id) ? 'text-rose-500' : ''}
                onClick={() => store.toggleFavorite(script.id)}
              >
                <Heart className={`size-3.5 ${store.favorites.includes(script.id) ? 'fill-current' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{store.favorites.includes(script.id) ? 'Unfavorite' : 'Favorite'}</TooltipContent>
          </Tooltip>
        </div>

        {/* Description with inline edit */}
        <div className="mt-1">
          {descEditing ? (
            <div className="space-y-1.5">
              <Textarea
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                className="min-h-[60px] text-xs"
                autoFocus
                placeholder="Add a description..."
              />
              <div className="flex gap-1.5 justify-end">
                <Button size="icon-xs" variant="ghost" onClick={cancelDescEditing}>
                  <RotateCcw className="size-3" />
                </Button>
                <Button size="icon-xs" variant="ghost" onClick={saveDescEditing} disabled={descSaving}>
                  {descSaving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3 text-emerald-600" />}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-1 group/desc">
              <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{script.description || 'No description'}</p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    className="opacity-0 group-hover/desc:opacity-100 transition-opacity shrink-0"
                    onClick={startDescEditing}
                  >
                    <Pencil className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit description</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mt-2">
          <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            {script.language}
          </Badge>
          {pp.length > 0 && <Badge variant="outline" className="text-[10px]">{pp.length} params</Badge>}
          <Badge variant="secondary" className={`text-[10px] ${sourceBadgeStyles[script.source] || sourceBadgeStyles.manual}`}>
            {sourceLabels[script.source] || script.source}
          </Badge>
          {/* Star Rating */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-0.5 ml-1 cursor-pointer">
                {[1, 2, 3, 4, 5].map(star => (
                  <motion.button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => handleSetRating(star)}
                    whileHover={{ scale: 1.25 }}
                    whileTap={{ scale: 0.85 }}
                    className="p-0 transition-colors"
                  >
                    <Star
                      className={`size-3.5 transition-all duration-150 ${
                        star <= displayRating
                          ? 'text-amber-400 fill-amber-400 star-rating-glow'
                          : 'text-muted-foreground/30'
                      }`}
                    />
                  </motion.button>
                ))}
                <span className="text-[10px] text-muted-foreground ml-1 font-mono">
                  {currentRating > 0 ? `${currentRating.toFixed(1)} / 5` : 'Click to rate'}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>{currentRating > 0 ? `Current rating: ${currentRating}/5 — click to change` : 'Click a star to rate this script'}</TooltipContent>
          </Tooltip>
          {localTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {localTags.map(tag => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[9px] gap-0.5 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-all border border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 via-background to-emerald-50 dark:from-emerald-950/30 dark:via-emerald-950/10 dark:to-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                  onClick={() => removeTag(tag)}
                >
                  {tag} <X className="size-2" />
                </Badge>
              ))}
            </div>
          )}
          <div className="flex gap-1 mt-2 relative" ref={tagSuggestionsRef}>
            <Input
              ref={tagInputRef}
              placeholder="Add tag..."
              value={tagInput}
              onChange={e => {
                setTagInput(e.target.value);
                setTagSuggestionsOpen(e.target.value.trim().length > 0 && allTags.length > 0);
              }}
              onFocus={() => { if (tagInput.trim() && allTags.length > 0) setTagSuggestionsOpen(true); }}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); addTag(); }
                if (e.key === 'Escape') { setTagSuggestionsOpen(false); }
              }}
              className="h-7 text-[11px]"
            />
            <Button size="icon-xs" variant="ghost" onClick={() => addTag()} className="shrink-0">
              <Plus className="size-3" />
            </Button>
            {/* Tag autocomplete dropdown */}
            {tagSuggestionsOpen && tagSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-8 mt-1 rounded-lg border bg-popover shadow-lg z-50 overflow-hidden">
                {tagSuggestions.map(tag => (
                  <button
                    key={tag}
                    className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors flex items-center gap-1.5"
                    onMouseDown={e => { e.preventDefault(); addTag(tag); }}
                  >
                    <Tag className="size-2.5 text-emerald-500" />
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Metadata section (collapsible) */}
        <div className="mt-2 border-t pt-2">
          <button
            type="button"
            className="w-full flex items-center justify-between text-[10px] text-muted-foreground hover:text-foreground transition-colors py-1"
            onClick={() => setMetadataExpanded(v => !v)}
          >
            <span className="flex items-center gap-1 font-medium">
              <FileText className="size-3" /> Metadata
            </span>
            {metadataExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </button>
          <motion.div
            initial={false}
            animate={{ height: metadataExpanded ? 'auto' : 0, opacity: metadataExpanded ? 1 : 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pb-2 pt-1.5">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <HardDrive className="size-2.5 shrink-0" />
                <span>{(script.content?.length || 0) < 1024 ? `${script.content?.length || 0} B` : `${((script.content?.length || 0) / 1024).toFixed(1)} KB`}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Hash className="size-2.5 shrink-0" />
                <span>{lineCount} lines</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Type className="size-2.5 shrink-0" />
                <span>{(script.content || '').split(/\s+/).filter(Boolean).length} words</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <FileText className="size-2.5 shrink-0" />
                <span>{script.content?.length || 0} chars</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Calendar className="size-2.5 shrink-0" />
                <span>{formatDistanceToNow(new Date(script.createdAt), { addSuffix: true })}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Timer className="size-2.5 shrink-0" />
                <span>{formatDistanceToNow(new Date(script.updatedAt), { addSuffix: true })}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="px-2 sm:px-4 pt-2">
          <TabsList className="w-full h-8 overflow-x-auto scrollbar-none">
            <TabsTrigger value="code" className="text-[10px] sm:text-[11px] gap-0.5 sm:gap-1 flex-1 min-w-[52px] sm:min-w-0 hover:bg-muted/50 transition-colors duration-150"><Terminal className="size-3" /><span className="hidden sm:inline">Code</span></TabsTrigger>
            <TabsTrigger value="params" className="text-[10px] sm:text-[11px] gap-0.5 sm:gap-1 flex-1 min-w-[52px] sm:min-w-0 hover:bg-muted/50 transition-colors duration-150"><Sliders className="size-3" /><span className="hidden sm:inline">Params</span></TabsTrigger>
            <TabsTrigger value="files" className="text-[10px] sm:text-[11px] gap-0.5 sm:gap-1 flex-1 min-w-[52px] sm:min-w-0 hover:bg-muted/50 transition-colors duration-150"><Paperclip className="size-3" /><span className="hidden sm:inline">Files</span></TabsTrigger>
            <TabsTrigger value="apps" className="text-[10px] sm:text-[11px] gap-0.5 sm:gap-1 flex-1 min-w-[52px] sm:min-w-0 hover:bg-muted/50 transition-colors duration-150"><ExternalLink className="size-3" /><span className="hidden sm:inline">Apps</span></TabsTrigger>
            <TabsTrigger value="history" className="text-[10px] sm:text-[11px] gap-0.5 sm:gap-1 flex-1 min-w-[52px] sm:min-w-0 hover:bg-muted/50 transition-colors duration-150"><History className="size-3" /><span className="hidden sm:inline">History</span></TabsTrigger>
            <TabsTrigger value="versions" className="text-[10px] sm:text-[11px] gap-0.5 sm:gap-1 flex-1 min-w-[52px] sm:min-w-0 hover:bg-muted/50 transition-colors duration-150"><GitBranch className="size-3" /><span className="hidden sm:inline">Versions</span></TabsTrigger>
            {/* Schedule tab */}
            <TabsTrigger value="schedule" aria-label="Schedule" className="text-[10px] sm:text-[11px] gap-0.5 sm:gap-1 flex-1 min-w-[52px] sm:min-w-0 hover:bg-muted/50 transition-colors duration-150">
              <Clock className="size-3" />
              <span className="hidden sm:inline">Schedule</span>
            </TabsTrigger>
            {/* Notes tab with badge indicator */}
            <TabsTrigger value="notes" className="text-[10px] sm:text-[11px] gap-0.5 sm:gap-1 flex-1 min-w-[52px] sm:min-w-0 relative hover:bg-muted/50 transition-colors duration-150">
              <StickyNote className="size-3" /><span className="hidden sm:inline">Notes</span>
              {hasNotes && (
                <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-500" />
              )}
            </TabsTrigger>
          </TabsList>
          {/* Animated tab indicator bar */}
          <div className="relative h-[2px] mt-0">
            <motion.div
              className="absolute h-full bg-emerald-500 rounded-full"
              initial={false}
              animate={{ width: '12.5%', left: `${tabOrder[activeTab] !== undefined ? tabOrder[activeTab] * 12.5 : 0}%` }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            />
          </div>
        </div>

        <TabsContent value="code">
          <motion.div key="code" initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }}>
          <CodeTab
            script={script}
            result={result}
            executing={executing}
            elapsedTime={elapsedTime}
            editing={editing}
            editContent={editContent}
            saving={saving}
            copied={copied}
            outputCopied={outputCopied}
            codeShadow={codeShadow}
            rawOutput={rawOutput}
            lineCount={lineCount}
            lineNumWidth={lineNumWidth}
            onEditContentChange={setEditContent}
            onStartEditing={startEditing}
            onCancelEditing={cancelEditing}
            onSaveEditing={saveEditing}
            onDownloadScript={() => downloadScript()}
            onCopyCode={copyCode}
            onCopyOutput={copyOutput}
            onToggleRawOutput={() => setRawOutput(v => !v)}
            onFullscreenOutput={() => setFullscreenOutput(true)}
            onSetContent={(newContent) => {
              setScriptContent(newContent);
            }}
            onOpenTemplateGallery={() => setTemplateGalleryOpen(true)}
          />
          </motion.div>
        </TabsContent>

        <TabsContent value="params">
          <motion.div key="params" initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }}>
          <ParamsTab
            params={params}
            onParamsChange={setParams}
            parsedParams={pp}
            scriptId={script.id}
          />
          </motion.div>
        </TabsContent>

        <TabsContent value="files">
          <motion.div key="files" initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }}>
          <FilesTab
            inputFiles={inputFiles}
            onInputFilesChange={setInputFiles}
            parsedInputFiles={ifi}
            parsedOutputFiles={ofi}
            dragOver={dragOver}
            onDragOverChange={setDragOver}
            language={script.language}
            scriptContent={script.content || ''}
          />
          </motion.div>
        </TabsContent>

        <TabsContent value="apps">
          <motion.div key="apps" initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }}>
          <AppsTab
            apps={apps}
            scriptId={script.id}
            params={params}
            inputFiles={inputFiles}
          />
          </motion.div>
        </TabsContent>

        <TabsContent value="history">
          <motion.div key="history" initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }}>
          <HistoryTab
            executionHistory={executionHistory}
            historyLoading={historyLoading}
            formatHistoryTime={formatHistoryTime}
            onFetchHistory={fetchHistory}
            onClearHistory={clearHistory}
          />
          </motion.div>
        </TabsContent>

        <TabsContent value="versions">
          <motion.div key="versions" initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }}>
          <VersionsTab
            scriptId={script.id}
            currentContent={scriptContent}
          />
          </motion.div>
        </TabsContent>

        <TabsContent value="schedule">
          <motion.div key="schedule" initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }}>
          <ScheduleTab
            scriptId={script.id}
            scriptName={script.name}
          />
          </motion.div>
        </TabsContent>

        <TabsContent value="notes">
          <motion.div key="notes" initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }}>
          <NotesTab
            scriptId={script.id}
            notes={notes}
            onNotesChange={setNotes}
            onNotesBlur={handleNotesBlur}
          />
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Execute button bar */}
      <div className="p-2 sm:p-4 border-t bg-gradient-to-r from-muted/20 via-background/50 to-muted/20 space-y-2 shrink-0">
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            className={`w-full sm:flex-1 gap-1.5 shadow-md active:scale-[0.98] transition-all ${
              executing
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/30 animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
            }`}
            size="sm"
            onClick={handleExecClick}
            disabled={executing}
          >
            {executing
              ? <><Loader2 className="size-4 animate-spin" />{formatTimer(elapsedTime)}</>
              : <><Play className="size-4" />Execute</>
            }
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => { setParams({}); setInputFiles({}); setResult(null); }} className="active:scale-90 transition-transform">
                <RefreshCw className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset all inputs</TooltipContent>
          </Tooltip>

          {/* Task 3: Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="active:scale-90 transition-transform gap-1">
                <Download className="size-4" />
                <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs">Export Script</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs gap-2 cursor-pointer" onClick={() => downloadScript()}>
                <Download className="size-3.5" />
                Download as {`.${LANG_EXT[language] || language}`}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2 cursor-pointer" onClick={() => copyCode()}>
                {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                {copied ? 'Copied!' : 'Copy to clipboard'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs gap-2 cursor-pointer" onClick={downloadBundle}>
                <FileArchive className="size-3.5" />
                Download Bundle (.json)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* Timeout selector row */}
        <div className="flex items-center gap-2">
          <Timer className="size-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground shrink-0">Timeout:</span>
          <div className="flex gap-1">
            {[15, 30, 60, 120, 300].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setExecTimeout(t)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all active:scale-95 ${
                  execTimeout === t
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700'
                    : 'bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted hover:text-foreground'
                }`}
              >
                {t >= 60 ? `${t / 60}m` : `${t}s`}
              </button>
            ))}
          </div>
        </div>
        {result && (
          <div className="flex gap-1.5">
            {result.output && (
              <Button variant="outline" size="xs" className="flex-1 gap-1 text-[10px] active:scale-95 transition-transform" onClick={copyOutput}>
                <Copy className="size-3" />Copy Output
              </Button>
            )}
            <Button variant="outline" size="xs" className="flex-1 gap-1 text-[10px] active:scale-95 transition-transform" onClick={() => setResult(null)}>
              <X className="size-3" />Clear Result
            </Button>
          </div>
        )}
      </div>

      {/* Fullscreen Output Dialog */}
      <Dialog open={fullscreenOutput} onOpenChange={setFullscreenOutput}>
        <DialogContent className="max-w-5xl max-h-[90vh] w-[95vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal className="size-5" />
              Execution Output
            </DialogTitle>
            <DialogDescription>
              Full execution output for {script.name}
            </DialogDescription>
          </DialogHeader>
          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={`text-[10px] ${
                  result.status === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {result.status === 'success' ? 'Success' : 'Error'}
                </Badge>
                {result.exitCode !== undefined && (
                  <Badge variant="outline" className="text-[9px]">Exit: {result.exitCode}</Badge>
                )}
                {result.duration !== undefined && (
                  <span className="text-[10px] text-muted-foreground">
                    Duration: {result.duration >= 1000 ? `${(result.duration / 1000).toFixed(2)}s` : `${result.duration}ms`}
                  </span>
                )}
                <div className="flex-1" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-xs" onClick={copyOutput}>
                      {outputCopied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{outputCopied ? 'Copied!' : 'Copy output'}</TooltipContent>
                </Tooltip>
              </div>
              <div className="rounded-lg border bg-gray-950 dark:bg-gray-900 overflow-hidden">
                <ScrollArea className="max-h-[60vh]">
                  <pre className="text-[12px] font-mono p-6 leading-7 whitespace-pre-wrap text-green-400">
                    {result.output?.split('\n').map((line: string, i: number) => (
                      <div key={i} className="flex code-line-highlight -mx-6 px-6">
                        <span className="select-none text-muted-foreground/20 text-right pr-6 shrink-0" style={{ width: '5ch', minWidth: '4ch' }}>
                          {i + 1}
                        </span>
                        <span className="text-green-400">{rawOutput ? line : parseAnsiToSpans(line)}</span>
                      </div>
                    ))}
                  </pre>
                </ScrollArea>
              </div>
              {result.error && (
                <div className="rounded-lg border border-red-900 bg-red-950/30 dark:bg-red-950/50 overflow-hidden">
                  <div className="px-4 py-2 border-b border-red-900/50">
                    <span className="text-[10px] font-medium text-red-400">Error Output</span>
                  </div>
                  <ScrollArea className="max-h-[30vh]">
                    <pre className="text-[12px] font-mono p-6 leading-7 whitespace-pre-wrap text-red-400">
                      {result.error?.split('\n').map((line: string, i: number) => (
                        <div key={i} className="flex code-line-highlight -mx-6 px-6">
                          <span className="select-none text-muted-foreground/20 text-right pr-6 shrink-0" style={{ width: '5ch', minWidth: '4ch' }}>
                            {i + 1}
                          </span>
                          <span className="text-red-400">{line}</span>
                        </div>
                      ))}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Inline template gallery for CodeTab */}
      <TemplateGallery
        open={templateGalleryOpen}
        onOpenChange={setTemplateGalleryOpen}
        onTemplateSelected={(code) => setScriptContent(code)}
      />
    </div>
  );
}

export default React.memo(ExecPanel);
