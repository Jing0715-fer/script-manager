'use client'

import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Wand2,
  Download,
  Copy,
  CheckCircle2,
  Upload,
  Loader2,
  Wifi,
  WifiOff,
  FlaskConical,
  Microscope,
  Sparkles,
  FileCode2,
  LayoutTemplate,
} from 'lucide-react'
import CodeHighlighter from '@/components/CodeHighlighter'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useIsMobile } from '@/hooks/use-mobile'
import { useScriptStore } from '@/store/script-store'
import { api } from '@/lib/api-client'
import type { ScriptTemplate, ScriptParam } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const TEMPLATE_STEPS = [
  { id: 1, title: 'Select App' },
  { id: 2, title: 'Choose Template' },
  { id: 3, title: 'Configure' },
  { id: 4, title: 'Preview' },
  { id: 5, title: 'Export' },
]

const AI_STEPS = [
  { id: 1, title: 'Select App' },
  { id: 2, title: 'Describe' },
  { id: 3, title: 'Preview' },
  { id: 4, title: 'Export' },
]

type GenerationMode = 'template' | 'ai'

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
            value={(value as string) || (param.default as string) || ''}
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
            value={(value as number) || (param.default as number) || ''}
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
        <div className="space-y-1.5">
          <Label className="text-sm">
            {param.label}
            {param.required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
          <div className="relative">
            <Input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onChange(file)
              }}
              accept=".pdb,.mrc,.cif,.mmcif,.map,.mtz"
              className="cursor-pointer"
            />
          </div>
          {param.description && (
            <p className="text-xs text-muted-foreground">{param.description}</p>
          )}
        </div>
      )
    case 'path':
      return (
        <div className="space-y-1.5">
          <Label className="text-sm">
            {param.label}
            {param.required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
          <Input
            value={(value as string) || (param.default as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={param.placeholder || '/path/to/file'}
          />
          {param.description && (
            <p className="text-xs text-muted-foreground">{param.description}</p>
          )}
        </div>
      )
    default:
      return null
  }
}

export default function ScriptGenerator() {
  const isMobile = useIsMobile()
  const { generatorOpen, setGeneratorOpen, templates, loadTemplates, externalApps, createScript, loadScripts } =
    useScriptStore()

  const [mode, setMode] = useState<GenerationMode>('template')
  const [step, setStep] = useState(1)
  const [selectedApp, setSelectedApp] = useState<'chimerax' | 'pymol' | ''>('')
  const [selectedTemplate, setSelectedTemplate] = useState<ScriptTemplate | null>(null)
  const [paramValues, setParamValues] = useState<Record<string, unknown>>({})
  const [generatedCode, setGeneratedCode] = useState('')
  const [generatedFilename, setGeneratedFilename] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  // AI-specific state
  const [aiDescription, setAiDescription] = useState('')
  const [aiCategory, setAiCategory] = useState('')

  useEffect(() => {
    if (generatorOpen) {
      loadTemplates(selectedApp || undefined)
    }
  }, [generatorOpen, selectedApp, loadTemplates])

  const resetState = () => {
    setStep(1)
    setMode('template')
    setSelectedApp('')
    setSelectedTemplate(null)
    setParamValues({})
    setGeneratedCode('')
    setGeneratedFilename('')
    setCopied(false)
    setUploadedFile(null)
    setAiDescription('')
    setAiCategory('')
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      setGeneratorOpen(false)
      resetState()
    }
  }

  const maxStep = mode === 'ai' ? 4 : 5
  const steps = mode === 'ai' ? AI_STEPS : TEMPLATE_STEPS

  const handleNext = () => {
    if (step < maxStep) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleTemplateSelect = (template: ScriptTemplate) => {
    setSelectedTemplate(template)
    const defaults: Record<string, unknown> = {}
    template.params?.forEach((p) => {
      if (p.default !== undefined) defaults[p.name] = p.default
    })
    setParamValues(defaults)
  }

  const handleParamChange = (name: string, value: unknown) => {
    setParamValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleTemplateGenerate = async () => {
    if (!selectedTemplate) return
    setIsGenerating(true)
    try {
      const result = await api.generateScript(
        selectedTemplate.id,
        paramValues
      )
      setGeneratedCode(result.script)
      setGeneratedFilename(result.filename)
      handleNext()
      toast.success('Script generated successfully')
    } catch {
      toast.error('Failed to generate script')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAiGenerate = async () => {
    if (!selectedApp || !aiDescription.trim()) return
    setIsGenerating(true)
    try {
      const result = await api.aiGenerate(
        aiDescription,
        selectedApp as 'chimerax' | 'pymol',
        aiCategory || undefined
      )
      setGeneratedCode(result.script)
      setGeneratedFilename(result.filename)
      handleNext()
      toast.success('AI script generated successfully')
    } catch {
      toast.error('Failed to generate script with AI')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedCode)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([generatedCode], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = generatedFilename || 'script.py'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Script downloaded')
  }

  const handleSaveToLibrary = async () => {
    if (!generatedCode) return
    try {
      await createScript({
        name: generatedFilename?.replace(/\.[^.]+$/, '').replace(/_/g, ' ') || 'AI Generated Script',
        description: mode === 'ai' ? aiDescription.trim().slice(0, 200) : (selectedTemplate?.description || ''),
        code: generatedCode,
        language: selectedApp === 'pymol' ? 'python' : 'chimerax',
        category: mode === 'ai' ? (aiCategory || 'General') : (selectedTemplate?.category || 'General'),
        tags: mode === 'ai' ? ['ai-generated'] : ['template-generated'],
      })
      await loadScripts()
      toast.success('Script saved to library')
    } catch {
      toast.error('Failed to save script to library')
    }
  }

  const handleFileUpload = async () => {
    if (!uploadedFile) return
    try {
      const result = await api.uploadFile(uploadedFile)
      toast.success(`File uploaded: ${result.name}`)
      setParamValues((prev) => ({ ...prev, inputFile: result.path }))
    } catch {
      toast.error('File upload failed')
    }
  }

  const chimeraxConnected = externalApps.some(
    (app) => app.type === 'chimerax' && app.status === 'connected'
  )
  const pymolConnected = externalApps.some(
    (app) => app.type === 'pymol' && app.status === 'connected'
  )

  const filteredTemplates = selectedApp
    ? templates.filter((t) => t.appType === selectedApp)
    : templates

  const canProceed = () => {
    if (mode === 'ai') {
      switch (step) {
        case 1:
          return !!selectedApp
        case 2:
          return !!aiDescription.trim()
        case 3:
          return !!generatedCode
        default:
          return false
      }
    }
    switch (step) {
      case 1:
        return !!selectedApp
      case 2:
        return !!selectedTemplate
      case 3:
        return true
      case 4:
        return !!generatedCode
      default:
        return false
    }
  }

  const getHighlightLanguage = () => {
    return selectedApp === 'pymol' ? 'python' : 'python'
  }

  const renderStepIndicators = () => (
    <div className="flex items-center gap-1 pt-2">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center gap-1 flex-1">
          <div
            className={cn(
              'flex items-center justify-center size-7 rounded-full text-xs font-medium shrink-0 transition-colors',
              step >= s.id
                ? selectedApp === 'pymol'
                  ? 'bg-orange-600 text-white'
                  : 'bg-teal-600 text-white'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {s.id}
          </div>
          <span
            className={cn(
              'text-xs hidden sm:inline truncate',
              step >= s.id ? 'text-foreground font-medium' : 'text-muted-foreground'
            )}
          >
            {s.title}
          </span>
          {i < steps.length - 1 && (
            <div
              className={cn(
                'flex-1 h-0.5 rounded',
                step > s.id
                  ? selectedApp === 'pymol'
                    ? 'bg-orange-400'
                    : 'bg-teal-400'
                  : 'bg-muted'
              )}
            />
          )}
        </div>
      ))}
    </div>
  )

  const renderAppSelection = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choose which structural biology application to generate a script for.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* ChimeraX card */}
        <Card
          className={cn(
            'cursor-pointer transition-all hover:shadow-md min-h-[160px]',
            selectedApp === 'chimerax'
              ? 'ring-2 ring-teal-500 shadow-md'
              : 'hover:border-teal-300 dark:hover:border-teal-700'
          )}
          onClick={() => {
            setSelectedApp('chimerax')
            setSelectedTemplate(null)
          }}
        >
          <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full">
            <FlaskConical className="size-12 text-teal-500 mb-3" />
            <h3 className="font-bold text-lg mb-1">ChimeraX</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Next-generation molecular visualization
            </p>
            <div className="flex items-center gap-1.5">
              {chimeraxConnected ? (
                <>
                  <Wifi className="size-3 text-emerald-500" />
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">
                    Connected
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="size-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Offline
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* PyMOL card */}
        <Card
          className={cn(
            'cursor-pointer transition-all hover:shadow-md min-h-[160px]',
            selectedApp === 'pymol'
              ? 'ring-2 ring-orange-500 shadow-md'
              : 'hover:border-orange-300 dark:hover:border-orange-700'
          )}
          onClick={() => {
            setSelectedApp('pymol')
            setSelectedTemplate(null)
          }}
        >
          <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full">
            <Microscope className="size-12 text-orange-500 mb-3" />
            <h3 className="font-bold text-lg mb-1">PyMOL</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Molecular visualization system
            </p>
            <div className="flex items-center gap-1.5">
              {pymolConnected ? (
                <>
                  <Wifi className="size-3 text-emerald-500" />
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">
                    Connected
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="size-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Offline
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  return (
    <Dialog open={generatorOpen} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          'flex flex-col gap-0 p-0',
          isMobile
            ? 'h-[100vh] w-[100vw] max-w-[100vw] rounded-none translate-x-0 translate-y-0 top-0 left-0'
            : 'max-w-2xl h-[85vh]'
        )}
      >
        <DialogHeader className="p-4 pb-2 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="size-5 text-teal-600 dark:text-teal-400" />
            Script Generator
          </DialogTitle>
          <DialogDescription>
            Generate ChimeraX or PyMOL scripts from templates or AI
          </DialogDescription>

          {/* Mode selector */}
          <div className="flex items-center gap-2 pt-2 pb-1">
            <Button
              variant={mode === 'template' ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'gap-1.5 text-xs',
                mode === 'template' && 'bg-teal-600 hover:bg-teal-700 text-white'
              )}
              onClick={() => {
                setMode('template')
                resetState()
              }}
            >
              <LayoutTemplate className="size-3.5" />
              From Template
            </Button>
            <Button
              variant={mode === 'ai' ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'gap-1.5 text-xs',
                mode === 'ai' && 'bg-violet-600 hover:bg-violet-700 text-white'
              )}
              onClick={() => {
                setMode('ai')
                resetState()
              }}
            >
              <Sparkles className="size-3.5" />
              AI Generate
            </Button>
          </div>

          {/* Step indicators */}
          {renderStepIndicators()}
        </DialogHeader>

        {/* Step content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4">
            {/* ========= TEMPLATE MODE ========= */}
            {mode === 'template' && (
              <>
                {/* Step 1: Select App */}
                {step === 1 && renderAppSelection()}

                {/* Step 2: Choose Template */}
                {step === 2 && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Select a script template for{' '}
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          selectedApp === 'chimerax'
                            ? 'border-teal-300 text-teal-700 dark:border-teal-700 dark:text-teal-300'
                            : 'border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300'
                        )}
                      >
                        {selectedApp === 'chimerax' ? 'ChimeraX' : 'PyMOL'}
                      </Badge>
                    </p>
                    {filteredTemplates.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {filteredTemplates.map((template) => (
                          <Card
                            key={template.id}
                            className={cn(
                              'cursor-pointer transition-all hover:shadow-md',
                              selectedTemplate?.id === template.id
                                ? selectedApp === 'chimerax'
                                  ? 'ring-2 ring-teal-500'
                                  : 'ring-2 ring-orange-500'
                                : ''
                            )}
                            onClick={() => handleTemplateSelect(template)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{template.icon}</span>
                                <h4 className="font-medium text-sm">{template.name}</h4>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {template.description}
                              </p>
                              <div className="flex items-center gap-1 mt-2">
                                <Badge variant="secondary" className="text-[10px] h-5">
                                  {template.category}
                                </Badge>
                                {template.params.length > 0 && (
                                  <Badge variant="outline" className="text-[10px] h-5">
                                    {template.params.length} params
                                  </Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Wand2 className="size-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No templates available</p>
                        <p className="text-xs mt-1">Try a different application type</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Configure Parameters */}
                {step === 3 && selectedTemplate && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          selectedApp === 'chimerax'
                            ? 'border-teal-300 text-teal-700 dark:border-teal-700 dark:text-teal-300'
                            : 'border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300'
                        )}
                      >
                        {selectedTemplate.name}
                      </Badge>
                    </div>
                    {selectedTemplate.params.length > 0 ? (
                      <div className="space-y-4">
                        {selectedTemplate.params.map((param) => (
                          <ParamField
                            key={param.name}
                            param={param}
                            value={paramValues[param.name]}
                            onChange={(value) => handleParamChange(param.name, value)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm">No parameters needed</p>
                        <p className="text-xs mt-1">This template uses default values</p>
                      </div>
                    )}

                    {/* File Upload Section */}
                    <div className="space-y-3 pt-4 border-t">
                      <Label className="text-sm font-medium">Upload Input File (Optional)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) setUploadedFile(file)
                          }}
                          accept=".pdb,.mrc,.cif,.mmcif,.map,.mtz"
                          className="cursor-pointer"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleFileUpload}
                          disabled={!uploadedFile}
                          className="shrink-0 gap-1"
                        >
                          <Upload className="size-3" />
                          Upload
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Supports PDB, MRC, CIF, MAP, MTZ files
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 4: Preview */}
                {step === 4 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Preview your generated script:
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 text-xs gap-1"
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
                    {generatedCode ? (
                      <div className="rounded-lg border overflow-hidden max-h-[300px] overflow-y-auto">
                        <CodeHighlighter
                          language={getHighlightLanguage()}
                          code={generatedCode}
                          showLineNumbers
                        />
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground">
                          Click &quot;Generate&quot; to create the script
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 5: Export */}
                {step === 5 && (
                  <div className="space-y-6">
                    <div className="text-center py-4">
                      <CheckCircle2
                        className={cn(
                          'size-16 mx-auto mb-4',
                          selectedApp === 'chimerax'
                            ? 'text-teal-500'
                            : 'text-orange-500'
                        )}
                      />
                      <h3 className="text-xl font-bold mb-1">Script Ready!</h3>
                      <p className="text-sm text-muted-foreground">
                        Your {selectedApp === 'chimerax' ? 'ChimeraX' : 'PyMOL'} script has been
                        generated successfully
                      </p>
                    </div>

                    {/* Preview */}
                    <div className="rounded-lg border overflow-hidden max-h-[200px] overflow-y-auto">
                      <CodeHighlighter
                        language={getHighlightLanguage()}
                        code={generatedCode}
                        showLineNumbers
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={handleDownload}
                        className={cn(
                          'flex-1 gap-2',
                          selectedApp === 'chimerax'
                            ? 'bg-teal-600 hover:bg-teal-700 text-white'
                            : 'bg-orange-600 hover:bg-orange-700 text-white'
                        )}
                      >
                        <Download className="size-4" />
                        Download Script
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCopy}
                        className="flex-1 gap-2"
                      >
                        {copied ? (
                          <CheckCircle2 className="size-4" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                        {copied ? 'Copied!' : 'Copy to Clipboard'}
                      </Button>
                    </div>

                    <div className="flex justify-center">
                      <Button
                        variant="outline"
                        onClick={handleSaveToLibrary}
                        className="gap-2"
                      >
                        <FileCode2 className="size-4" />
                        Save to Library
                      </Button>
                    </div>

                    {generatedFilename && (
                      <p className="text-xs text-muted-foreground text-center">
                        Filename: <code className="bg-muted px-1.5 py-0.5 rounded">{generatedFilename}</code>
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ========= AI MODE ========= */}
            {mode === 'ai' && (
              <>
                {/* Step 1: Select App */}
                {step === 1 && renderAppSelection()}

                {/* Step 2: Describe */}
                {step === 2 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="size-4 text-violet-500" />
                      <p className="text-sm text-muted-foreground">
                        Describe what you want the{' '}
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            selectedApp === 'chimerax'
                              ? 'border-teal-300 text-teal-700 dark:border-teal-700 dark:text-teal-300'
                              : 'border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300'
                          )}
                        >
                          {selectedApp === 'chimerax' ? 'ChimeraX' : 'PyMOL'}
                        </Badge>
                        {' '}script to do
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="ai-description" className="text-sm font-medium">
                          Description <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          id="ai-description"
                          value={aiDescription}
                          onChange={(e) => setAiDescription(e.target.value)}
                          placeholder="e.g., Load PDB 1ABC, color chains differently, show surface, highlight active site residues 45-52, and save a high-resolution image"
                          rows={5}
                          className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                          Be as specific as possible — mention PDB IDs, colors, representations, and any details you need
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="ai-category" className="text-sm">
                          Category (Optional)
                        </Label>
                        <Select
                          value={aiCategory}
                          onValueChange={setAiCategory}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a category..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ChimeraX">ChimeraX</SelectItem>
                            <SelectItem value="PyMOL">PyMOL</SelectItem>
                            <SelectItem value="Structural Biology">Structural Biology</SelectItem>
                            <SelectItem value="Antibody Analysis">Antibody Analysis</SelectItem>
                            <SelectItem value="PDB Processing">PDB Processing</SelectItem>
                            <SelectItem value="Cryo-EM">Cryo-EM</SelectItem>
                            <SelectItem value="Visualization">Visualization</SelectItem>
                            <SelectItem value="General">General</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Example prompts */}
                      <div className="space-y-2 pt-2">
                        <p className="text-xs font-medium text-muted-foreground">Example prompts:</p>
                        <div className="flex flex-col gap-1.5">
                          {[
                            'Load PDB 6X2G, color by chain, show cartoon and surface, set background white',
                            'Fetch antibody structure, highlight CDR loops in red, measure distances between CDRs',
                            'Load cryo-EM map and fitted model, adjust contour level, show isosurface',
                            'Create a publication-quality figure with cartoon representation, color by secondary structure, add 2D labels',
                          ].map((prompt) => (
                            <button
                              key={prompt}
                              type="button"
                              className="text-left text-xs text-muted-foreground hover:text-foreground bg-muted/50 rounded-md px-3 py-2 transition-colors"
                              onClick={() => setAiDescription(prompt)}
                            >
                              &ldquo;{prompt}&rdquo;
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: AI Preview */}
                {step === 3 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-4 text-violet-500" />
                        <p className="text-sm text-muted-foreground">
                          AI-generated script:
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 text-xs gap-1"
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
                    {generatedCode ? (
                      <div className="rounded-lg border overflow-hidden max-h-[350px] overflow-y-auto">
                        <CodeHighlighter
                          language={getHighlightLanguage()}
                          code={generatedCode}
                          showLineNumbers
                        />
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground">
                          Click &quot;Generate&quot; to create the script with AI
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4: AI Export */}
                {step === 4 && (
                  <div className="space-y-6">
                    <div className="text-center py-4">
                      <CheckCircle2 className="size-16 mx-auto mb-4 text-violet-500" />
                      <h3 className="text-xl font-bold mb-1">Script Ready!</h3>
                      <p className="text-sm text-muted-foreground">
                        Your AI-generated {selectedApp === 'chimerax' ? 'ChimeraX' : 'PyMOL'} script
                      </p>
                    </div>

                    {/* Preview */}
                    <div className="rounded-lg border overflow-hidden max-h-[200px] overflow-y-auto">
                      <CodeHighlighter
                        language={getHighlightLanguage()}
                        code={generatedCode}
                        showLineNumbers
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={handleDownload}
                        className="flex-1 gap-2 bg-violet-600 hover:bg-violet-700 text-white"
                      >
                        <Download className="size-4" />
                        Download Script
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCopy}
                        className="flex-1 gap-2"
                      >
                        {copied ? (
                          <CheckCircle2 className="size-4" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                        {copied ? 'Copied!' : 'Copy to Clipboard'}
                      </Button>
                    </div>

                    <div className="flex justify-center">
                      <Button
                        variant="outline"
                        onClick={handleSaveToLibrary}
                        className="gap-2"
                      >
                        <FileCode2 className="size-4" />
                        Save to Library
                      </Button>
                    </div>

                    {generatedFilename && (
                      <p className="text-xs text-muted-foreground text-center">
                        Filename: <code className="bg-muted px-1.5 py-0.5 rounded">{generatedFilename}</code>
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer navigation */}
        <div className="p-4 border-t shrink-0 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1}
            className="gap-1"
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            {/* Generate button for template mode step 3 */}
            {mode === 'template' && step === 3 && (
              <Button
                onClick={handleTemplateGenerate}
                disabled={isGenerating}
                className={cn(
                  'gap-2',
                  selectedApp === 'chimerax'
                    ? 'bg-teal-600 hover:bg-teal-700 text-white'
                    : 'bg-orange-600 hover:bg-orange-700 text-white'
                )}
              >
                {isGenerating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Wand2 className="size-4" />
                )}
                {isGenerating ? 'Generating...' : 'Generate'}
              </Button>
            )}

            {/* Generate button for AI mode step 2 */}
            {mode === 'ai' && step === 2 && (
              <Button
                onClick={handleAiGenerate}
                disabled={isGenerating || !aiDescription.trim()}
                className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
              >
                {isGenerating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {isGenerating ? 'Generating...' : 'Generate with AI'}
              </Button>
            )}

            {/* Next button (not on generate steps or final step) */}
            {!((mode === 'template' && step === 3) || (mode === 'ai' && step === 2)) && step !== maxStep && (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className={cn(
                  'gap-1',
                  mode === 'ai'
                    ? 'bg-violet-600 hover:bg-violet-700 text-white'
                    : selectedApp === 'chimerax'
                      ? 'bg-teal-600 hover:bg-teal-700 text-white'
                      : selectedApp === 'pymol'
                        ? 'bg-orange-600 hover:bg-orange-700 text-white'
                        : ''
                )}
              >
                Next
                <ArrowRight className="size-4" />
              </Button>
            )}

            {/* Done button */}
            {step === maxStep && (
              <Button
                onClick={() => handleClose(false)}
                className={cn(
                  'gap-1',
                  mode === 'ai'
                    ? 'bg-violet-600 hover:bg-violet-700 text-white'
                    : selectedApp === 'chimerax'
                      ? 'bg-teal-600 hover:bg-teal-700 text-white'
                      : 'bg-orange-600 hover:bg-orange-700 text-white'
                )}
              >
                Done
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
