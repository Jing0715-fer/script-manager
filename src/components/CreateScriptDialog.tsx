'use client'

import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useScriptStore } from '@/store/script-store'
import { toast } from 'sonner'

const LANGUAGES = ['python', 'chimerax', 'pymol', 'bash', 'r', 'julia']
const CATEGORIES = [
  'ChimeraX',
  'PyMOL',
  'Structural Biology',
  'Antibody Analysis',
  'PDB Processing',
  'Cryo-EM',
  'Visualization',
  'Image Processing',
  'AI/ML',
  'Data Processing',
  'General',
]

interface CreateScriptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function CreateScriptDialog({
  open,
  onOpenChange,
}: CreateScriptDialogProps) {
  const { createScript, updateScript, loadScripts } = useScriptStore()
  const [isSaving, setIsSaving] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const [form, setForm] = useState({
    name: '',
    description: '',
    code: '',
    language: 'python',
    category: 'General',
    tags: '',
  })

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      code: '',
      language: 'python',
      category: 'General',
      tags: '',
    })
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      onOpenChange(false)
      resetForm()
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Script name is required')
      return
    }
    if (!form.code.trim()) {
      toast.error('Script code is required')
      return
    }

    setIsSaving(true)
    try {
      const script = await createScript({
        name: form.name.trim(),
        description: form.description.trim(),
        code: form.code,
        language: form.language,
        category: form.category,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      })
      toast.success('Script created successfully')

      // Analyze script with AI and auto-populate fields
      setIsSaving(false)
      setIsAnalyzing(true)
      try {
        const res = await fetch('/api/ai/analyze-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: form.code, filename: form.name }),
        })
        if (res.ok) {
          const data = await res.json()
          const analysis = data.analysis
          const updatePayload: Record<string, string> = {}
          if (analysis.description && !form.description.trim()) {
            updatePayload.description = analysis.description
          }
          if (analysis.parameters) {
            updatePayload.params = JSON.stringify(analysis.parameters)
          }
          if (analysis.inputFiles) {
            updatePayload.inputFiles = JSON.stringify(analysis.inputFiles)
          }
          if (analysis.outputFiles) {
            updatePayload.outputFiles = JSON.stringify(analysis.outputFiles)
          }
          if (Object.keys(updatePayload).length > 0 && script?.id) {
            await updateScript(script.id, updatePayload)
            toast.success('AI analysis complete — fields auto-populated')
          }
        }
      } catch {
        // Graceful fallback: script was already created, just skip AI analysis
        toast.error('Script created but AI analysis failed')
      } finally {
        setIsAnalyzing(false)
      }

      await loadScripts()
      handleClose(false)
    } catch {
      toast.error('Failed to create script')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="size-5 text-teal-600 dark:text-teal-400" />
            Create New Script
          </DialogTitle>
          <DialogDescription>
            Add a new script to your ScriptHub collection
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="script-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="script-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Color by B-Factor"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="script-desc">Description</Label>
            <Textarea
              id="script-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description of what this script does..."
              rows={2}
            />
          </div>

          {/* Language & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Language</Label>
              <Select
                value={form.language}
                onValueChange={(value) => setForm({ ...form, language: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) => setForm({ ...form, category: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label htmlFor="script-tags">Tags</Label>
            <Input
              id="script-tags"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="Comma-separated tags (e.g., pdb, analysis, color)"
            />
            <p className="text-xs text-muted-foreground">
              Separate tags with commas
            </p>
          </div>

          {/* Code */}
          <div className="space-y-1.5">
            <Label htmlFor="script-code">
              Code <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="script-code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="Paste or type your script code here..."
              rows={8}
              className="font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isSaving || isAnalyzing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isAnalyzing}
            className="gap-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isAnalyzing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {isSaving
              ? 'Saving...'
              : isAnalyzing
                ? 'Analyzing with AI...'
                : 'Create Script'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
