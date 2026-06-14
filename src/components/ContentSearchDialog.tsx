// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Search, FileCode, Clock, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from '@/lib/framer-motion-shim';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LanguageIcon } from '@/components/LanguageIcon';
import { langAccentColors } from '@/lib/shared-constants';
import type { ScriptData } from '@/types';

// ─── Search History ──────────────────────────────────────────────
const SEARCH_HISTORY_KEY = 'scripthub-content-search-history';
const MAX_HISTORY = 10;

function loadSearchHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
  } catch { return []; }
}

function saveSearchHistory(history: string[]) {
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch { /* ignore */ }
}

// ─── Highlight Match ─────────────────────────────────────────────
function highlightCodeMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const q = query.trim().toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-emerald-300/60 dark:bg-emerald-700/50 text-inherit rounded-sm px-0.5">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

// ─── Search Result Type ──────────────────────────────────────────
interface SearchResult {
  script: ScriptData;
  matchLine: number;
  matchContext: string[];
}

// ─── ContentSearchDialog ────────────────────────────────────────
export default function ContentSearchDialog({
  open,
  onOpenChange,
  scripts,
  onSelectScript,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scripts: ScriptData[];
  onSelectScript: (script: ScriptData) => void;
}) {
  const [query, setQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>(loadSearchHistory);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchStartRef = useRef<number>(0);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
    }
  }, [open]);

  // Search logic — search within script content
  const results = useMemo<{ items: SearchResult[]; time: number }>(() => {
    if (!query.trim() || scripts.length === 0) return { items: [], time: 0 };
    const start = performance.now();
    const q = query.trim().toLowerCase();
    const found: SearchResult[] = [];

    for (const script of scripts) {
      const content = script.content || '';
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(q)) {
          const startLine = Math.max(0, i - 1);
          const endLine = Math.min(lines.length, i + 2);
          found.push({
            script,
            matchLine: i,
            matchContext: lines.slice(startLine, endLine),
          });
          break; // One result per script
        }
      }
    }

    const time = performance.now() - start;
    return { items: found, time };
  }, [query, scripts]);

  // Add to history on search with results
  const handleSearchSubmit = useCallback(() => {
    if (query.trim() && results.items.length > 0) {
      setSearchHistory(prev => {
        const filtered = prev.filter(h => h !== query.trim());
        const next = [query.trim(), ...filtered].slice(0, MAX_HISTORY);
        saveSearchHistory(next);
        return next;
      });
    }
  }, [query, results.items.length]);

  // Clear history
  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    saveSearchHistory([]);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Search Code Content</DialogTitle>
          <DialogDescription>Search within the code content of all scripts</DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="p-3 border-b">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); searchStartRef.current = Date.now(); }}
                onKeyDown={e => { if (e.key === 'Escape') onOpenChange(false); if (e.key === 'Enter') handleSearchSubmit(); }}
                placeholder="Search in code content..."
                className="pl-9 pr-10 h-9 text-sm"
                autoFocus
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-1 h-9 select-none rounded border bg-muted px-2 text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⇧</span>Ctrl<span className="text-xs">⇧</span>F
            </kbd>
          </div>
        </div>

        {/* Results or History */}
        <div className="max-h-[400px] overflow-y-auto">
          {!query.trim() && searchHistory.length > 0 && (
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Recent Searches</span>
                <button onClick={clearHistory} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                  Clear
                </button>
              </div>
              <div className="space-y-1">
                {searchHistory.map((term, idx) => (
                  <button
                    key={`${term}-${idx}`}
                    onClick={() => setQuery(term)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-muted transition-colors text-sm text-muted-foreground hover:text-foreground"
                  >
                    <Clock className="size-3 shrink-0 opacity-40" />
                    <span className="truncate">{term}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query.trim() && results.items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="size-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                <Search className="size-5 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground">No scripts match your search</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                &ldquo;{query.trim()}&rdquo; not found in any script content
              </p>
            </div>
          )}

          {results.items.length > 0 && (
            <div>
              <div className="px-3 py-2 border-b flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">
                  {results.items.length} script{results.items.length !== 1 ? 's' : ''} found in {results.time < 1 ? '&lt;1' : Math.round(results.time)}ms
                </span>
              </div>
              <div className="p-1.5">
                <AnimatePresence mode="popLayout">
                  {results.items.map((result, idx) => (
                    <motion.button
                      key={result.script.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ delay: idx * 0.03, duration: 0.2 }}
                      onClick={() => {
                        handleSearchSubmit();
                        onSelectScript(result.script);
                        onOpenChange(false);
                      }}
                      className="w-full flex items-start gap-3 rounded-lg p-2.5 hover:bg-muted/50 transition-colors text-left group"
                    >
                      {/* Language icon */}
                      <div className={`size-8 rounded-lg bg-gradient-to-br ${
                        result.script.language === 'python' ? 'from-emerald-400 to-emerald-600'
                        : result.script.language === 'bash' || result.script.language === 'shell' ? 'from-amber-400 to-amber-600'
                        : result.script.language === 'javascript' ? 'from-yellow-400 to-yellow-600'
                        : result.script.language === 'typescript' ? 'from-blue-400 to-blue-600'
                        : 'from-gray-400 to-gray-600'
                      } flex items-center justify-center shrink-0 shadow-sm`}>
                        <LanguageIcon language={result.script.language} className="text-xs" />
                      </div>

                      {/* Script info and code preview */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-semibold truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {result.script.name}
                          </span>
                          <span className={`inline-flex items-center text-[8px] h-3 px-1.5 rounded-full font-medium leading-none ${langAccentColors[result.script.language?.toLowerCase()] || 'bg-gray-500'} text-white`}>
                            {result.script.language}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-1.5">
                          Line {result.matchLine + 1} · {result.script.filename}
                        </p>
                        <div className="rounded-md bg-muted/50 px-2 py-1.5 overflow-hidden">
                          <pre className="text-[9px] font-mono text-muted-foreground leading-4">
                            {result.matchContext.map((line: string, i: number) => (
                              <div key={i} className="flex">
                                <span className="select-none text-muted-foreground/30 text-right pr-3 shrink-0 w-4">
                                  {result.matchLine - 1 + i + 1}
                                </span>
                                <span className={i === 1 ? 'text-foreground/80' : ''}>
                                  {highlightCodeMatch(line || ' ', query)}
                                </span>
                              </div>
                            ))}
                          </pre>
                        </div>
                      </div>

                      {/* Arrow indicator */}
                      <ArrowRight className="size-3 text-muted-foreground/30 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
