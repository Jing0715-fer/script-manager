'use client';

import React, { useRef, useState } from 'react';
import {
  Upload, FileText, FileOutput, FileInput, Check, Clock, X,
  Info, Terminal, Zap, Trash2, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { TabEmptyState } from './shared';

interface FilesTabProps {
  inputFiles: Record<string, string>;
  onInputFilesChange: (files: Record<string, string>) => void;
  parsedInputFiles: Array<{ name: string; format: string; description?: string }>;
  parsedOutputFiles: Array<{ name: string; format: string; description?: string }>;
  dragOver: boolean;
  onDragOverChange: (v: boolean) => void;
  language?: string;
  scriptContent?: string;
}

export function FilesTab({
  inputFiles, onInputFilesChange,
  parsedInputFiles, parsedOutputFiles,
  dragOver, onDragOverChange,
  language = 'python',
  scriptContent = '',
}: FilesTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  const handleFileUpload = (file: File, name?: string) => {
    const uploadName = name || file.name;
    setUploading(uploadName);
    const fd = new FormData();
    fd.append('file', file);
    fetch('/api/files/upload', { method: 'POST', body: fd })
      .then(r => { if (!r.ok) throw new Error('Upload failed'); return r.json(); })
      .then(d => {
        onInputFilesChange({ ...inputFiles, [uploadName]: d.storedName });
        toast.success(`Uploaded: ${file.name}`);
      })
      .catch(() => toast.error(`Failed to upload: ${file.name}`))
      .finally(() => setUploading(null));
  };

  const removeFile = (name: string) => {
    const next = { ...inputFiles };
    delete next[name];
    onInputFilesChange(next);
    toast.success(`Removed: ${name}`);
  };

  // Parse script to detect expected argument count
  const argvMatches = scriptContent.match(/sys\.argv\[(\d+)\]/g) || [];
  const maxArgIndex = argvMatches.length > 0
    ? Math.max(...argvMatches.map(m => parseInt(m.match(/\d+/)?.[0] || '0')))
    : 0;
  const hasArgparse = /argparse\.(ArgumentParser|add_argument)/.test(scriptContent);

  // Build preview of what args will be passed
  const argPreview = (() => {
    const parts: string[] = [];
    if (hasArgparse) {
      parts.push('python3');
      parts.push('script.py');
      Object.entries(inputFiles).forEach(([name]) => parts.push(name));
      parts.push('[...params as --key value]');
    } else if (maxArgIndex > 0) {
      parts.push('python3');
      parts.push('script.py');
      const fileEntries = Object.entries(inputFiles);
      for (let i = 1; i <= maxArgIndex; i++) {
        if (i - 1 < fileEntries.length) {
          parts.push(fileEntries[i - 1][0]);
        } else {
          parts.push(`<arg${i}>`);
        }
      }
    } else if (Object.keys(inputFiles).length > 0) {
      parts.push('python3');
      parts.push('script.py');
      parts.push('params.json');
    }
    return parts;
  })();

  const runtimeLabel = language === 'chimerax' ? 'UCSF ChimeraX'
    : language === 'pymol' ? 'PyMOL'
    : 'Python 3';
  const runtimeColor = language === 'chimerax' ? 'text-purple-600 dark:text-purple-400'
    : language === 'pymol' ? 'text-blue-600 dark:text-blue-400'
    : 'text-emerald-600 dark:text-emerald-400';
  const canExecute = language === 'python' || language === 'shell' || language === 'bash'
    || language === 'node' || language === 'javascript';

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-4">
      <div className="mt-3 space-y-3">

        {/* Script Info / Dependency card */}
        <div className="dep-info-enter rounded-lg border bg-gradient-to-br from-blue-50/50 via-background to-emerald-50/30 dark:from-blue-950/20 dark:via-background dark:to-emerald-950/20 p-3 space-y-2">
          <h4 className="text-xs font-semibold flex items-center gap-1.5">
            <Info className="size-3 text-blue-500" />Script Info
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 text-[10px]">
              <Badge variant="outline" className="text-[9px] shrink-0">Runtime</Badge>
              <span className={`font-medium ${runtimeColor}`}>{runtimeLabel}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <Badge variant="outline" className="text-[9px] shrink-0">Executable</Badge>
              <span className={canExecute ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                {canExecute ? '\u2713 Browser' : '\u26A0 Local only'}
              </span>
            </div>
            {maxArgIndex > 0 && (
              <div className="col-span-2 flex items-center gap-2 text-[10px]">
                <Badge variant="outline" className="text-[9px] shrink-0">Args</Badge>
                <span className="text-muted-foreground">
                  {maxArgIndex} positional (sys.argv[1..{maxArgIndex}])
                </span>
              </div>
            )}
            {hasArgparse && (
              <div className="col-span-2 flex items-center gap-2 text-[10px]">
                <Badge variant="outline" className="text-[9px] shrink-0">Args</Badge>
                <span className="text-muted-foreground">argparse (--key value format)</span>
              </div>
            )}
          </div>
        </div>

        {/* Drag and drop upload area */}
        <div
          className={`rounded-lg border-2 border-dashed p-6 text-center transition-all duration-200 cursor-pointer ${
            dragOver
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[1.02] shadow-md shadow-emerald-500/10 drag-elevated'
              : 'border-muted-foreground/20 hover:border-emerald-500/50 hover:bg-muted/30'
          }`}
          onDragOver={e => { e.preventDefault(); onDragOverChange(true); }}
          onDragLeave={() => onDragOverChange(false)}
          onDrop={e => {
            e.preventDefault();
            onDragOverChange(false);
            const files = Array.from(e.dataTransfer.files);
            files.forEach(file => handleFileUpload(file));
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className={`relative ${uploading ? 'upload-shimmer' : ''}`}>
            <Upload className={`size-8 mx-auto mb-2 transition-colors ${dragOver ? 'text-emerald-500' : uploading ? 'text-emerald-400 animate-pulse' : 'text-muted-foreground/30'}`} />
          </div>
          <p className={`text-xs font-medium ${dragOver ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
            {uploading ? `Uploading ${uploading}...` : dragOver ? 'Drop file here' : 'Drop files here or click to upload'}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Supports any file format</p>
          <input ref={fileInputRef} type="file" className="hidden" />
        </div>

        {/* Uploaded files list */}
        {Object.keys(inputFiles).length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold flex items-center gap-1.5">
              <FileInput className="size-3 text-emerald-500" />
              Uploaded Files
              <Badge variant="secondary" className="text-[9px] ml-auto">{Object.keys(inputFiles).length}</Badge>
            </h4>
            {Object.entries(inputFiles).map(([name, path], idx) => (
              <div
                key={name}
                className="file-item-enter flex items-center gap-1.5 rounded-lg border bg-muted/20 px-2.5 py-2 group hover:bg-muted/40 transition-colors"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <FileText className="size-3 text-emerald-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-medium block truncate">{name}</span>
                  <span className="text-[9px] text-muted-foreground font-mono block truncate">{path}</span>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={() => removeFile(name)}
                    >
                      <Trash2 className="size-2.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Remove file</TooltipContent>
                </Tooltip>
                <Check className="size-3 text-emerald-500 shrink-0" />
              </div>
            ))}
          </div>
        )}

        {/* Argument preview */}
        {argPreview.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold flex items-center gap-1.5">
              <Terminal className="size-3 text-purple-500" />
              Execution Preview
            </h4>
            <div className="arg-preview rounded-lg border bg-gray-950 dark:bg-gray-900 px-3 py-2 overflow-x-auto">
              <code className="text-[10px] font-mono text-emerald-400 whitespace-nowrap flex items-center gap-1">
                <Zap className="size-2.5 text-amber-400 shrink-0" />
                {argPreview.map((part, i) => (
                  <span key={i}>
                    {i > 0 && <ArrowRight className="size-2 text-gray-600 mx-0.5 inline" />}
                    <span className={part.startsWith('<') ? 'text-gray-500 italic' : part.startsWith('[') ? 'text-gray-400 italic' : ''}>
                      {part}
                    </span>
                  </span>
                ))}
              </code>
            </div>
          </div>
        )}

        {/* Parsed input file slots */}
        {parsedInputFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold flex items-center gap-1.5"><FileInput className="size-3 text-sky-500" />Required Inputs</h4>
            {parsedInputFiles.map((f) => (
              <div key={f.name} className="rounded-lg border p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">{f.name}</Label>
                  <Badge variant="outline" className="text-[9px]">.{f.format}</Badge>
                </div>
                {f.description && <p className="text-[10px] text-muted-foreground">{f.description}</p>}
                <Input
                  type="file"
                  className="h-7 text-xs"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, f.name);
                  }}
                />
                {inputFiles[f.name] && (
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                    <Check className="size-3" />Uploaded: {inputFiles[f.name]}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Output files info */}
        {parsedOutputFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold flex items-center gap-1.5"><FileOutput className="size-3 text-amber-500" />Expected Outputs</h4>
            {parsedOutputFiles.map((f) => (
              <div key={f.name} className="rounded-lg border p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium">{f.name}</span>
                  {f.description && <p className="text-[10px] text-muted-foreground">{f.description}</p>}
                </div>
                <Badge variant="outline" className="text-[9px]">.{f.format}</Badge>
              </div>
            ))}
          </div>
        )}

        {parsedInputFiles.length === 0 && parsedOutputFiles.length === 0 && Object.keys(inputFiles).length === 0 && (
          <TabEmptyState
            icon={<FileText className="size-10 text-muted-foreground/20" />}
            title="No file I/O"
            description="This script doesn't use file inputs or outputs."
          />
        )}
      </div>
    </div>
  );
}
