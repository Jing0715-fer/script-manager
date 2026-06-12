'use client'

import { useState, useRef, useEffect, useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import {
  Menu,
  Search,
  X,
  LayoutGrid,
  List,
  Moon,
  Sun,
  Wand2,
  Plus,
  Code2,
  Download,
  Upload,
  PanelLeft,
  PanelLeftClose,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useIsMobile } from '@/hooks/use-mobile'
import { useScriptStore } from '@/store/script-store'

export default function Header() {
  const isMobile = useIsMobile()
  const { theme, setTheme } = useTheme()
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Detect client-side rendering without using setState in effect
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  const {
    filters,
    setFilters,
    sidebarOpen,
    setSidebarOpen,
    setGeneratorOpen,
    scripts,
  } = useScriptStore()

  const handleExportAll = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      scripts: scripts.map((s) => ({
        name: s.name,
        description: s.description,
        code: s.code,
        language: s.language,
        category: s.category,
        tags: s.tags,
        params: s.params,
        source: s.source,
      })),
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'scripthub-scripts-export.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Listen for focusSearch event (from keyboard shortcuts)
  useEffect(() => {
    const handler = () => {
      if (isMobile) {
        setSearchOpen(true)
        // Focus will happen in the searchOpen effect below
      } else if (searchInputRef.current) {
        searchInputRef.current.focus()
        searchInputRef.current.select()
      }
    }
    window.addEventListener('focusSearch', handler)
    return () => window.removeEventListener('focusSearch', handler)
  }, [isMobile])

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [searchOpen])

  // Close mobile search on click outside
  useEffect(() => {
    if (!isMobile) return
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    if (searchOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [searchOpen, isMobile])

  const handleSearchChange = (value: string) => {
    setFilters({ search: value })
  }

  const toggleViewMode = () => {
    setFilters({ viewMode: filters.viewMode === 'grid' ? 'list' : 'grid' })
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
        {/* Mobile: Hamburger menu */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="shrink-0"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>
        )}

        {/* Desktop: Sidebar toggle (always visible, but more prominent when collapsed) */}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="shrink-0"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="size-5" />
            ) : (
              <PanelLeft className="size-5 text-teal-600 dark:text-teal-400" />
            )}
          </Button>
        )}

        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
            <Code2 className="size-4" />
          </div>
          <span className="font-bold text-lg tracking-tight hidden sm:inline">
            ScriptHub
          </span>
        </div>

        {/* Search - Desktop: always visible, Mobile: expandable */}
        <div className="flex-1 flex justify-center" ref={searchContainerRef}>
          {isMobile ? (
            searchOpen ? (
              <div className="flex-1 flex items-center gap-2 animate-in slide-in-from-right-5 duration-200">
                <Input
                  ref={searchInputRef}
                  type="search"
                  placeholder="Search scripts..."
                  value={filters.search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="h-9 flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSearchOpen(false)
                    handleSearchChange('')
                  }}
                  className="shrink-0"
                  aria-label="Close search"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="flex-1" />
            )
          ) : (
            <div className="max-w-md w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  type="search"
                  placeholder="Search scripts..."
                  value={filters.search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="h-9 pl-9 pr-16 w-full"
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5 border pointer-events-none">
                  ⌘K
                </kbd>
              </div>
            </div>
          )}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Mobile: Search icon */}
          {isMobile && !searchOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
            >
              <Search className="size-5" />
            </Button>
          )}

          {/* View toggle - Desktop only */}
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleViewMode}
              aria-label={`Switch to ${filters.viewMode === 'grid' ? 'list' : 'grid'} view`}
            >
              {filters.viewMode === 'grid' ? (
                <List className="size-4" />
              ) : (
                <LayoutGrid className="size-4" />
              )}
            </Button>
          )}

          {/* Theme toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </Button>
          )}

          {/* Import - Desktop */}
          {!isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const event = new CustomEvent('openImportScripts')
                window.dispatchEvent(event)
              }}
              className="gap-1.5"
              aria-label="Import scripts"
            >
              <Upload className="size-3.5" />
              <span>Import</span>
            </Button>
          )}

          {/* Export All - Desktop */}
          {!isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportAll}
              disabled={scripts.length === 0}
              className="gap-1.5"
              aria-label="Export all scripts"
            >
              <Download className="size-3.5" />
              <span>Export All</span>
            </Button>
          )}

          {/* Script Generator - Desktop */}
          {!isMobile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGeneratorOpen(true)}
              className="gap-1.5 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/30"
            >
              <Wand2 className="size-3.5" />
              <span>Generator</span>
            </Button>
          )}

          {/* Add Script */}
          <Button
            size="sm"
            onClick={() => {
              // Will be connected via store in HomePageContent
              const event = new CustomEvent('openCreateScript')
              window.dispatchEvent(event)
            }}
            className="gap-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">Add Script</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
