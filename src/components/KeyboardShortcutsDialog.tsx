'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Keyboard } from 'lucide-react'

interface ShortcutItem {
  keys: string[]
  description: string
}

const shortcuts: ShortcutItem[] = [
  { keys: ['⌘', 'K'], description: 'Focus search' },
  { keys: ['/'], description: 'Focus search (GitHub style)' },
  { keys: ['N'], description: 'Create new script' },
  { keys: ['Esc'], description: 'Close panel / dialog' },
  { keys: ['G', 'F'], description: 'Go to Favorites' },
  { keys: ['?'], description: 'Show this help' },
]

function KeyBadge({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md border border-border bg-muted/80 text-xs font-mono font-medium text-foreground shadow-[0_1px_0_2px_rgba(0,0,0,0.1)] dark:shadow-[0_1px_0_2px_rgba(255,255,255,0.05)]">
      {children}
    </kbd>
  )
}

export default function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false)

  // Listen for show event
  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('showKeyboardShortcuts', handler)
    return () => window.removeEventListener('showKeyboardShortcuts', handler)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-5 text-teal-600 dark:text-teal-400" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate ScriptHub faster
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.description}
              className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2.5"
            >
              <span className="text-sm text-muted-foreground truncate">
                {shortcut.description}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {shortcut.keys.map((key, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && (
                      <span className="text-[10px] text-muted-foreground/50">+</span>
                    )}
                    <KeyBadge>{key}</KeyBadge>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center text-xs text-muted-foreground/60 pt-1">
          Shortcuts are disabled when typing in input fields
        </div>
      </DialogContent>
    </Dialog>
  )
}
