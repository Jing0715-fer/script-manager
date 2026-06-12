'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, File as FileIcon, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface UploadedFile {
  id: string;
  name: string;          // stored name on server
  originalName: string;  // user-facing filename
  size: number;
  type: string;
  url: string;
}

interface FileDropInputProps {
  label: string;
  value: string;            // stored file name (or path string)
  onChange: (value: string) => void;
  required?: boolean;
  description?: string;
  accept?: string;
  className?: string;
}

/**
 * File / path input with drag-and-drop support. On drop or pick, the file
 * is uploaded to /api/files/upload and the stored name is used as the value.
 * A free-text fallback is preserved so users can also type a server-side
 * path directly (matching the prior `path` type behavior).
 */
export function FileDropInput({
  label,
  value,
  onChange,
  required,
  description,
  accept,
  className,
}: FileDropInputProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedInfo, setUploadedInfo] = useState<{ name: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    setError(null);
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/files/upload', { method: 'POST', body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `upload failed (${res.status})`);
      }
      const data = await res.json();
      onChange(data.name);
      setUploadedInfo({ name: data.originalName, size: data.size });
    } catch (e: any) {
      setError(e?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [onChange]);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await uploadFile(file);
  }, [uploadFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handlePick = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadFile(file);
  }, [uploadFile]);

  const handleClear = useCallback(() => {
    onChange('');
    setUploadedInfo(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }, [onChange]);

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-sm">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>

      {/* Drag-and-drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'group flex items-center gap-2 rounded-md border border-dashed px-3 py-2 cursor-pointer transition-colors',
          isDragging
            ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30'
            : 'border-muted-foreground/30 hover:border-teal-400 hover:bg-muted/30',
          isUploading && 'pointer-events-none opacity-60'
        )}
      >
        {isUploading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground shrink-0" />
        ) : uploadedInfo ? (
          <FileIcon className="size-4 text-teal-600 dark:text-teal-400 shrink-0" />
        ) : (
          <Upload className="size-4 text-muted-foreground shrink-0" />
        )}
        <div className="flex-1 min-w-0 text-xs">
          {isUploading ? (
            <span className="text-muted-foreground">Uploading…</span>
          ) : uploadedInfo ? (
            <span className="text-foreground truncate flex items-center gap-1.5">
              <span className="font-medium truncate">{uploadedInfo.name}</span>
              <span className="text-muted-foreground shrink-0">
                ({(uploadedInfo.size / 1024).toFixed(1)} KB)
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">
              Drop a file here, or <span className="text-teal-600 dark:text-teal-400 underline underline-offset-2">browse</span>
            </span>
          )}
        </div>
        {uploadedInfo && !isUploading && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={(e) => { e.stopPropagation(); handleClear(); }}
            className="shrink-0"
            aria-label="Clear file"
          >
            <X className="size-3" />
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handlePick}
          accept={accept}
        />
      </div>

      {/* Manual path fallback — also shows the stored server name when set */}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="/path/to/file  (or drag a file above)"
        className="text-xs font-mono"
      />

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
      {description && !error && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
