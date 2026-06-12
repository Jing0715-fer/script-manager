// @ts-nocheck
'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { StickyNote, Trash2, Loader2, AlignLeft, Check, Plus, Clock, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

interface NotesTabProps {
  scriptId: string;
  notes: string;
  onNotesChange: (notes: string) => void;
  onNotesBlur: () => void;
}

// Simple markdown-like rendering: bold, italic, code blocks
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    let processed: React.ReactNode = line;

    // Code blocks: ```...```
    if (line.startsWith('```')) continue;

    // Apply inline formatting: **bold**, *italic*, `code`
    const parts = processed.toString().split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/);
    if (parts.length > 1) {
      processed = (
        <span key={key++}>
          {parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={i} className="font-bold text-emerald-700 dark:text-emerald-400">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**') && !part.endsWith('**')) {
              return <em key={i} className="italic">{part.slice(1, -1)}</em>;
            }
            if (part.startsWith('`') && part.endsWith('`')) {
              return <code key={i} className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono text-emerald-700 dark:text-emerald-400">{part.slice(1, -1)}</code>;
            }
            return <span key={i}>{part}</span>;
          })}
        </span>
      );
    }

    result.push(
      <div key={key++} className="min-h-[1.5em]">{processed || <br />}</div>
    );
  }

  return result;
}

