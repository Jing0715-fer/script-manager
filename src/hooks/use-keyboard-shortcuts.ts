'use client'

import { useEffect, useCallback } from 'react'

interface KeyboardShortcutsConfig {
  onSearchFocus?: () => void
  onCreateScript?: () => void
  onClosePanel?: () => void
  onShowHelp?: () => void
  onGoToFavorites?: () => void
}

export function useKeyboardShortcuts(config: KeyboardShortcutsConfig) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable

      // Cmd/Ctrl + K: Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        config.onSearchFocus?.()
        return
      }

      // Escape: Close panels
      if (e.key === 'Escape') {
        config.onClosePanel?.()
        return
      }

      // Don't process single-key shortcuts when in input
      if (isInput) return

      // / : Focus search (like GitHub)
      if (e.key === '/') {
        e.preventDefault()
        config.onSearchFocus?.()
        return
      }

      // n : Create new script
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        config.onCreateScript?.()
        return
      }

      // ? : Show keyboard shortcuts help
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        config.onShowHelp?.()
        return
      }

      // g then f: Go to Favorites
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const handleGSequence = (ev: KeyboardEvent) => {
          window.removeEventListener('keydown', handleGSequence)
          if (ev.key === 'f' && !ev.metaKey && !ev.ctrlKey && !ev.altKey) {
            ev.preventDefault()
            config.onGoToFavorites?.()
          }
        }
        window.addEventListener('keydown', handleGSequence, { once: true })
        // Auto-cleanup after 1s if no second key pressed
        setTimeout(() => window.removeEventListener('keydown', handleGSequence), 1000)
        return
      }
    },
    [config]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
