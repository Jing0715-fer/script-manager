'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Terminal, Pencil, Save, RotateCcw, Download, Copy, Check,
  Loader2, Maximize2, Clock, Timer, WrapText, ChevronDown, ChevronUp,
  Gauge, Search, ArrowUp, ArrowDown, X, GitBranch, Upload, Code,
  Code2, FunctionSquare, LayoutGrid, BarChart3, FileCode, Package,
  ListOrdered,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from '@/lib/framer-motion-shim';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Tooltip, TooltipTrigger, TooltipContent,
} from '@/components/ui/tooltip';
import { formatTimer, parseAnsiToSpans } from './shared';
import { computeDiff } from '@/lib/diff-utils';

interface CodeTabProps {
  script: { content: string; name: string; language: string; filename: string; id: string };
  result: { status: string; output?: string; error?: string; duration?: number; exitCode?: number; timestamp?: string } | null;
  executing: boolean;
  elapsedTime: number;
  editing: boolean;
  editContent: string;
  saving: boolean;
  copied: boolean;
  outputCopied: boolean;
  codeShadow: 'none' | 'top' | 'bottom' | 'both';
  rawOutput: boolean;
  lineCount: number;
  lineNumWidth: number;
  onEditContentChange: (v: string) => void;
  onSetContent: (content: string) => void;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSaveEditing: () => void;
  onDownloadScript: () => void;
  onCopyCode: () => void;
  onCopyOutput: () => void;
  onToggleRawOutput: () => void;
  onFullscreenOutput: () => void;
  onTemplateSelected?: (code: string) => void;
  onOpenTemplateGallery?: () => void;
}

interface VersionEntry {
  id: string;
  content: string;
  lineCount: number;
  message: string | null;
  createdAt: string;
}

function versionRelativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

// Typing animation speeds
const TYPING_SPEEDS = {
  '1x': 20,
  '2x': 10,
  '5x': 4,
  'instant': 0,
} as const;

type TypingSpeed = keyof typeof TYPING_SPEEDS;