// Quick memo color options
const MEMO_COLORS = [
  { name: 'default' as const, bg: 'bg-muted/30', border: 'border-border', dot: 'bg-gray-400' },
  { name: 'blue' as const, bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-200 dark:border-blue-800', dot: 'bg-blue-500' },
  { name: 'green' as const, bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500' },
  { name: 'amber' as const, bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-200 dark:border-amber-800', dot: 'bg-amber-500' },
  { name: 'rose' as const, bg: 'bg-rose-50 dark:bg-rose-950/20', border: 'border-rose-200 dark:border-rose-800', dot: 'bg-rose-500' },
];

type MemoColor = 'default' | 'blue' | 'green' | 'amber' | 'rose';

interface QuickMemo {
  id: string;
  text: string;
  color: MemoColor;
  createdAt: number;
}

export function NotesTab({ scriptId, notes, onNotesChange, onNotesBlur }: NotesTabProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Quick memo state
  const [memoInput, setMemoInput] = useState('');
  const [memoColor, setMemoColor] = useState<MemoColor>('default');
  const [memos, setMemos] = useState<QuickMemo[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(`scripthub-memos-${scriptId}`);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const saveMemos = useCallback((newMemos: QuickMemo[]) => {
    setMemos(newMemos);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`scripthub-memos-${scriptId}`, JSON.stringify(newMemos));
    }
  }, [scriptId]);

  const addMemo = useCallback(() => {
    if (!memoInput.trim()) return;
    const newMemo: QuickMemo = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      text: memoInput.trim(),
      color: memoColor,
      createdAt: Date.now(),
    };
    saveMemos([newMemo, ...memos]);
    setMemoInput('');
    toast.success('Memo added');
  }, [memoInput, memoColor, memos, saveMemos]);

  const deleteMemo = useCallback((id: string) => {
    saveMemos(memos.filter(m => m.id !== id));
  }, [memos, saveMemos]);

  const wordCount = useMemo(() => {
    const trimmed = notes.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  }, [notes]);

  const charCount = notes.length;

  // Show save indicator with fade
  const showSaved = useCallback(() => {
    setShowSaveIndicator(true);
    if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    fadeTimeoutRef.current = setTimeout(() => setShowSaveIndicator(false), 2000);
  }, []);

  // Debounced auto-save to API
  const debouncedSave = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const r = await fetch(`/api/scripts/${scriptId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: value }),
        });
        if (r.ok) {
          setSaveStatus('saved');
          showSaved();
        } else {
          setSaveStatus('idle');
        }
      } catch {
        setSaveStatus('idle');
      }
    }, 600);
  }, [scriptId, showSaved]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    onNotesChange(value);
    debouncedSave(value);
  }, [onNotesChange, debouncedSave]);

  const handleBlur = useCallback(() => {
    onNotesBlur();
    // Force immediate save on blur
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    debouncedSave(notes);
  }, [onNotesBlur, notes, debouncedSave]);

  const handleClear = useCallback(() => {
    if (!clearConfirm) {
      setClearConfirm(true);
      setTimeout(() => setClearConfirm(false), 3000);
      return;
    }
    onNotesChange('');
    setClearConfirm(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debouncedSave('');
    toast.success('Notes cleared');
  }, [onNotesChange, debouncedSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    };
  }, []);

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-4">
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
            <StickyNote className="size-3" />Script Notes
          </span>
          <div className="flex items-center gap-2">
            {/* Save indicator */}
            <span className={`text-[9px] font-medium transition-opacity duration-500 ${showSaveIndicator ? 'opacity-100' : 'opacity-0'}`}>
              {saveStatus === 'saving' ? (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Loader2 className="size-2.5 animate-spin" />Saving...
                </span>
              ) : saveStatus === 'saved' ? (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <Check className="size-2.5" />Saved
                </span>
              ) : null}
            </span>
            <Switch
              checked={showPreview}
              onCheckedChange={setShowPreview}
              className="scale-75"
            />
            <span className="text-[9px] text-muted-foreground">{showPreview ? 'Preview' : 'Edit'}</span>
          </div>
        </div>

        {/* Preview mode */}
        {showPreview ? (
          <div className="rounded-lg border bg-muted/20 p-4 min-h-[200px] prose prose-xs max-w-none">
            {notes.trim() ? renderMarkdown(notes) : (
              <p className="text-xs text-muted-foreground italic">No notes yet...</p>
            )}
          </div>
        ) : (
          <Textarea
            value={notes}
            onChange={handleChange}
            onBlur={handleBlur}
            className="min-h-[200px] text-xs leading-5 bg-muted/20"
            placeholder="Write notes about this script... (supports **bold**, *italic*, `code`)"
          />
        )}

        {/* Stats bar */}
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[9px] px-1.5">
              <AlignLeft className="size-2.5" />{charCount} chars
            </Badge>
            <Badge variant="secondary" className="text-[9px] px-1.5">
              {wordCount} words
            </Badge>
            {saveStatus === 'saving' && (
              <Badge variant="secondary" className="text-[9px] px-1.5 gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <Loader2 className="size-2.5 animate-spin" />Saving...
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            className={`text-[10px] ${clearConfirm ? 'text-destructive' : 'text-muted-foreground'}`}
            onClick={handleClear}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>

        <p className="text-[9px] text-muted-foreground">
          Notes auto-save on blur and after 600ms of inactivity. Synced to server.
        </p>

        {/* ─── Quick Memos Section ─── */}
        <div className="mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5 mb-2">
            <StickyNote className="size-3 text-emerald-500" />
            <span className="text-[11px] font-medium text-muted-foreground">Quick Memos</span>
            <Badge variant="secondary" className="text-[8px] px-1 ml-auto">{memos.length}</Badge>
          </div>

          {/* Quick memo input */}
          <div className="flex items-center gap-1.5 mb-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={memoInput}
                onChange={e => setMemoInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMemo(); } }}
                placeholder="Add a quick memo..."
                className="w-full h-7 text-[11px] bg-muted/30 border border-border/50 rounded-md px-2.5 pr-8 outline-none focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200 transition-all"
              />
            </div>
            {/* Color picker dots */}
            <div className="flex items-center gap-0.5">
              {MEMO_COLORS.map(c => (
                <button
                  key={c.name}
                  type="button"
                  className={`note-color-dot transition-all ${c.dot} ${memoColor === c.name ? 'ring-2 ring-offset-1 ring-current scale-110' : 'opacity-40 hover:opacity-100'}`}
                  onClick={() => setMemoColor(c.name)}
                  title={c.name}
                />
              ))}
            </div>
            <Button
              size="icon-xs"
              className="bg-emerald-600 text-white hover:bg-emerald-700 active:scale-90 transition-transform shrink-0"
              onClick={addMemo}
              disabled={!memoInput.trim()}
            >
              <Plus className="size-3" />
            </Button>
          </div>

          {/* Memos list */}
          {memos.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {memos.map((memo, idx) => {
                const colorStyle = MEMO_COLORS.find(c => c.name === memo.color) || MEMO_COLORS[0];
                const timeAgo = formatDistanceToNow(new Date(memo.createdAt), { addSuffix: true });
                return (
                  <div
                    key={memo.id}
                    className={`note-item note-enter rounded-md px-2.5 py-1.5 ${colorStyle.bg} border ${colorStyle.border}`}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-start gap-1.5">
                      <div className={`note-color-dot mt-1 ${colorStyle.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-foreground leading-relaxed">{memo.text}</p>
                        <span className="text-[8px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                          <Clock className="size-2" />{timeAgo}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 text-muted-foreground/40 hover:text-destructive transition-colors"
                        onClick={() => deleteMemo(memo.id)}
                      >
                        <X className="size-2.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {memos.length === 0 && (
            <p className="text-[10px] text-muted-foreground/50 italic text-center py-2">No memos yet. Type above to add one.</p>
          )}
        </div>
      </div>
    </div>
  );
}
