'use client'

import { useState } from 'react'
import { Pencil, Loader2, Trash2, Copy } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
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

interface EditScriptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scriptId: string | null
}

export default function EditScriptDialog({
  open,
  onOpenChange,
  scriptId,
}: EditScriptDialogProps) {
  const { scripts, updateScript, deleteScript, createScript, loadScripts } = useScriptStore()
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)

  const script = scripts.find((s) => s.id === scriptId) || null

  const [form, setForm] = useState({
    name: '',
    description: '',
    code: '',
    language: 'python',
    category: 'General',
    tags: '',
  })

  // Sync form with script data when script changes
  const [prevScriptId, setPrevScriptId] = useState<string | null>(null)
  if (scriptId !== prevScriptId && script) {
    setPrevScriptId(scriptId)
    setForm({
      name: script.name,
      description: script.description,
      code: script.code,
      language: script.language,
      category: script.category,
      tags: (script.tags || []).join(', '),
    })
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      onOpenChange(false)
    }
  }

  const handleSave = async () => {
    if (!scriptId) return
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
      await updateScript(scriptId, {
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
      toast.success('Script updated successfully')
      await loadScripts()
      handleClose(false)
    } catch {
      toast.error('Failed to update script')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!scriptId) return
    setIsDeleting(true)
    try {
      await deleteScript(scriptId)
      toast.success('Script deleted successfully')
      await loadScripts()
      handleClose(false)
    } catch {
      toast.error('Failed to delete script')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDuplicate = async () => {
    if (!script) return
    setIsDuplicating(true)
    try {
      await createScript({
        name: `${script.name} (Copy)`,
        description: script.description,
        code: script.code,
        language: script.language,
        category: script.category,
        tags: script.tags,
      })
      toast.success('Script duplicated successfully')
      await loadScripts()
      handleClose(false)
    } catch {
      toast.error('Failed to duplicate script')
    } finally {
      setIsDuplicating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-5 text-teal-600 dark:text-teal-400" />
            Edit Script
          </DialogTitle>
          <DialogDescription>
            Modify or manage this script in your collection
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-script-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-script-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Color by B-Factor"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-script-desc">Description</Label>
            <Textarea
              id="edit-script-desc"
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
            <Label htmlFor="edit-script-tags">Tags</Label>
            <Input
              id="edit-script-tags"
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
            <Label htmlFor="edit-script-code">
              Code <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="edit-script-code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="Paste or type your script code here..."
              rows={8}
              className="font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {/* Destructive actions on the left */}
          <div className="flex items-center gap-2 mr-auto">
            {/* Delete with AlertDialog confirmation */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Script</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &ldquo;{script?.name}&rdquo;? This action cannot
                    be undone and will permanently remove the script and all its execution history.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Duplicate */}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleDuplicate}
              disabled={isDuplicating}
            >
              {isDuplicating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Copy className="size-3.5" />
              )}
              {isDuplicating ? 'Duplicating...' : 'Duplicate'}
            </Button>
          </div>

          {/* Save actions on the right */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="gap-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Pencil className="size-4" />
              )}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