export function CodeTab({
  script, result, executing, elapsedTime,
  editing, editContent, saving, copied, outputCopied,
  codeShadow, rawOutput, lineCount, lineNumWidth,
  onEditContentChange, onStartEditing, onCancelEditing, onSaveEditing,
  onDownloadScript, onCopyCode, onCopyOutput, onToggleRawOutput, onFullscreenOutput, onSetContent, onTemplateSelected, onOpenTemplateGallery,
}: CodeTabProps) {
  // Feature 3: Line numbers visibility toggle
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  // Ref for auto-scrolling to result after execution
  const resultRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Feature 1: Stats panel expand/collapse
  const [statsExpanded, setStatsExpanded] = useState(false);

  // Feature 5: Hovered line tracking
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);

  // Feature 1: Compute code statistics with useMemo
  const codeStats = useMemo(() => {
    const content = script.content || '';
    const funcMatches = content.match(/(?:^|\n)\s*(?:def |async def )/g);
    const classMatches = content.match(/(?:^|\n)\s*(?:class )/g);
    const importMatches = content.match(/(?:^|\n)\s*(?:from |import )/g);
    const lines = content.split('\n');
    const commentLines = lines.filter(l => {
      const trimmed = l.trimStart();
      return trimmed.startsWith('#') && !trimmed.startsWith('#!');
    }).length;
    return {
      functions: funcMatches ? funcMatches.length : 0,
      classes: classMatches ? classMatches.length : 0,
      imports: importMatches ? importMatches.length : 0,
      comments: commentLines,
    };
  }, [script.content]);

  // Mounted state guard for client-only rendering
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  // Typing animation state - default to 'instant' to ensure output is always visible immediately
  const [typingSpeed, setTypingSpeed] = useState<TypingSpeed>('instant');
  const [displayedOutput, setDisplayedOutput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const fullOutput = result?.output || '';
  const prevResultRef = useRef(result);
  const typingFrameRef = useRef<number | null>(null);

  // Word wrap toggle
  const [wordWrap, setWordWrap] = useState(true);

  // Expand/collapse long output
  const [outputExpanded, setOutputExpanded] = useState(false);
  const outputLines = useMemo(() => (fullOutput || '').split('\n'), [fullOutput]);
  const isLongOutput = outputLines.length > 100;

  // Feature 1: Code search state
  // Version history state
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [scriptVersions, setScriptVersions] = useState<VersionEntry[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<VersionEntry | null>(null);
  const [compareVersionId, setCompareVersionId] = useState<string | null>(null);
  const [diffResult, setDiffResult] = useState<{ type: 'same' | 'added' | 'removed'; line: string }[] | null>(null);

  const fetchVersions = async () => {
    setVersionsLoading(true);
    try {
      const r = await fetch(`/api/scripts/${script.id}/versions?limit=10`);
      if (r.ok) {
        const data = await r.json();
        setScriptVersions(data.versions || []);
      }
    } catch { /* ignore */ }
    setVersionsLoading(false);
  };

  useEffect(() => { fetchVersions(); }, [script.id]);

  const handleRestoreVersion = async (v: VersionEntry) => {
    try {
      const r = await fetch(`/api/scripts/${script.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: v.content }),
      });
      if (r.ok) {
        toast.success('Version restored', { description: v.message || `Restored ${v.lineCount} lines` });
        setPreviewVersion(null);
        onSetContent(v.content);
      }
    } catch { toast.error('Failed to restore version'); }
 };

  const handleSaveAsVersion = async () => {
    try {
      await fetch(`/api/scripts/${script.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: script.content, message: 'Content saved' }),
      });
      toast.success('Version snapshot created');
      fetchVersions();
    } catch { toast.error('Failed to create version'); }
  };

  const handleCompareVersion = (v: VersionEntry) => {
    if (compareVersionId === v.id) {
      setCompareVersionId(null);
      setDiffResult(null);
      return;
    }
    setCompareVersionId(v.id);
    const diff = computeDiff(v.content, script.content || '');
    setDiffResult(diff);
  };

  const handleRestoreFromDiff = async (v: VersionEntry) => {
    await handleRestoreVersion(v);
    setCompareVersionId(null);
    setDiffResult(null);
  };

  // Code search state
  const [codeSearch, setCodeSearch] = useState('');
  const [codeSearchOpen, setCodeSearchOpen] = useState(false);
  const [activeMatchIdx, setActiveMatchIdx] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const codeScrollRef = useRef<HTMLDivElement>(null);

  // Feature 1: Ctrl+F shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f' && !editing) {
        e.preventDefault();
        setCodeSearchOpen(prev => !prev);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape' && codeSearchOpen) {
        setCodeSearchOpen(false);
        setCodeSearch('');
        setActiveMatchIdx(0);
      }
    };
    const parent = codeScrollRef.current?.closest('[role="tabpanel"]');
    if (parent) {
      parent.addEventListener('keydown', handler as EventListener);
      return () => parent.removeEventListener('keydown', handler as EventListener);
    }
    return () => {};
  }, [editing, codeSearchOpen]);

  // Start typing animation when result changes
  // Always show full output immediately as fallback, then animate if typing speed is set
  useEffect(() => {
    if (!result?.output || result === prevResultRef.current) return;
    prevResultRef.current = result;
    const speed = TYPING_SPEEDS[typingSpeed];

    // Always show the full output immediately (instant mode or fallback)
    if (speed === 0) {
      setDisplayedOutput(result.output);
      setIsTyping(false);
      if (typingFrameRef.current) cancelAnimationFrame(typingFrameRef.current);
      return;
    }

    // For animated modes, show full output first, then play animation overlay
    // This ensures output is ALWAYS visible even if animation fails
    setDisplayedOutput(result.output);
    setIsTyping(false);
  }, [result?.output, typingSpeed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingFrameRef.current) cancelAnimationFrame(typingFrameRef.current);
    };
  }, []);

  // Handle speed change
  const handleSpeedChange = (speed: TypingSpeed) => {
    setTypingSpeed(speed);
    // Always show full output immediately when changing speed
    if (result?.output) {
      setDisplayedOutput(result.output);
      setIsTyping(false);
      if (typingFrameRef.current) cancelAnimationFrame(typingFrameRef.current);
    }
  };

  // Get the output to display (accounting for expand/collapse)
  const visibleOutput = useMemo(() => {
    if (!isLongOutput || outputExpanded) return displayedOutput;
    const lines = displayedOutput.split('\n');
    if (lines.length <= 100) return displayedOutput;
    return [...lines.slice(0, 50), '', '  ... (middle lines hidden) ...', '', ...lines.slice(-50)].join('\n');
  }, [displayedOutput, isLongOutput, outputExpanded]);

  // Word frequency cloud computation (memoized)
  const wordFreqCloudData = useMemo(() => {
    const content = script.content || '';
    const words = content.toLowerCase().split(/[^a-zA-Z]+/).filter(w => w.length >= 3);
    const pyKeywords = new Set(['if','else','for','in','def','class','return','print','import','from','self','true','false','none','with','as','not','and','or','try','except','finally','raise','pass','break','continue','lambda','yield','global','assert','del','while','elif','is','type','new','str','int','float','list','dict','set','tuple','bool','len','range','open','file','name','data','result','value','args','kwargs','get','set','has','use','put','run','end','can','may','also','the','this','that','are','was','all','its','but','any','how','out','will','just','been','than','more','into','other','then','them','when','make','like']);
    const freq = new Map<string, number>();
    words.forEach(w => {
      if (!pyKeywords.has(w)) freq.set(w, (freq.get(w) || 0) + 1);
    });
    const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
    const maxFreq = sorted[0]?.[1] || 1;
    if (sorted.length < 3) return null;
    return { sorted, maxFreq };
  }, [script.content]);

  // Feature 1: Compute matching lines and match positions
  const codeLines = useMemo(() => (script.content || '').split('\n'), [script.content]);
  const matchData = useMemo(() => {
    if (!codeSearch.trim()) return { matches: 0, lineIndices: [] as number[] };
    const q = codeSearch.toLowerCase();
    const indices: number[] = [];
    codeLines.forEach((line, i) => {
      if (line.toLowerCase().includes(q)) indices.push(i);
    });
    return { matches: indices.length, lineIndices: indices };
  }, [codeSearch, codeLines]);

  // Feature 1: Navigate matches
  useEffect(() => {
    if (matchData.lineIndices.length === 0) { setActiveMatchIdx(0); return; }
    setActiveMatchIdx(prev => Math.min(prev, matchData.lineIndices.length - 1));
  }, [matchData.lineIndices.length]);

  const handleSearchNext = () => {
    if (matchData.lineIndices.length === 0) return;
    setActiveMatchIdx(prev => (prev + 1) % matchData.lineIndices.length);
  };
  const handleSearchPrev = () => {
    if (matchData.lineIndices.length === 0) return;
    setActiveMatchIdx(prev => (prev - 1 + matchData.lineIndices.length) % matchData.lineIndices.length);
  };
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) handleSearchPrev();
      else handleSearchNext();
    }
  };

  // Feature 1: Highlight matching text in a line
  const highlightLine = (line: string, query: string, isActive: boolean) => {
    if (!query.trim()) return line;
    const q = query.toLowerCase();
    const idx = line.toLowerCase().indexOf(q);
    if (idx === -1) return line;
    return (
      <>
        {line.slice(0, idx)}
        <mark className={`rounded-sm px-0.5 ${isActive ? 'code-search-active' : 'code-search-highlight'}`}>
          {line.slice(idx, idx + q.length)}
        </mark>
        {line.slice(idx + q.length)}
      </>
    );
  };

  // Auto-scroll to result when execution completes
  useEffect(() => {
    if (result && !executing && resultRef.current) {
      // Use a small delay to ensure DOM is updated
      const timer = setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [result, executing]);

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
      <div className="mt-3 relative">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium text-muted-foreground">
            {editing ? `${editContent.split('\n').length} lines (editing)` : `${lineCount} lines`}
          </span>
          <div className="flex items-center gap-1">
            {editing ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-xs" onClick={onSaveEditing} disabled={saving}>
                      {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3 text-emerald-600" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Save changes</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-xs" onClick={onCancelEditing} disabled={saving}>
                      <RotateCcw className="size-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Cancel editing</TooltipContent>
                </Tooltip>
              </>
            ) : (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-xs" onClick={onStartEditing}>
                      <Pencil className="size-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit script</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-xs" onClick={onDownloadScript}>
                      <Download className="size-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Download script</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-xs" onClick={onCopyCode}>
                      {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{copied ? 'Copied!' : 'Copy code'}</TooltipContent>
                </Tooltip>
                {/* Version history toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => { setVersionHistoryOpen((prev: boolean) => !prev); }}
                      className={versionHistoryOpen ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : ''}
                    >
                      <GitBranch className="size-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Version history</TooltipContent>
                </Tooltip>
                {/* Save Version button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-xs" onClick={handleSaveAsVersion}>
                      <Upload className="size-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Save version snapshot</TooltipContent>
                </Tooltip>
                {/* Feature 3: Line numbers toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setShowLineNumbers(v => !v)}
                      className={showLineNumbers ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : ''}
                    >
                      <ListOrdered className="size-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{showLineNumbers ? 'Hide line numbers' : 'Show line numbers'}</TooltipContent>
                </Tooltip>
                {/* Feature 1: Code search toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => { setCodeSearchOpen(v => !v); setTimeout(() => searchInputRef.current?.focus(), 100); }}
                      className={codeSearchOpen ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : ''}
                    >
                      <Search className="size-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Search in code (⌘F)</TooltipContent>
                </Tooltip>
                {/* Templates button */}
                {onOpenTemplateGallery && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon-xs" onClick={onOpenTemplateGallery}>
                        <LayoutGrid className="size-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Templates</TooltipContent>
                  </Tooltip>
                )}
              </>
            )}
          </div>
        </div>

        {/* Version history dropdown */}
        {versionHistoryOpen && (
          <div className="version-history-enter mb-2 rounded-lg border bg-muted/30 overflow-hidden">
            <div className="max-h-60 overflow-y-auto">
              {versionsLoading && (
                <div className="flex items-center justify-center py-3"><Loader2 className="size-3 animate-spin" /></div>
              )}
              {!versionsLoading && scriptVersions.length === 0 && (
                <div className="flex items-center justify-center py-4 text-[11px] text-muted-foreground">
                  No versions yet
                </div>
              )}
              {!versionsLoading && scriptVersions.map((v, idx) => (
                <div
                  key={v.id}
                  className={`version-entry-enter border-b border-border/50 last:border-b-0 ${previewVersion?.id === v.id ? 'bg-emerald-100 dark:bg-emerald-900/30' : ''}`}
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-[11px] hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors flex items-center gap-2"
                    onClick={() => setPreviewVersion(previewVersion?.id === v.id ? null : v)}
                  >
                    <GitBranch className="size-3 text-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground truncate">{v.lineCount} lines</span>
                        <span className="text-[9px] text-muted-foreground">{versionRelativeTime(v.createdAt)}</span>
                      </div>
                      {v.message && <p className="text-[9px] text-muted-foreground truncate">{v.message}</p>}
                    </div>
                  </button>
                  <div className="flex items-center gap-1 px-3 pb-1.5">
                    <button
                      type="button"
                      className={`text-[9px] px-2 py-0.5 rounded-full border transition-colors ${compareVersionId === v.id ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700' : 'bg-muted/50 text-muted-foreground border-border hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600'}`}
                      onClick={(e) => { e.stopPropagation(); handleCompareVersion(v); }}
                    >
                      {compareVersionId === v.id ? 'Hide Diff' : 'Compare with current'}
                    </button>
                    {compareVersionId === v.id && (
                      <button
                        type="button"
                        className="text-[9px] px-2 py-0.5 rounded-full border bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
                        onClick={(e) => { e.stopPropagation(); handleRestoreFromDiff(v); }}
                      >
                        Restore this version
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {compareVersionId && diffResult && (
              <div className="border-t border-border/50 bg-muted/10 max-h-60 overflow-y-auto">
                <div className="px-3 py-1.5 border-b border-border/30 flex items-center justify-between">
                  <span className="text-[9px] font-medium text-muted-foreground">Version vs Current ({diffResult.filter(d => d.type !== 'same').length} changes)</span>
                  <button
                    type="button"
                    className="text-[9px] text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => { setCompareVersionId(null); setDiffResult(null); }}
                  >
                    <X className="size-3" />
                  </button>
                </div>
                <pre className="text-[10px] font-mono leading-4 p-2">
                  {diffResult.slice(0, 200).map((line, i) => (
                    <div
                      key={i}
                      className={`${line.type === 'added' ? 'diff-line-added' : line.type === 'removed' ? 'diff-line-removed' : 'diff-line-same'} px-2 py-0.5`}
                    >
                      <span className="select-none text-muted-foreground/40 w-4 inline-block text-right mr-2">{line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}</span>
                      <span className={line.type === 'added' ? 'text-emerald-700 dark:text-emerald-400' : line.type === 'removed' ? 'text-red-700 dark:text-red-400' : 'text-muted-foreground'}>{line.line || ' '}</span>
                    </div>
                  ))}
                  {diffResult.length > 200 && (
                    <div className="text-[9px] text-muted-foreground/50 px-2 py-1">... and {diffResult.length - 200} more lines</div>
                  )}
                </pre>
              </div>
            )}
            {previewVersion && (
              <div className="border-t border-border/50 px-3 py-2 flex items-center justify-between bg-muted/20">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Previewing version</span>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon-xs" onClick={() => handleRestoreVersion(previewVersion)}>
                        <RotateCcw className="size-3 text-emerald-600" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Restore this version</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon-xs" onClick={() => setPreviewVersion(null)}>
                        <X className="size-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Back to current</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Feature 1: Code search bar */}
        {codeSearchOpen && (
          <div className="code-search-bar mb-2 rounded-lg border bg-muted/30 px-3 py-2 flex items-center gap-2">
            <Search className="size-3.5 text-emerald-500 shrink-0" />
            <Input
              ref={searchInputRef}
              value={codeSearch}
              onChange={e => { setCodeSearch(e.target.value); setActiveMatchIdx(0); }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search in code..."
              className="h-7 text-[11px] border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 flex-1"
            />
            {codeSearch.trim() && matchData.matches > 0 && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono whitespace-nowrap">
                {activeMatchIdx + 1}/{matchData.matches}
              </span>
            )}
            {codeSearch.trim() && matchData.matches === 0 && codeSearch && (
              <span className="text-[10px] text-muted-foreground">No matches</span>
            )}
            <div className="flex items-center gap-0.5 shrink-0">
              <Button variant="ghost" size="icon-xs" onClick={handleSearchPrev} disabled={matchData.matches === 0}>
                <ArrowUp className="size-2.5" />
              </Button>
              <Button variant="ghost" size="icon-xs" onClick={handleSearchNext} disabled={matchData.matches === 0}>
                <ArrowDown className="size-2.5" />
              </Button>
              <Button variant="ghost" size="icon-xs" onClick={() => { setCodeSearchOpen(false); setCodeSearch(''); setActiveMatchIdx(0); }}>
                <X className="size-2.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── Feature 1: Script Statistics Bar ──────────────── */}
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setStatsExpanded(v => !v)}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <BarChart3 className="size-3 text-emerald-500" />
            <span className="font-medium">{lineCount} lines</span>
            <span className="text-muted-foreground/60">· Stats</span>
            {statsExpanded ? <ChevronUp className="size-2.5" /> : <ChevronDown className="size-2.5" />}
          </button>
          <AnimatePresence>
            {statsExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-2 rounded-lg border bg-muted/20 p-3">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="stats-badge-enter mini-tooltip inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium border transition-all duration-150 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800" data-tooltip="Total lines of code" style={{ animationDelay: '0ms' }}>
                      <Code2 className="size-2.5" />{lineCount} lines
                    </span>
                    <span className="stats-badge-enter mini-tooltip inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium border transition-all duration-150 bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-800" data-tooltip={`${codeStats.functions} function(s) defined`} style={{ animationDelay: '40ms' }}>
                      <FunctionSquare className="size-2.5" />{codeStats.functions} functions
                    </span>
                    <span className="stats-badge-enter mini-tooltip inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium border transition-all duration-150 bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800" data-tooltip={`${codeStats.classes} class(es) defined`} style={{ animationDelay: '80ms' }}>
                      <FileCode className="size-2.5" />{codeStats.classes} classes
                    </span>
                    <span className="stats-badge-enter mini-tooltip inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium border transition-all duration-150 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800" data-tooltip={`${codeStats.imports} import statement(s)`} style={{ animationDelay: '120ms' }}>
                      <Package className="size-2.5" />{codeStats.imports} imports
                    </span>
                    <span className="stats-badge-enter mini-tooltip inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium border transition-all duration-150 bg-muted text-muted-foreground border-border" data-tooltip={`${codeStats.comments} comment line(s)`} style={{ animationDelay: '160ms' }}>
                      # {codeStats.comments} comments
                    </span>
                    {/* Feature 19: Complexity Score Bar */}
                    <span className="stats-badge-enter mini-tooltip inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-medium border transition-all duration-150 bg-muted/50 text-muted-foreground border-border" data-tooltip={`Complexity score: functions×3 + classes×5 + imports×1 + lines/50 + comments×0.5`} style={{ animationDelay: '200ms' }}>
                      <span className="complexity-bar relative h-2 w-16 rounded-full bg-muted overflow-hidden">
                        <span
                          className="complexity-fill absolute inset-y-0 left-0 rounded-full"
                          style={{
                            width: `${Math.min(
                              Math.round(
                                codeStats.functions * 3 + codeStats.classes * 5 + codeStats.imports * 1 + lineCount / 50 + codeStats.comments * 0.5
                              ),
                              100
                            )}%`,
                            background:
                              Math.round(codeStats.functions * 3 + codeStats.classes * 5 + codeStats.imports * 1 + lineCount / 50 + codeStats.comments * 0.5) <= 30
                                ? 'linear-gradient(90deg, #10b981, #34d399)'
                                : Math.round(codeStats.functions * 3 + codeStats.classes * 5 + codeStats.imports * 1 + lineCount / 50 + codeStats.comments * 0.5) <= 60
                                  ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                                  : 'linear-gradient(90deg, #ef4444, #f87171)',
                          }}
                        />
                      </span>
                      <span className="font-mono">
                        {Math.min(
                          Math.round(
                            codeStats.functions * 3 + codeStats.classes * 5 + codeStats.imports * 1 + lineCount / 50 + codeStats.comments * 0.5
                          ),
                          100
                        )}
                      </span>
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {editing ? (
          <Textarea
            value={editContent}
            onChange={e => onEditContentChange(e.target.value)}
            className="min-h-[320px] font-mono text-[11px] leading-5 bg-muted/30 rounded-lg border resize-y"
            autoFocus
          />
        ) : (
          <div className={`relative rounded-lg border bg-muted/30 overflow-hidden transition-shadow duration-150 ${
            codeShadow === 'top' ? 'scroll-shadow-top'
            : codeShadow === 'bottom' ? 'scroll-shadow-bottom'
            : codeShadow === 'both' ? 'scroll-shadow-both'
            : ''
          }`}>
            <ScrollArea className="max-h-64" ref={codeScrollRef}>
              <pre className="text-[11px] font-mono p-4 leading-6">
                {codeLines.map((line: string, i: number) => {
                  const isMatch = codeSearch.trim() ? line.toLowerCase().includes(codeSearch.toLowerCase()) : false;
                  const matchLineIdx = matchData.lineIndices.indexOf(i);
                  const isActiveMatch = matchLineIdx === activeMatchIdx;
                  const isHovered = hoveredLine === i;
                  return (
                    <div
                      key={i}
                      id={isMatch ? `code-match-${matchLineIdx}` : undefined}
                      className={`flex code-line-highlight -mx-4 px-4 rounded-sm ${isActiveMatch ? 'bg-emerald-100/60 dark:bg-emerald-900/30' : ''} ${isHovered && !isActiveMatch ? 'code-line-highlight-active' : ''}`}
                      onMouseEnter={() => setHoveredLine(i)}
                      onMouseLeave={() => setHoveredLine(null)}
                    >
                      {/* Feature 3: Line number gutter (toggleable) */}
                      {showLineNumbers && (
                        <span
                          className="select-none text-emerald-600/60 dark:text-emerald-400/50 shrink-0 text-right pr-4 tabular-nums"
                          style={{ width: `${lineNumWidth + 1}ch`, minWidth: '2.5ch' }}
                        >
                          {i + 1}
                        </span>
                      )}
                      <span className="text-foreground/90">
                        {isMatch ? highlightLine(line, codeSearch, isActiveMatch) : line}
                      </span>
                    </div>
                  );
                })}
              </pre>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Result panel */}
      {result && (
        <div ref={resultRef} className="mt-3 rounded-lg border overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
            <Badge variant="secondary" className={`text-[10px] ${
              result.status === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : result.status === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            }`}>
              {result.status === 'success' ? '✓ Success' : result.status === 'error' ? '✗ Error' : result.status}
            </Badge>
            {result.exitCode !== undefined && (
              <Badge variant="outline" className="text-[9px] h-4 gap-0.5">
                Exit: {result.exitCode}
              </Badge>
            )}
            {result.duration !== undefined && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="size-2.5" />{result.duration >= 1000 ? `${(result.duration / 1000).toFixed(2)}s` : `${result.duration}ms`}
              </span>
            )}
            {result.timestamp && (
              <span className="text-[9px] text-muted-foreground/60 hidden sm:inline">
                {new Date(result.timestamp).toLocaleTimeString()}
              </span>
            )}
            <div className="flex-1" />
            {/* Typing speed control */}
            {result.output && (
              <div className="flex items-center gap-0.5">
                <Gauge className="size-2.5 text-muted-foreground/50 mr-0.5" />
                {(['1x', '2x', '5x', 'instant'] as TypingSpeed[]).map(speed => (
                  <button
                    key={speed}
                    type="button"
                    className={`text-[8px] px-1 py-0.5 rounded transition-colors ${
                      typingSpeed === speed
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted'
                    }`}
                    onClick={() => handleSpeedChange(speed)}
                  >
                    {speed === 'instant' ? '∞' : speed}
                  </button>
                ))}
              </div>
            )}
            {/* Word wrap toggle */}
            {result.output && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setWordWrap(v => !v)}
                    className={wordWrap ? 'text-emerald-500' : ''}
                  >
                    <WrapText className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{wordWrap ? 'No wrap' : 'Word wrap'}</TooltipContent>
              </Tooltip>
            )}
            {/* Raw output toggle */}
            {result.output && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={onToggleRawOutput}
                    className={rawOutput ? 'text-emerald-500' : ''}
                  >
                    <Terminal className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{rawOutput ? 'Highlighted output' : 'Raw output'}</TooltipContent>
              </Tooltip>
            )}
            {result.output && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-xs" onClick={onFullscreenOutput}>
                    <Maximize2 className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Fullscreen output</TooltipContent>
              </Tooltip>
            )}
            {result.output && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-xs" onClick={onCopyOutput}>
                    {outputCopied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{outputCopied ? 'Copied!' : 'Copy output'}</TooltipContent>
              </Tooltip>
            )}
          </div>
          {result.output && (
            <div className="bg-gray-950 dark:bg-gray-900 overflow-y-auto max-h-80" style={{ minHeight: '60px' }}>
                <pre className={`text-[11px] font-mono p-4 leading-5 text-green-400 ${wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'}`}>
                  {rawOutput ? (visibleOutput || fullOutput) : parseAnsiToSpans(visibleOutput || fullOutput)}
                  {isTyping && (
                    <span className="inline-block size-[7px] bg-green-400 ml-0.5 align-middle animate-[blink_1s_step-end_infinite]" />
                  )}
                </pre>
              {/* Expand/collapse for long output */}
              {isLongOutput && fullOutput && (
                <div className="border-t border-gray-800 px-3 py-1.5 flex items-center justify-between bg-gray-900/50">
                  <span className="text-[9px] text-gray-500">
                    {outputExpanded ? `${outputLines.length} lines (expanded)` : `Showing 100 of ${outputLines.length} lines`}
                  </span>
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-[9px] text-gray-400 hover:text-gray-200 gap-1 h-5"
                    onClick={() => setOutputExpanded(v => !v)}
                  >
                    {outputExpanded ? (
                      <><ChevronUp className="size-2.5" />Collapse</>
                    ) : (
                      <><ChevronDown className="size-2.5" />Show all</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
          {result.error && (
            <div className="border-t bg-red-950/30 dark:bg-red-950/50 overflow-y-auto max-h-64" style={{ minHeight: '40px' }}>
                <pre className={`text-[11px] font-mono p-4 leading-5 text-red-400 ${wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'}`}>
                  {rawOutput ? result.error : parseAnsiToSpans(result.error)}
                </pre>
            </div>
          )}
        </div>
      )}

      {/* ─── Word Frequency Cloud ──────────── */}
      {mounted && !editing && wordFreqCloudData && (
            <div className="mt-3 word-cloud-enter">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  <BarChart3 className="size-3 text-emerald-500" />Top Keywords
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {wordFreqCloudData.sorted.map(([word, count], i) => {
                  const { maxFreq } = wordFreqCloudData;
                  const sizeScale = 9 + (count / maxFreq) * 4;
                  const opacity = 0.4 + (count / maxFreq) * 0.6;
                  return (
                    <span
                      key={word}
                      className={`word-cloud-item word-cloud-enter inline-flex items-center px-2 py-0.5 rounded-full font-medium border bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800`}
                      style={{ fontSize: `${sizeScale}px`, animationDelay: `${i * 30}ms`, opacity }}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

      {/* ─── Script Dependencies ──────────── */}
      {mounted && !editing && script.content && (
        <div className="mt-3 dep-group-enter">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
              <Code className="size-3 text-emerald-500" />Dependencies
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {(() => {
              const stdlib = new Set(['os', 'sys', 're', 'json', 'math', 'time', 'datetime', 'collections', 'itertools', 'functools', 'pathlib', 'subprocess', 'typing', 'argparse', 'copy', 'io', 'csv', 'xml', 'html', 'http', 'urllib', 'socket', 'threading', 'multiprocessing', 'logging', 'hashlib', 'random', 'string', 'struct', 'array', 'deque', 'counter', 'defaultdict', 'abc', 'dataclasses', 'enum', 'contextlib', 'tempfile', 'shutil', 'glob', 'fnmatch', 'operator', 'textwrap', 'zipfile', 'tarfile', 'configparser', 'unittest', 'pdb', 'profile', 'traceback', 'warnings', 'weakref', 'pprint', 'fractions', 'decimal', 'statistics']);
              const importRegex = /(?:^|\n)\s*(?:from\s+([\w.]+)|import\s+([\w.,\s]+))/g;
              const found: { name: string; type: 'stdlib' | 'third-party' | 'local' }[] = [];
              const seen = new Set<string>();
              let match;
              while ((match = importRegex.exec(script.content)) !== null) {
                const modName = (match[1] || match[2] || '').split(',')[0].trim().split('.')[0].split(' ').pop() || '';
                if (!modName || seen.has(modName) || modName === script.filename.replace('.py', '')) continue;
                seen.add(modName);
                found.push({
                  name: modName,
                  type: stdlib.has(modName) ? 'stdlib' : modName.startsWith('chimerax') || modName.startsWith('pymol') ? 'local' : 'third-party',
                });
              }
              return found.length > 0 ? found.map((dep, i) => (
                <span
                  key={dep.name}
                  className={`dep-badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium border transition-all duration-150 ${
                    dep.type === 'stdlib'
                      ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-800'
                      : dep.type === 'third-party'
                      ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
                  }`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <span className={`size-1.5 rounded-full ${dep.type === 'stdlib' ? 'bg-sky-500' : dep.type === 'third-party' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  {dep.name}
                </span>
              )) : (
                <span className="text-[9px] text-muted-foreground/50 italic">No imports detected</span>
              );
            })()}
          </div>
        </div>
      )}

      {!result && !executing && (
        <div className="mt-3 rounded-lg border border-dashed p-6 text-center">
          <Terminal className="size-8 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">Run your script to see results</p>
        </div>
      )}

      {executing && (
        <div className="mt-3 rounded-lg border p-4 flex items-center gap-3">
          {/* Pulsing dot */}
          <span className="relative flex size-5">
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
            <span className="relative size-5 rounded-full bg-emerald-500" />
          </span>
          <div>
            <p className="text-xs font-medium">Executing...</p>
            <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
              <Timer className="size-2.5" />{formatTimer(elapsedTime)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
