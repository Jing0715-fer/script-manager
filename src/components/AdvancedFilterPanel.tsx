// @ts-nocheck
'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from '@/lib/framer-motion-shim';
import {
  Filter, X, Star, GitBranch, Code, Tag, Globe, Layers, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useScriptStore } from '@/store/script-store';
import { langAccentColors, catDotColors } from '@/lib/shared-constants';

// ─── Source Icon Map ──────────────────────────────────────────
const sourceIcons: Record<string, string> = {
  github: 'GH',
  demo: 'DM',
  local: 'LC',
  manual: 'MN',
};

const sourceLabels: Record<string, string> = {
  github: 'GitHub',
  demo: 'Demo',
  local: 'Local',
  manual: 'Manual',
};

// ─── Advanced Filter Panel ──────────────────────────────────────
export function AdvancedFilterPanel({
  scripts,
  open,
  onClose,
}: {
  scripts: Array<{ id: string; language: string; category: string; source: string; sourceUrl?: string | null; tags?: string | null }>;
  open: boolean;
  onClose: () => void;
}) {
  const store = useScriptStore();

  // Compute available filters from current scripts
  const { languages, sources, categories, allTags } = useMemo(() => {
    const langMap: Record<string, number> = {};
    const sourceMap: Record<string, number> = {};
    const catMap: Record<string, number> = {};
    const tagMap: Record<string, number> = {};

    for (const s of scripts) {
      const lang = s.language || 'unknown';
      langMap[lang] = (langMap[lang] || 0) + 1;

      const src = s.source || 'manual';
      sourceMap[src] = (sourceMap[src] || 0) + 1;

      const cat = s.category || 'Uncategorized';
      catMap[cat] = (catMap[cat] || 0) + 1;

      // Parse tags
      try {
        const tags = JSON.parse(s.tags || '[]');
        if (Array.isArray(tags)) {
          for (const t of tags) {
            tagMap[t] = (tagMap[t] || 0) + 1;
          }
        }
      } catch { /* ignore */ }
    }

    return {
      languages: Object.entries(langMap).sort((a, b) => b[1] - a[1]),
      sources: Object.entries(sourceMap).sort((a, b) => b[1] - a[1]),
      categories: Object.entries(catMap).sort((a, b) => b[1] - a[1]),
      allTags: Object.entries(tagMap).sort((a, b) => b[1] - a[1]).slice(0, 20),
    };
  }, [scripts]);

  // Count active filters
  const activeFilterCount = [
    store.selectedCategory !== 'All' ? 1 : 0,
    store.selectedSource ? 1 : 0,
    store.selectedLanguages.length > 0 ? 1 : 0,
    store.selectedTag ? 1 : 0,
    store.searchQuery ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="border-b bg-muted/30 overflow-hidden"
        >
          <div className="px-4 py-3 space-y-3">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-emerald-600" />
                <span className="text-sm font-semibold">Advanced Filters</span>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                    {activeFilterCount} active
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[10px] h-6 text-muted-foreground hover:text-foreground"
                    onClick={() => store.clearAllFilters()}
                  >
                    Clear all
                  </Button>
                )}
                <Button variant="ghost" size="icon-xs" onClick={onClose}>
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Filter rows */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Source filter */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                  <Globe className="size-3" />
                  Source
                </div>
                <div className="flex flex-wrap gap-1">
                  <button
                    className={`inline-flex items-center gap-1 text-[9px] h-5 px-2 rounded-full transition-all duration-200 ${
                      !store.selectedSource
                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                    }`}
                    onClick={() => store.setSelectedSource(null)}
                  >
                    All
                  </button>
                  {sources.map(([source, count]) => (
                    <button
                      key={source}
                      className={`inline-flex items-center gap-1 text-[9px] h-5 px-2 rounded-full transition-all duration-200 ${
                        store.selectedSource === source
                          ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                      }`}
                      onClick={() => store.setSelectedSource(store.selectedSource === source ? null : source)}
                    >
                      <span className="font-medium">{sourceIcons[source] || source.slice(0, 2).toUpperCase()}</span>
                      {sourceLabels[source] || source}
                      <span className="opacity-60">{count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language filter */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                  <Code className="size-3" />
                  Language
                  {store.selectedLanguages.length > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400">{store.selectedLanguages.length}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {languages.map(([lang, count]) => (
                    <button
                      key={lang}
                      className={`inline-flex items-center gap-1 text-[9px] h-5 px-2 rounded-full transition-all duration-200 ${
                        store.selectedLanguages.includes(lang)
                          ? `${langAccentColors[lang] || 'bg-gray-500'} text-white shadow-sm`
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                      }`}
                      onClick={() => store.toggleLanguageFilter(lang)}
                    >
                      {lang}
                      <span className="opacity-60">{count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Category filter (quick access) */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                  <Layers className="size-3" />
                  Category
                </div>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto scrollbar-thin">
                  <button
                    className={`inline-flex items-center gap-1 text-[9px] h-5 px-2 rounded-full transition-all duration-200 ${
                      store.selectedCategory === 'All'
                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                    }`}
                    onClick={() => store.setSelectedCategory('All')}
                  >
                    All
                  </button>
                  {categories.slice(0, 15).map(([cat, count]) => (
                    <button
                      key={cat}
                      className={`inline-flex items-center gap-1 text-[9px] h-5 px-2 rounded-full transition-all duration-200 max-w-[120px] ${
                        store.selectedCategory === cat
                          ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                      }`}
                      onClick={() => store.setSelectedCategory(store.selectedCategory === cat ? 'All' : cat)}
                    >
                      <span className={`size-1.5 rounded-full shrink-0 ${catDotColors[cat] || 'bg-gray-400'}`} />
                      <span className="truncate">{cat}</span>
                      <span className="opacity-60 shrink-0">{count}</span>
                    </button>
                  ))}
                  {categories.length > 15 && (
                    <span className="text-[9px] text-muted-foreground/60 self-center">+{categories.length - 15} more</span>
                  )}
                </div>
              </div>
            </div>

            {/* Popular tags row */}
            {allTags.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                  <Tag className="size-3" />
                  Popular Tags
                  {store.selectedTag && (
                    <button
                      className="text-emerald-600 hover:text-emerald-700"
                      onClick={() => store.setSelectedTag(null)}
                    >
                      clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {allTags.map(([tag, count]) => (
                    <button
                      key={tag}
                      className={`inline-flex items-center gap-1 text-[9px] h-5 px-2 rounded-full transition-all duration-200 ${
                        store.selectedTag === tag
                          ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                          : 'bg-muted/40 text-muted-foreground hover:bg-muted/70'
                      }`}
                      onClick={() => store.setSelectedTag(store.selectedTag === tag ? null : tag)}
                    >
                      #{tag}
                      <span className="opacity-60">{count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
