'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from '@/lib/framer-motion-shim';
import { toast } from 'sonner';
import { Tag, Plus, X, Loader2, Minus, Sparkles } from 'lucide-react';
import type { ScriptData } from '@/types';

// ─── Tag color palette ────────────────────────────────────────────
const TAG_COLORS = [
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-800',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-800',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border-pink-200 dark:border-pink-800',
];

function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

// ─── Parse tags from script ───────────────────────────────────────
function parseTags(script: ScriptData): string[] {
  try {
    return JSON.parse(script.tags || '[]');
  } catch {
    return [];
  }
}

// ─── Batch Tag Dialog Component ───────────────────────────────────

interface BatchTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedScripts: ScriptData[];
  allTags: string[];
  onDone: () => void;
}

export default function BatchTagDialog({
  open,
  onOpenChange,
  selectedScripts,
  allTags,
  onDone,
}: BatchTagDialogProps) {
  const [newTagInput, setNewTagInput] = useState('');
  const [stagedAdd, setStagedAdd] = useState<Set<string>>(new Set());
  const [stagedRemove, setStagedRemove] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Tags common to ALL selected scripts
  const commonTags = useMemo(() => {
    if (selectedScripts.length === 0) return [];
    const tagCounts: Record<string, number> = {};
    selectedScripts.forEach(s => {
      parseTags(s).forEach(t => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .filter(([, count]) => count === selectedScripts.length)
      .map(([tag]) => tag)
      .sort();
  }, [selectedScripts]);

  // Tags on SOME but not ALL selected scripts
  const partialTags = useMemo(() => {
    if (selectedScripts.length <= 1) return [];
    const tagCounts: Record<string, number> = {};
    selectedScripts.forEach(s => {
      parseTags(s).forEach(t => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .filter(([, count]) => count > 1 && count < selectedScripts.length)
      .map(([tag]) => tag)
      .sort();
  }, [selectedScripts]);

  // Tags on only ONE script
  const singleTags = useMemo(() => {
    if (selectedScripts.length <= 1) return [];
    const tagCounts: Record<string, number> = {};
    selectedScripts.forEach(s => {
      parseTags(s).forEach(t => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .filter(([, count]) => count === 1)
      .map(([tag]) => tag)
      .sort();
  }, [selectedScripts]);

  // All tags available for adding (exclude those already common to ALL)
  const availableTagsToAdd = useMemo(() => {
    return allTags.filter(t => !commonTags.includes(t));
  }, [allTags, commonTags]);

  const toggleStagedAdd = useCallback((tag: string) => {
    setStagedAdd(prev => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
    // Remove from stagedRemove if present
    setStagedRemove(prev => {
      if (prev.has(tag)) {
        const next = new Set(prev);
        next.delete(tag);
        return next;
      }
      return prev;
    });
  }, []);

  const toggleStagedRemove = useCallback((tag: string) => {
    setStagedRemove(prev => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
    // Remove from stagedAdd if present
    setStagedAdd(prev => {
      if (prev.has(tag)) {
        const next = new Set(prev);
        next.delete(tag);
        return next;
      }
      return prev;
    });
  }, []);

  const handleCreateTag = useCallback(() => {
    const tag = newTagInput.trim();
    if (!tag) return;
    if (allTags.includes(tag)) {
      // Tag exists, just stage it for add
      if (!commonTags.includes(tag)) {
        toggleStagedAdd(tag);
      }
    } else {
      // New tag, stage for add
      setStagedAdd(prev => new Set(prev).add(tag));
    }
    setNewTagInput('');
  }, [newTagInput, allTags, commonTags, toggleStagedAdd]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateTag();
    }
  }, [handleCreateTag]);

  const handleApply = useCallback(async () => {
    if (stagedAdd.size === 0 && stagedRemove.size === 0) {
      toast.info('No changes to apply');
      return;
    }

    setApplying(true);
    const total = selectedScripts.length;
    setProgress({ current: 0, total });
    let updated = 0;
    let failed = 0;

    for (let i = 0; i < selectedScripts.length; i++) {
      const script = selectedScripts[i];
      const currentTags = parseTags(script);

      // Apply additions
      let newTags = [...currentTags];
      stagedAdd.forEach(tag => {
        if (!newTags.includes(tag)) {
          newTags.push(tag);
        }
      });

      // Apply removals
      stagedRemove.forEach(tag => {
        newTags = newTags.filter(t => t !== tag);
      });

      try {
        const res = await fetch(`/api/scripts/${script.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: JSON.stringify(newTags) }),
        });
        if (!res.ok) throw new Error('Update failed');
        updated++;
      } catch {
        failed++;
      }

      setProgress({ current: i + 1, total });
    }

    setApplying(false);
    setStagedAdd(new Set());
    setStagedRemove(new Set());

    if (failed === 0) {
      toast.success(`Tags updated for ${updated} script${updated !== 1 ? 's' : ''}`, {
        description: stagedAdd.size > 0
          ? `Added ${stagedAdd.size} tag${stagedAdd.size !== 1 ? 's' : ''}${stagedRemove.size > 0 ? `, removed ${stagedRemove.size}` : ''}`
          : `Removed ${stagedRemove.size} tag${stagedRemove.size !== 1 ? 's' : ''}`,
      });
    } else {
      toast.warning(`Updated ${updated} script${updated !== 1 ? 's' : ''}, ${failed} failed`);
    }

    onDone();
    onOpenChange(false);
  }, [selectedScripts, stagedAdd, stagedRemove, onDone, onOpenChange]);

  const handleCancel = useCallback(() => {
    setStagedAdd(new Set());
    setStagedRemove(new Set());
    setNewTagInput('');
    onOpenChange(false);
  }, [onOpenChange]);

  const hasChanges = stagedAdd.size > 0 || stagedRemove.size > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Tag className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            Batch Tag Management
          </DialogTitle>
          <DialogDescription className="text-sm">
            Add or remove tags from {selectedScripts.length} selected script{selectedScripts.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Selected scripts summary */}
          <div className="px-6 py-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Selected Scripts</span>
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                {selectedScripts.length}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
              {selectedScripts.map(s => (
                <span
                  key={s.id}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground"
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>

          <Separator />

          <ScrollArea className="flex-1 max-h-[45vh]">
            <div className="px-6 py-3 space-y-4">
              {/* ─── Add Tags Section ──────────────────────── */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Plus className="size-3.5 text-emerald-500" />
                  <span className="text-sm font-medium">Add Tags</span>
                  {stagedAdd.size > 0 && (
                    <Badge className="text-[10px] h-4 px-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                      +{stagedAdd.size}
                    </Badge>
                  )}
                </div>

                {/* New tag input */}
                <div className="flex gap-1.5 mb-3">
                  <Input
                    value={newTagInput}
                    onChange={e => setNewTagInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Create new tag..."
                    className="h-8 text-xs"
                    disabled={applying}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 gap-1 text-xs shrink-0"
                    onClick={handleCreateTag}
                    disabled={!newTagInput.trim() || applying}
                  >
                    <Plus className="size-3" />
                    Add
                  </Button>
                </div>

                {/* Existing tags to add */}
                <div className="flex flex-wrap gap-1.5">
                  <AnimatePresence mode="popLayout">
                    {availableTagsToAdd.map(tag => {
                      const isStaged = stagedAdd.has(tag);
                      return (
                        <motion.button
                          key={tag}
                          layout
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.15 }}
                          onClick={() => !applying && toggleStagedAdd(tag)}
                          className={`batch-tag-pill inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border cursor-pointer transition-all ${
                            isStaged
                              ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-200 dark:shadow-emerald-900/50'
                              : getTagColor(tag)
                          } ${applying ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                        >
                          {isStaged && <Plus className="size-2.5" />}
                          {tag}
                          {isStaged && (
                            <X className="size-2.5 ml-0.5 opacity-70" />
                          )}
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>

                  {/* Newly created tags staged for add */}
                  {Array.from(stagedAdd).filter(t => !allTags.includes(t)).map(tag => (
                    <motion.button
                      key={`new-${tag}`}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => !applying && toggleStagedAdd(tag)}
                      className={`batch-tag-pill inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border cursor-pointer transition-all bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-200 dark:shadow-emerald-900/50 ${
                        applying ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
                      }`}
                    >
                      <Sparkles className="size-2.5" />
                      {tag}
                      <X className="size-2.5 ml-0.5 opacity-70" />
                    </motion.button>
                  ))}

                  {availableTagsToAdd.length === 0 && stagedAdd.size === 0 && (
                    <span className="text-xs text-muted-foreground italic">All existing tags are already on every selected script</span>
                  )}
                </div>
              </div>

              <Separator />

              {/* ─── Remove Tags Section ─────────────────── */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Minus className="size-3.5 text-rose-500" />
                  <span className="text-sm font-medium">Remove Tags</span>
                  {stagedRemove.size > 0 && (
                    <Badge className="text-[10px] h-4 px-1.5 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800">
                      -{stagedRemove.size}
                    </Badge>
                  )}
                </div>

                {commonTags.length > 0 && (
                  <>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Common to all scripts
                    </span>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <AnimatePresence mode="popLayout">
                        {commonTags.map(tag => {
                          const isStagedRemove = stagedRemove.has(tag);
                          return (
                            <motion.button
                              key={tag}
                              layout
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ duration: 0.15 }}
                              onClick={() => !applying && toggleStagedRemove(tag)}
                              className={`batch-tag-pill inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border cursor-pointer transition-all ${
                                isStagedRemove
                                  ? 'bg-rose-500 text-white border-rose-500 shadow-sm shadow-rose-200 dark:shadow-rose-900/50 line-through'
                                  : getTagColor(tag)
                              } ${applying ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                            >
                              {isStagedRemove && <Minus className="size-2.5" />}
                              {tag}
                              {isStagedRemove && (
                                <X className="size-2.5 ml-0.5 opacity-70" />
                              )}
                            </motion.button>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </>
                )}

                {partialTags.length > 0 && (
                  <>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Partial — on some but not all scripts
                    </span>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <AnimatePresence mode="popLayout">
                        {partialTags.map(tag => {
                          const isStagedRemove = stagedRemove.has(tag);
                          const isStagedAdd = stagedAdd.has(tag);
                          return (
                            <motion.button
                              key={tag}
                              layout
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ duration: 0.15 }}
                              onClick={() => {
                                if (applying) return;
                                if (isStagedAdd || isStagedRemove) {
                                  // Toggle off
                                  if (isStagedAdd) toggleStagedAdd(tag);
                                  if (isStagedRemove) toggleStagedRemove(tag);
                                } else {
                                  // Default: stage for removal
                                  toggleStagedRemove(tag);
                                }
                              }}
                              className={`batch-tag-pill inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border cursor-pointer transition-all ${
                                isStagedRemove
                                  ? 'bg-rose-500 text-white border-rose-500 shadow-sm shadow-rose-200 dark:shadow-rose-900/50 line-through'
                                  : isStagedAdd
                                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-200 dark:shadow-emerald-900/50'
                                  : getTagColor(tag)
                              } ${applying ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                            >
                              {isStagedAdd && <Plus className="size-2.5" />}
                              {isStagedRemove && <Minus className="size-2.5" />}
                              {tag}
                              <span className="ml-0.5 text-[9px] opacity-60">partial</span>
                            </motion.button>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </>
                )}

                {singleTags.length > 0 && (
                  <>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Single — on only one script
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <AnimatePresence mode="popLayout">
                        {singleTags.map(tag => {
                          const isStagedRemove = stagedRemove.has(tag);
                          const isStagedAdd = stagedAdd.has(tag);
                          return (
                            <motion.button
                              key={tag}
                              layout
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ duration: 0.15 }}
                              onClick={() => {
                                if (applying) return;
                                if (isStagedAdd || isStagedRemove) {
                                  if (isStagedAdd) toggleStagedAdd(tag);
                                  if (isStagedRemove) toggleStagedRemove(tag);
                                } else {
                                  toggleStagedRemove(tag);
                                }
                              }}
                              className={`batch-tag-pill inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border cursor-pointer transition-all ${
                                isStagedRemove
                                  ? 'bg-rose-500 text-white border-rose-500 shadow-sm shadow-rose-200 dark:shadow-rose-900/50 line-through'
                                  : isStagedAdd
                                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-200 dark:shadow-emerald-900/50'
                                  : getTagColor(tag)
                              } ${applying ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                            >
                              {isStagedAdd && <Plus className="size-2.5" />}
                              {isStagedRemove && <Minus className="size-2.5" />}
                              {tag}
                              <span className="ml-0.5 text-[9px] opacity-60">1 script</span>
                            </motion.button>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </>
                )}

                {commonTags.length === 0 && partialTags.length === 0 && singleTags.length === 0 && (
                  <span className="text-xs text-muted-foreground italic">No common tags to remove</span>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>

        <Separator />

        {/* Footer with progress and actions */}
        <div className="px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex-1">
            {applying && (
              <div className="flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin text-emerald-500" />
                <span className="text-xs text-muted-foreground">
                  Updating {progress.current}/{progress.total}...
                </span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-emerald-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}
            {!applying && hasChanges && (
              <span className="text-xs text-muted-foreground">
                {stagedAdd.size > 0 && `+${stagedAdd.size} tag${stagedAdd.size !== 1 ? 's' : ''} to add`}
                {stagedAdd.size > 0 && stagedRemove.size > 0 && ', '}
                {stagedRemove.size > 0 && `−${stagedRemove.size} tag${stagedRemove.size !== 1 ? 's' : ''} to remove`}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={applying}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              disabled={!hasChanges || applying}
              className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {applying ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  Apply Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
