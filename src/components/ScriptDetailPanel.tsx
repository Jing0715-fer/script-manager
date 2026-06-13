'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Copy,
  Play,
  Star,
  Pin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  ExternalLink,
  Loader2,
  Pencil,
  Files,
  FileCode2,
  Code2,
  FileText,
  Package,
  Info,
} from 'lucide-react'
import CodeHighlighter from '@/components/CodeHighlighter'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { FileDropInput } from '@/components/ui/file-drop-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useIsMobile } from '@/hooks/use-mobile'
import { useScriptStore } from '@/store/script-store'
import { CATEGORY_COLORS, APP_TYPE_INFO } from '@/types'
import type { ScriptParam, ExecutionLog } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

function ParamField({
  param,
  value,
  onChange,
}: {
  param: ScriptParam
  value: unknown
  onChange: (value: unknown) => void
}) {
  switch (param.type) {
    case 'string':
      return (
        <div className="space-y-1.5">
          <Label className="text-sm">
            {param.label}
            {param.required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
          <Input
            value={(value as string) || param.default as string || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={param.placeholder}
          />
          {param.description && (
            <p className="text-xs text-muted-foreground">{param.description}</p>
          )}
        </div>
      )
    case 'number':
      return (
        <div className="space-y-1.5">
          <Label className="text-sm">
            {param.label}
            {param.required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
          <Input
            type="number"
            value={(value as number) || param.default as number || ''}
            onChange={(e) => onChange(Number(e.target.value))}
            placeholder={param.placeholder}
          />
          {param.description && (
            <p className="text-xs text-muted-foreground">{param.description}</p>
          )}
        </div>
      )
    case 'boolean':
      return (
        <div className="flex items-center justify-between py-1">
          <div>
            <Label className="text-sm">{param.label}</Label>
            {param.description && (
              <p className="text-xs text-muted-foreground">{param.description}</p>
            )}
          </div>
          <Switch
            checked={(value as boolean) ?? (param.default as boolean) ?? false}
            onCheckedChange={onChange}
          />
        </div>
      )
    case 'select':
      return (
        <div className="space-y-1.5">
          <Label className="text-sm">
            {param.label}
            {param.required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
          <Select
            value={(value as string) || (param.default as string) || ''}
            onValueChange={onChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={param.placeholder || 'Select...'} />
            </SelectTrigger>
            <SelectContent>
              {param.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {param.description && (
            <p className="text-xs text-muted-foreground">{param.description}</p>
          )}
        </div>
      )
    case 'file':
      return (
        <FileDropInput
          label={param.label}
          value={(value as string) || (param.default as string) || ''}
          onChange={onChange}
          required={param.required}
          description={param.description}
          accept=".pdb,.mrc,.cif,.mmcif,.map,.mtz,.csv,.json,.txt,.xlsx,.xls,.fa,.fasta,.docx,.pdf"
        />
      )
    case 'path':
      return (
        <FileDropInput
          label={param.label}
          value={(value as string) || (param.default as string) || ''}
          onChange={onChange}
          required={param.required}
          description={param.description}
        />
      )
    default:
      return null
  }
}

function StatusIcon({ status }: { status: ExecutionLog['status'] }) {
  switch (status) {
    case 'success':
      return <CheckCircle2 className="size-4 text-emerald-500" />
    case 'error':
      return <XCircle className="size-4 text-destructive" />
    case 'running':
      return <Loader2 className="size-4 text-teal-500 animate-spin" />
    case 'pending':
      return <Clock className="size-4 text-muted-foreground" />
    case 'timeout':
      return <AlertCircle className="size-4 text-amber-500" />
    default:
      return null
  }
}

export default function ScriptDetailPanel() {
  const isMobile = useIsMobile()
  const {
    selectedScript,
    detailPanelOpen,
    setDetailPanelOpen,
    selectScript,
    toggleFavorite,
    togglePinned,
    executeScript,
    isExecuting,
    executionOutput,
    executionError,
    loadExecutions,
    executionLogs,
    externalApps,
    loadExternalApps,
    createScript,
    loadScripts,
    updateScript,
  } = useScriptStore()

  const [paramValues, setParamValues] = useState<Record<string, unknown>>({})
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  // Name editing state
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [savingName, setSavingName] = useState(false)

  // Description editing state
  const [editingDescription, setEditingDescription] = useState(false)
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [savingDescription, setSavingDescription] = useState(false)
  const [versionHistory, setVersionHistory] = useState<Array<{ id: string; version: number; code: string; message: string; createdAt: string }>>([])
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)

  // Reset paramValues when selectedScript changes (React recommended pattern)
  // Using useState to track previous id so setState only runs when id actually changes
  const [prevScriptId, setPrevScriptId] = useState<string | null>(null)
  const currentId = selectedScript?.id ?? null
  if (currentId !== prevScriptId) {
    setPrevScriptId(currentId)
    const defaults: Record<string, unknown> = {}
    selectedScript?.params?.forEach((p) => {
      if (p.default !== undefined) defaults[p.name] = p.default
    })
    setParamValues(defaults)
  }

  useEffect(() => {
    if (detailPanelOpen && selectedScript) {
      loadExecutions(selectedScript.id)
      loadExternalApps()
      // Load version history
      fetch(`/api/scripts/versions?scriptId=${selectedScript.id}`)
        .then(res => res.json())
        .then(data => setVersionHistory(Array.isArray(data) ? data : []))
        .catch(() => setVersionHistory([]))
    }
  }, [detailPanelOpen, selectedScript, loadExecutions, loadExternalApps])

  const handleParamChange = (name: string, value: unknown) => {
    setParamValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleExecute = async () => {
    if (!selectedScript) return
    try {
      await executeScript(selectedScript.id, paramValues)
      toast.success('Script executed successfully')
    } catch {
      toast.error('Script execution failed')
    }
  }

  const handleCopy = async () => {
    if (!selectedScript) return
    await navigator.clipboard.writeText(selectedScript.code)
    setCopied(true)
    toast.success('Code copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  // Reset edit states when the selected script changes
  useEffect(() => {
    if (selectedScript) {
      setEditingName(false)
      setNameDraft(selectedScript.name || '')
      setEditingDescription(false)
      setDescriptionDraft(selectedScript.description || '')
    }
  }, [selectedScript?.id])

  const handleStartEditName = () => {
    if (!selectedScript) return
    setNameDraft(selectedScript.name)
    setEditingName(true)
  }

  const handleCancelEditName = () => {
    setEditingName(false)
    setNameDraft(selectedScript?.name || '')
  }

  const handleSaveName = async () => {
    if (!selectedScript) return
    const next = nameDraft.trim()
    if (!next || next === selectedScript.name) {
      setEditingName(false)
      return
    }
    setSavingName(true)
    try {
      await updateScript(selectedScript.id, { name: next })
      toast.success('Name updated')
      setEditingName(false)
    } catch (e) {
      toast.error(`Failed to update name: ${(e as Error).message}`)
    } finally {
      setSavingName(false)
    }
  }

  const handleStartEditDescription = () => {
    if (!selectedScript) return
    setDescriptionDraft(selectedScript.description || '')
    setEditingDescription(true)
  }

  const handleCancelEditDescription = () => {
    setEditingDescription(false)
    setDescriptionDraft(selectedScript?.description || '')
  }

  const handleSaveDescription = async () => {
    if (!selectedScript) return
    const next = descriptionDraft.trim()
    // No-op if unchanged
    if (next === (selectedScript.description || '')) {
      setEditingDescription(false)
      return
    }
    setSavingDescription(true)
    try {
      await updateScript(selectedScript.id, { description: next })
      toast.success('Description updated')
      setEditingDescription(false)
    } catch (e) {
      toast.error(`Failed to update description: ${(e as Error).message}`)
    } finally {
      setSavingDescription(false)
    }
  }

  const handleClose = () => {
    setDetailPanelOpen(false)
    selectScript(null)
  }

  const handleExportScript = () => {
    if (!selectedScript) return
    const extension = selectedScript.language === 'chimerax' ? 'cxc' : 'py'
    const safeName = selectedScript.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')
    const filename = `${safeName}.${extension}`
    const blob = new Blob([selectedScript.code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Script exported')
  }

  const handleDuplicate = async () => {
    if (!selectedScript) return
    try {
      await createScript({
        name: `${selectedScript.name} (Copy)`,
        description: selectedScript.description,
        code: selectedScript.code,
        language: selectedScript.language,
        category: selectedScript.category,
        tags: selectedScript.tags,
      })
      await loadScripts()
      toast.success('Script duplicated')
    } catch {
      toast.error('Failed to duplicate script')
    }
  }

  if (!selectedScript) return null

  const colors = CATEGORY_COLORS[selectedScript.category] || CATEGORY_COLORS['General']
  const scriptApps = selectedScript.apps || []
  const connectedApps = externalApps.filter(
    (app) => scriptApps.some((sa) => sa.appId === app.id)
  )

  const getHighlightLanguage = (language: string) => {
    const lang = language?.toLowerCase() || ''
    if (lang === 'python' || lang === 'pymol') return 'python'
    if (lang === 'bash') return 'bash'
    if (lang === 'r') return 'r'
    if (lang === 'julia') return 'julia'
    // ChimeraX scripts are similar to Python
    return 'python'
  }

  // Code stats
  const codeLines = selectedScript.code.split('\n').length
  const codeSize = new Blob([selectedScript.code]).size
  const codeSizeDisplay = codeSize > 1024 ? `${(codeSize / 1024).toFixed(1)} KB` : `${codeSize} B`
  const languageLabel = selectedScript.language.charAt(0).toUpperCase() + selectedScript.language.slice(1)

  const panelContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b shrink-0">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            {/* Title — visible and editable */}
            {editingName ? (
              <div className="flex items-center gap-2 mb-2">
                <Input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="text-base font-semibold h-8 px-2 py-0"
                  disabled={savingName}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.preventDefault()
                      handleCancelEditName()
                    } else if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSaveName()
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="h-7 text-xs shrink-0"
                >
                  {savingName ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-3" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelEditName}
                  disabled={savingName}
                  className="h-7 text-xs shrink-0"
                >
                  <X className="size-3" />
                </Button>
              </div>
            ) : (
              <div className="group flex items-center gap-1.5 mb-2">
                <h2 className="text-base font-semibold tracking-tight truncate">
                  {selectedScript.name}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleStartEditName}
                  className="size-5 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                  aria-label="Edit name"
                  title="Edit name"
                >
                  <Pencil className="size-3" />
                </Button>
              </div>
            )}

            {/* Description — styled card */}
            {editingDescription ? (
              <div className="space-y-2">
                <Textarea
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                  placeholder="Add a description for this script…"
                  className="min-h-[80px] text-sm resize-y"
                  disabled={savingDescription}
                  autoFocus
                  onKeyDown={(e) => {
                    // Esc cancels, Cmd/Ctrl+Enter saves
                    if (e.key === 'Escape') {
                      e.preventDefault()
                      handleCancelEditDescription()
                    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault()
                      handleSaveDescription()
                    }
                  }}
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveDescription}
                    disabled={savingDescription}
                    className="h-7 text-xs"
                  >
                    {savingDescription ? (
                      <Loader2 className="size-3 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-3 mr-1" />
                    )}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelEditDescription}
                    disabled={savingDescription}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    ⌘/Ctrl+Enter to save · Esc to cancel
                  </span>
                </div>
              </div>
            ) : (
              <div className="group relative flex items-start gap-2 rounded-lg bg-muted/30 px-3 py-2 border border-border/40">
                <p
                  className={cn(
                    'flex-1 text-sm leading-relaxed text-muted-foreground/90 whitespace-pre-wrap break-words',
                    !selectedScript.description && 'italic text-muted-foreground/50 leading-snug'
                  )}
                >
                  {selectedScript.description || 'No description yet.'}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleStartEditDescription}
                  className="size-6 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity -mt-0.5"
                  aria-label="Edit description"
                  title="Edit description"
                >
                  <Pencil className="size-3" />
                </Button>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="shrink-0"
            aria-label="Close detail panel"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Code stats bar */}
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
            <span>{languageLabel}</span>
            <span>{selectedScript.language}</span>
          </div>
          <span className="text-muted-foreground/20">·</span>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
            <FileCode2 className="size-2.5" />
            <span>{codeLines} lines</span>
          </div>
          <span className="text-muted-foreground/20">·</span>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
            <Code2 className="size-2.5" />
            <span>{codeSizeDisplay}</span>
          </div>
          {selectedScript.runCount > 0 && (
            <>
              <span className="text-muted-foreground/20">·</span>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                <Play className="size-2.5" />
                <span>{selectedScript.runCount} runs</span>
              </div>
            </>
          )}
        </div>

        {/* Badges and actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={cn('text-xs', colors.bg, colors.text, colors.border)}
          >
            {selectedScript.category}
          </Badge>
          <Badge variant="outline" className="text-xs gap-1">
            {selectedScript.language}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => toggleFavorite(selectedScript.id)}
          >
            <Star
              className={cn(
                'size-3.5 mr-1',
                selectedScript.isFavorite
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-muted-foreground'
              )}
            />
            <span className="text-xs">
              {selectedScript.isFavorite ? 'Favorited' : 'Favorite'}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => togglePinned(selectedScript.id)}
          >
            <Pin
              className={cn(
                'size-3.5 mr-1',
                selectedScript.isPinned
                  ? 'fill-teal-500 text-teal-500'
                  : 'text-muted-foreground'
              )}
            />
            <span className="text-xs">
              {selectedScript.isPinned ? 'Pinned' : 'Pin'}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => {
              if (selectedScript) {
                window.dispatchEvent(new CustomEvent('openEditScript', { detail: selectedScript.id }))
              }
            }}
          >
            <Pencil className="size-3.5 mr-1 text-muted-foreground" />
            <span className="text-xs">Edit</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={handleDuplicate}
          >
            <Files className="size-3.5 mr-1 text-muted-foreground" />
            <span className="text-xs">Duplicate</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={handleExportScript}
          >
            <Download className="size-3.5 mr-1 text-muted-foreground" />
            <span className="text-xs">Export</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col min-h-0"
      >
        <div className="px-4 pt-2 shrink-0">
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="flex-1 text-xs">
              Overview
            </TabsTrigger>
            <TabsTrigger value="code" className="flex-1 text-xs">
              Code
            </TabsTrigger>
            <TabsTrigger value="params" className="flex-1 text-xs">
              Parameters
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 text-xs">
              History
            </TabsTrigger>
            <TabsTrigger value="versions" className="flex-1 text-xs">
              Versions
            </TabsTrigger>
            <TabsTrigger value="apps" className="flex-1 text-xs">
              Apps
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Parsed data */}
              {(() => {
                const parseJson = (val: unknown) => {
                  if (!val || typeof val !== 'string' || val.trim() === '') return []
                  try { return JSON.parse(val) } catch { return [] }
                }
                const inputFiles = parseJson(selectedScript.inputFiles)
                const outputFiles = parseJson(selectedScript.outputFiles)
                const dependencies = parseJson(selectedScript.dependencies)
                const sourceUrl = selectedScript.sourceUrl

                return (
                  <>
                    {/* Description Section */}
                    <div className="rounded-lg border bg-card p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Info className="size-4 text-muted-foreground" />
                          <h3 className="text-sm font-semibold">Description</h3>
                        </div>
                        {!editingDescription && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleStartEditDescription}
                            className="size-6"
                            aria-label="Edit description"
                          >
                            <Pencil className="size-3" />
                          </Button>
                        )}
                      </div>
                      {editingDescription ? (
                        <div className="space-y-2">
                          <Textarea
                            value={descriptionDraft}
                            onChange={(e) => setDescriptionDraft(e.target.value)}
                            placeholder="Add a description for this script…"
                            className="min-h-[60px] text-sm resize-y"
                            disabled={savingDescription}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                e.preventDefault()
                                handleCancelEditDescription()
                              } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                                e.preventDefault()
                                handleSaveDescription()
                              }
                            }}
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={handleSaveDescription}
                              disabled={savingDescription}
                              className="h-7 text-xs"
                            >
                              {savingDescription ? (
                                <Loader2 className="size-3 mr-1 animate-spin" />
                              ) : (
                                <CheckCircle2 className="size-3 mr-1" />
                              )}
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancelEditDescription}
                              disabled={savingDescription}
                              className="h-7 text-xs"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {selectedScript.description || 'No description provided.'}
                        </p>
                      )}
                    </div>

                    {/* Input Files Section */}
                    {inputFiles.length > 0 && (
                      <div className="rounded-lg border bg-card p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <FileText className="size-4 text-muted-foreground" />
                          <h3 className="text-sm font-semibold">
                            Input Files
                            <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                              ({inputFiles.length})
                            </span>
                          </h3>
                        </div>
                        <div className="space-y-2">
                          {inputFiles.map(
                            (
                              file: {
                                name: string
                                description?: string
                                required?: boolean
                                format?: string
                              },
                              idx: number
                            ) => (
                              <div
                                key={idx}
                                className="flex items-start gap-3 rounded-md bg-muted/30 px-3 py-2.5 border border-border/40"
                              >
                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium truncate">
                                      {file.name}
                                    </span>
                                    {file.format && (
                                      <Badge
                                        variant="secondary"
                                        className="text-[10px] h-4 px-1.5 font-mono uppercase"
                                      >
                                        {file.format}
                                      </Badge>
                                    )}
                                    {file.required ? (
                                      <Badge className="text-[10px] h-4 px-1.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">
                                        Required
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] h-4 px-1.5"
                                      >
                                        Optional
                                      </Badge>
                                    )}
                                  </div>
                                  {file.description && (
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                      {file.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* Output Files Section */}
                    {outputFiles.length > 0 && (
                      <div className="rounded-lg border bg-card p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Download className="size-4 text-muted-foreground" />
                          <h3 className="text-sm font-semibold">
                            Output Files
                            <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                              ({outputFiles.length})
                            </span>
                          </h3>
                        </div>
                        <div className="space-y-2">
                          {outputFiles.map(
                            (
                              file: {
                                name: string
                                description?: string
                                format?: string
                              },
                              idx: number
                            ) => (
                              <div
                                key={idx}
                                className="flex items-center gap-3 rounded-md bg-muted/30 px-3 py-2.5 border border-border/40"
                              >
                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium truncate">
                                      {file.name}
                                    </span>
                                    {file.format && (
                                      <Badge
                                        variant="secondary"
                                        className="text-[10px] h-4 px-1.5 font-mono uppercase"
                                      >
                                        {file.format}
                                      </Badge>
                                    )}
                                  </div>
                                  {file.description && (
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                      {file.description}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 shrink-0"
                                  aria-label={`Download ${file.name}`}
                                >
                                  <Download className="size-3.5 text-muted-foreground" />
                                </Button>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* Dependencies Section */}
                    {dependencies.length > 0 && (
                      <div className="rounded-lg border bg-card p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Package className="size-4 text-muted-foreground" />
                          <h3 className="text-sm font-semibold">
                            Dependencies
                            <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                              ({dependencies.length})
                            </span>
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {dependencies.map(
                            (dep: string, idx: number) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="text-xs font-mono px-2 py-0.5"
                              >
                                {dep}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* Metadata Section */}
                    <div className="rounded-lg border bg-card p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Info className="size-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold">Metadata</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                            Language
                          </span>
                          <span className="text-sm">{languageLabel}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                            Category
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs w-fit mt-0.5',
                              colors.bg,
                              colors.text,
                              colors.border
                            )}
                          >
                            {selectedScript.category}
                          </Badge>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                            Lines of Code
                          </span>
                          <span className="text-sm">{codeLines}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                            File Size
                          </span>
                          <span className="text-sm">{codeSizeDisplay}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                            Created
                          </span>
                          <span className="text-sm">
                            {new Date(selectedScript.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                            Updated
                          </span>
                          <span className="text-sm">
                            {new Date(selectedScript.updatedAt).toLocaleString()}
                          </span>
                        </div>
                        {sourceUrl && (
                          <div className="flex flex-col col-span-2">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                              Source
                            </span>
                            <a
                              href={sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 mt-0.5 truncate"
                            >
                              <ExternalLink className="size-3 shrink-0" />
                              <span className="truncate">{sourceUrl}</span>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Code Tab */}
        <TabsContent value="code" className="flex-1 min-h-0 min-w-0 mt-0 overflow-hidden relative">
          {/* Copy button lives OUTSIDE the scrolling region so its absolute
              positioning isn't affected by the (potentially very wide)
              CodeHighlighter content. Sticky to the top-right of the
              TabsContent so it stays visible as the user scrolls. */}
          <div className="absolute top-2 right-2 z-20 flex gap-1">
            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-xs gap-1 shadow-md"
              onClick={handleCopy}
            >
              {copied ? (
                <CheckCircle2 className="size-3" />
              ) : (
                <Copy className="size-3" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          {/* Native overflow-auto div (NOT Radix ScrollArea) — Radix wraps
              its content in a `display: table; min-width: 100%` div that
              shrink-wraps to the widest descendant, defeating our width
              constraints. A plain div honors the panel width and the
              CodeHighlighter wrapper's overflow:auto handles horizontal
              scrolling for long lines. */}
          <div className="h-full overflow-auto">
            <div className="block p-4 pt-12 w-full min-w-0 max-w-full box-border">
              <CodeHighlighter
                language={getHighlightLanguage(selectedScript.language)}
                code={selectedScript.code}
                showLineNumbers
              />
            </div>
          </div>
        </TabsContent>

        {/* Parameters Tab */}
        <TabsContent value="params" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {selectedScript.params && selectedScript.params.length > 0 ? (
                selectedScript.params.map((param) => (
                  <ParamField
                    key={param.name}
                    param={param}
                    value={paramValues[param.name]}
                    onChange={(value) => handleParamChange(param.name, value)}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No parameters required</p>
                  <p className="text-xs mt-1">This script runs without any input</p>
                </div>
              )}
              <Separator />
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleExecute}
                  disabled={isExecuting}
                  className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play className="size-4" />
                      Execute Script
                    </>
                  )}
                </Button>
                {(executionOutput || executionError) && (
                  <div className="space-y-2">
                    {executionOutput && (
                      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3">
                        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                          Output
                        </p>
                        <pre className="text-xs text-emerald-600 dark:text-emerald-400 whitespace-pre-wrap font-mono">
                          {executionOutput}
                        </pre>
                      </div>
                    )}
                    {executionError && (
                      <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                        <p className="text-xs font-medium text-destructive mb-1">
                          Error
                        </p>
                        <pre className="text-xs text-destructive whitespace-pre-wrap font-mono">
                          {executionError}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              {executionLogs.length > 0 ? (
                <div className="space-y-3">
                  {executionLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-lg border p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <StatusIcon status={log.status} />
                          <Badge
                            variant={
                              log.status === 'success'
                                ? 'default'
                                : log.status === 'error'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                            className="text-[10px] h-5"
                          >
                            {log.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Exit: {log.exitCode ?? 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </div>
                      {log.duration > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Duration: {log.duration}ms
                        </p>
                      )}
                      {log.output && (
                        <pre className="text-xs bg-muted/50 rounded p-2 font-mono whitespace-pre-wrap max-h-24 overflow-y-auto">
                          {log.output}
                        </pre>
                      )}
                      {log.error && (
                        <pre className="text-xs bg-destructive/10 rounded p-2 font-mono whitespace-pre-wrap max-h-24 overflow-y-auto text-destructive">
                          {log.error}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="size-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No execution history</p>
                  <p className="text-xs mt-1">
                    Execute the script to see results here
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Versions Tab */}
        <TabsContent value="versions" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              {versionHistory.length > 0 ? (
                <div className="space-y-3">
                  {/* Current version indicator */}
                  <div className="rounded-lg border-2 border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-900/20 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge className="text-[10px] bg-teal-600 text-white border-0">
                          Current
                        </Badge>
                        <span className="text-xs font-medium">v{selectedScript.version}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(selectedScript.updatedAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Current working version</p>
                  </div>

                  {/* Version history */}
                  {versionHistory.map((v) => (
                    <div
                      key={v.id}
                      className={cn(
                        'rounded-lg border p-3 space-y-2 transition-colors cursor-pointer',
                        selectedVersion === v.id
                          ? 'border-teal-300 dark:border-teal-700 bg-teal-50/30 dark:bg-teal-900/10'
                          : 'hover:border-muted-foreground/20'
                      )}
                      onClick={() => setSelectedVersion(selectedVersion === v.id ? null : v.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] h-5">
                            v{v.version}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {v.message}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(v.createdAt).toLocaleString()}
                        </span>
                      </div>

                      {/* Expandable code view */}
                      {selectedVersion === v.id && (
                        <div className="mt-2 rounded-md overflow-hidden">
                          <CodeHighlighter
                            language={getHighlightLanguage(selectedScript.language)}
                            code={v.code}
                            showLineNumbers
                            maxHeight="200px"
                          />
                          <div className="flex gap-2 mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={async (e) => {
                                e.stopPropagation()
                                try {
                                  await navigator.clipboard.writeText(v.code)
                                  toast.success('Version code copied')
                                } catch {
                                  toast.error('Failed to copy')
                                }
                              }}
                            >
                              <Copy className="size-3" />
                              Copy Code
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={async (e) => {
                                e.stopPropagation()
                                const extension = selectedScript.language === 'chimerax' ? 'cxc' : 'py'
                                const blob = new Blob([v.code], { type: 'text/plain' })
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = `${selectedScript.name}_v${v.version}.${extension}`
                                document.body.appendChild(a)
                                a.click()
                                document.body.removeChild(a)
                                URL.revokeObjectURL(url)
                                toast.success('Version exported')
                              }}
                            >
                              <Download className="size-3" />
                              Export
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="size-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No version history</p>
                  <p className="text-xs mt-1">
                    Versions are created when you edit a script
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* External Apps Tab */}
        <TabsContent value="apps" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {connectedApps.length > 0 ? (
                connectedApps.map((app) => {
                  const appInfo = APP_TYPE_INFO[app.type] || APP_TYPE_INFO['chimerax']
                  const scriptApp = scriptApps.find((sa) => sa.appId === app.id)
                  return (
                    <div
                      key={app.id}
                      className="rounded-lg border p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{appInfo.icon}</span>
                          <div>
                            <p className="text-sm font-medium">{app.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {app.host}:{app.port}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            app.status === 'connected'
                              ? 'default'
                              : app.status === 'error'
                                ? 'destructive'
                                : 'secondary'
                          }
                          className="text-[10px]"
                        >
                          {app.status}
                        </Badge>
                      </div>
                      {scriptApp && (
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted/50 rounded px-2 py-1 font-mono flex-1 truncate">
                            {scriptApp.launcherCmd}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 shrink-0"
                            onClick={() => {
                              navigator.clipboard.writeText(scriptApp.launcherCmd)
                              toast.success('Command copied')
                            }}
                            aria-label="Copy launcher command"
                          >
                            <Copy className="size-3" />
                          </Button>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                        >
                          <Download className="size-3" />
                          Download Launcher
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                        >
                          <ExternalLink className="size-3" />
                          Open
                        </Button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ExternalLink className="size-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No connected apps</p>
                  <p className="text-xs mt-1">
                    Connect an external app to generate launcher scripts
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )

  // On mobile: full-screen Sheet
  if (isMobile) {
    return (
      <Sheet open={detailPanelOpen} onOpenChange={(open) => {
        if (!open) handleClose()
      }}>
        <SheetContent side="right" className="w-full sm:max-w-full p-0">
          <SheetHeader>
            <SheetTitle>{selectedScript?.name || 'Script Details'}</SheetTitle>
            <SheetDescription className="sr-only">View script details and execution options</SheetDescription>
          </SheetHeader>
          {panelContent}
        </SheetContent>
      </Sheet>
    )
  }

  // On desktop: side panel
  return (
    <AnimatePresence>
      {detailPanelOpen && (
        <>
          {/* Overlay — z-30 keeps it below the sticky Header (z-50) so the
              sidebar toggle button in the header stays clickable even when
              the detail panel is open. */}
          <motion.div
            key="detail-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 bg-black/20"
            onClick={handleClose}
          />
          {/* Panel — z-30 so Header (z-50) overlays it. Top offset matches
              Header height (h-14 = 3.5rem). */}
          <motion.div
            key="detail-panel"
            initial={{ x: 450 }}
            animate={{ x: 0 }}
            exit={{ x: 450 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-14 right-0 z-30 h-[calc(100vh-3.5rem-2.5rem)] w-[450px] border-l bg-background shadow-xl"
          >
            {panelContent}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
