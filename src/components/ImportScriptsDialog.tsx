'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Upload,
  FileJson,
  FileCode2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useScriptStore } from '@/store/script-store'
import { CATEGORY_COLORS } from '@/types'
import type { Script } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ImportScriptsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface PreviewScript {
  name: string
  description: string
  code: string
  language: string
  category: string
  tags: string[]
  params: Script['params']
  source: string
}

type ImportMode = 'merge' | 'replace'

type ImportStep = 'upload' | 'preview' | 'importing' | 'done'

export default function ImportScriptsDialog({
  open,
  onOpenChange,
}: ImportScriptsDialogProps) {
  const { createScript, loadScripts, scripts, deleteScript } = useScriptStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<ImportStep>('upload')
  const [previewScripts, setPreviewScripts] = useState<PreviewScript[]>([])
  const [importMode, setImportMode] = useState<ImportMode>('merge')
  const [importProgress, setImportProgress] = useState(0)
  const [importedCount, setImportedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const resetState = useCallback(() => {
    setStep('upload')
    setPreviewScripts([])
    setImportMode('merge')
    setImportProgress(0)
    setImportedCount(0)
    setError(null)
    setIsDragging(false)
  }, [])

  const handleClose = (open: boolean) => {
    if (!open) {
      onOpenChange(false)
      // Reset after dialog animation
      setTimeout(resetState, 200)
    }
  }

  const parseFile = useCallback(
    async (file: File) => {
      setError(null)

      const ext = file.name.split('.').pop()?.toLowerCase()

      // Handle ScriptHub JSON export format
      if (ext === 'json') {
        try {
          const text = await file.text()
          const data = JSON.parse(text)

          // Validate ScriptHub export format
          if (data.scripts && Array.isArray(data.scripts)) {
            const validScripts: PreviewScript[] = []
            const errors: string[] = []

            for (let i = 0; i < data.scripts.length; i++) {
              const s = data.scripts[i]
              if (!s.name || !s.code) {
                errors.push(`Script #${i + 1}: missing name or code`)
                continue
              }
              validScripts.push({
                name: s.name || 'Untitled',
                description: s.description || '',
                code: s.code,
                language: s.language || 'python',
                category: s.category || 'General',
                tags: Array.isArray(s.tags) ? s.tags : [],
                params: Array.isArray(s.params) ? s.params : [],
                source: s.source || 'import',
              })
            }

            if (validScripts.length === 0) {
              setError(
                errors.length > 0
                  ? `No valid scripts found. ${errors.join('; ')}`
                  : 'No scripts found in the JSON file.'
              )
              return
            }

            setPreviewScripts(validScripts)
            setStep('preview')
          } else {
            setError(
              'Invalid ScriptHub JSON format. Expected { exportedAt, version, scripts: [...] }'
            )
          }
        } catch {
          setError('Failed to parse JSON file. Please check the file format.')
        }
        return
      }

      // Handle raw .py or .cxc script files
      if (ext === 'py' || ext === 'cxc') {
        try {
          const code = await file.text()
          const name = file.name.replace(/\.(py|cxc)$/, '')
          const language = ext === 'py' ? 'python' : 'chimerax'
          const category = ext === 'cxc' ? 'ChimeraX' : 'General'

          setPreviewScripts([
            {
              name,
              description: `Imported from ${file.name}`,
              code,
              language,
              category,
              tags: [],
              params: [],
              source: 'import',
            },
          ])
          setStep('preview')
        } catch {
          setError('Failed to read script file.')
        }
        return
      }

      setError('Unsupported file type. Please use .json, .py, or .cxc files.')
    },
    []
  )

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return
      // Process first file only for now
      void parseFile(files[0])
    },
    [parseFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      handleFileSelect(e.dataTransfer.files)
    },
    [handleFileSelect]
  )

  const handleImport = useCallback(async () => {
    if (previewScripts.length === 0) return

    setStep('importing')
    setImportProgress(0)

    try {
      // If replace mode, delete all existing scripts first
      if (importMode === 'replace') {
        const existingScripts = [...scripts]
        for (let i = 0; i < existingScripts.length; i++) {
          await deleteScript(existingScripts[i].id)
        }
      }

      // Import scripts one by one
      let count = 0
      for (let i = 0; i < previewScripts.length; i++) {
        const s = previewScripts[i]

        if (importMode === 'merge') {
          // In merge mode, skip scripts with duplicate names
          const exists = scripts.some(
            (existing) => existing.name === s.name
          )
          if (exists) {
            setImportProgress(Math.round(((i + 1) / previewScripts.length) * 100))
            continue
          }
        }

        await createScript({
          name: s.name,
          description: s.description,
          code: s.code,
          language: s.language,
          category: s.category,
          tags: s.tags,
          params: s.params,
          source: s.source,
        })
        count++
        setImportProgress(
          Math.round(((i + 1) / previewScripts.length) * 100)
        )
        setImportedCount(count)
      }

      await loadScripts()
      setStep('done')
      toast.success(
        `Successfully imported ${count} script${count !== 1 ? 's' : ''}`
      )
    } catch {
      setError('Import failed. Some scripts may not have been imported.')
      setStep('preview')
    }
  }, [
    previewScripts,
    importMode,
    scripts,
    deleteScript,
    createScript,
    loadScripts,
  ])

  const getCategoryStyle = (category: string) => {
    const colors = CATEGORY_COLORS[category]
    return colors
      ? `${colors.bg} ${colors.text} ${colors.border}`
      : 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
  }

  const getLanguageBadgeStyle = (lang: string) => {
    switch (lang.toLowerCase()) {
      case 'python':
      case 'pymol':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700'
      case 'chimerax':
        return 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700'
      default:
        return 'bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
    }
  }

  // Count duplicates for merge mode
  const duplicateCount =
    importMode === 'merge'
      ? previewScripts.filter((ps) =>
          scripts.some((s) => s.name === ps.name)
        ).length
      : 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-5 text-teal-600 dark:text-teal-400" />
            Import Scripts
          </DialogTitle>
          <DialogDescription>
            Import scripts from a ScriptHub JSON export or raw script files
          </DialogDescription>
        </DialogHeader>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="flex-1 flex flex-col gap-4 py-2">
            {/* Drag & Drop Zone */}
            <div
              className={cn(
                'relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all duration-200 cursor-pointer',
                isDragging
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 scale-[1.02]'
                  : 'border-muted-foreground/25 hover:border-teal-400 dark:hover:border-teal-600 hover:bg-muted/50'
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Upload file area"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  fileInputRef.current?.click()
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.py,.cxc"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
              <div
                className={cn(
                  'flex items-center justify-center size-12 rounded-full transition-colors',
                  isDragging
                    ? 'bg-teal-100 dark:bg-teal-800'
                    : 'bg-muted'
                )}
              >
                <Upload
                  className={cn(
                    'size-6 transition-colors',
                    isDragging
                      ? 'text-teal-600 dark:text-teal-400'
                      : 'text-muted-foreground'
                  )}
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">
                  {isDragging
                    ? 'Drop your file here'
                    : 'Drag & drop a file here, or click to select'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports .json (ScriptHub export), .py (Python), .cxc (ChimeraX)
                </p>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Supported formats info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-2.5 p-3 rounded-lg border bg-muted/30">
                <FileJson className="size-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium">ScriptHub Export</p>
                  <p className="text-[11px] text-muted-foreground">
                    JSON with scripts array
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-lg border bg-muted/30">
                <FileCode2 className="size-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium">Raw Scripts</p>
                  <p className="text-[11px] text-muted-foreground">
                    .py or .cxc files
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <div className="flex-1 flex flex-col gap-4 py-2 min-h-0">
            {/* Import mode selection */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Mode:</span>
              <div className="flex gap-2">
                <Button
                  variant={importMode === 'merge' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setImportMode('merge')}
                  className={cn(
                    'gap-1.5',
                    importMode === 'merge' &&
                      'bg-teal-600 hover:bg-teal-700 text-white'
                  )}
                >
                  <FileCode2 className="size-3.5" />
                  Merge
                </Button>
                <Button
                  variant={importMode === 'replace' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setImportMode('replace')}
                  className={cn(
                    'gap-1.5',
                    importMode === 'replace' &&
                      'bg-destructive hover:bg-destructive/90 text-white'
                  )}
                >
                  <AlertCircle className="size-3.5" />
                  Replace All
                </Button>
              </div>
            </div>

            {/* Info banner */}
            <div
              className={cn(
                'flex items-start gap-2 p-3 rounded-lg text-sm',
                importMode === 'replace'
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300'
              )}
            >
              {importMode === 'replace' ? (
                <>
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>
                    Replace All will delete all existing scripts before importing.
                    This cannot be undone.
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                  <span>
                    Merge will add new scripts without overwriting existing ones.
                    {duplicateCount > 0 &&
                      ` ${duplicateCount} duplicate script${duplicateCount !== 1 ? 's' : ''} will be skipped.`}
                  </span>
                </>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Preview list */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {previewScripts.length} script{previewScripts.length !== 1 ? 's' : ''} to import
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetState}
                className="gap-1 text-xs"
              >
                <X className="size-3" />
                Choose different file
              </Button>
            </div>

            <ScrollArea className="max-h-64 flex-1 rounded-lg border">
              <div className="divide-y">
                {previewScripts.map((script, index) => {
                  const isDuplicate = scripts.some(
                    (s) => s.name === script.name
                  )
                  return (
                    <div
                      key={`preview-${index}`}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5',
                        isDuplicate && importMode === 'merge'
                          ? 'opacity-50'
                          : ''
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {script.name}
                          </span>
                          {isDuplicate && importMode === 'merge' && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4 px-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                            >
                              duplicate
                            </Badge>
                          )}
                        </div>
                        {script.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {script.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] h-5 px-1.5',
                            getLanguageBadgeStyle(script.language)
                          )}
                        >
                          {script.language}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] h-5 px-1.5',
                            getCategoryStyle(script.category)
                          )}
                        >
                          {script.category}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Step: Importing */}
        {step === 'importing' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
            <Loader2 className="size-10 animate-spin text-teal-600 dark:text-teal-400" />
            <div className="text-center">
              <p className="text-sm font-medium">Importing scripts...</p>
              <p className="text-xs text-muted-foreground mt-1">
                {importedCount} of {previewScripts.length} imported
              </p>
            </div>
            <Progress value={importProgress} className="w-3/4 h-2" />
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
            <div className="flex items-center justify-center size-14 rounded-full bg-teal-100 dark:bg-teal-900/30">
              <CheckCircle2 className="size-8 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Import complete!</p>
              <p className="text-xs text-muted-foreground mt-1">
                Successfully imported {importedCount} script{importedCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'upload' && (
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
            >
              Cancel
            </Button>
          )}
          {step === 'preview' && (
            <>
              <Button
                variant="outline"
                onClick={resetState}
              >
                Back
              </Button>
              <Button
                onClick={handleImport}
                className={cn(
                  'gap-1.5',
                  importMode === 'replace'
                    ? 'bg-destructive hover:bg-destructive/90 text-white'
                    : 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white'
                )}
              >
                {importMode === 'replace' ? (
                  <>
                    <AlertCircle className="size-4" />
                    Replace & Import
                  </>
                ) : (
                  <>
                    <Upload className="size-4" />
                    Import ({previewScripts.length - duplicateCount})
                  </>
                )}
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button
              onClick={() => handleClose(false)}
              className="gap-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
            >
              <CheckCircle2 className="size-4" />
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
