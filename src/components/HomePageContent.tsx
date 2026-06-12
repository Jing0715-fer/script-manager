'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Loader2,
  Search,
  Database,
  Wand2,
  FileCode2,
  LayoutGrid,
  List,
  ArrowUpDown,
  X,
  Plus,
  RefreshCw,
  AlertTriangle,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/use-mobile'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { useScriptStore } from '@/store/script-store'
import { CATEGORY_COLORS } from '@/types'
import type { Script } from '@/types'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import ScriptCard from '@/components/ScriptCard'
import ScriptDetailPanel from '@/components/ScriptDetailPanel'
import ScriptGenerator from '@/components/ScriptGenerator'
import CreateScriptDialog from '@/components/CreateScriptDialog'
import EditScriptDialog from '@/components/EditScriptDialog'
import ImportScriptsDialog from '@/components/ImportScriptsDialog'
import KeyboardShortcutsDialog from '@/components/KeyboardShortcutsDialog'
import Footer from '@/components/Footer'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export default function HomePageContent() {
  const isMobile = useIsMobile()
  const {
    scripts,
    filteredScripts,
    filters,
    setFilters,
    isLoading,
    error,
    loadScripts,
    retryLoad,
    seedDatabase,
    selectScript,
    sidebarOpen,
    setSidebarOpen,
    setGeneratorOpen,
    detailPanelOpen,
    setDetailPanelOpen,
  } = useScriptStore()

  const [fabOpen, setFabOpen] = useState(false)

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editScriptId, setEditScriptId] = useState<string | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  // Keyboard shortcuts
  useKeyboardShortcuts(useMemo(() => ({
    onSearchFocus: () => window.dispatchEvent(new CustomEvent('focusSearch')),
    onCreateScript: () => setCreateDialogOpen(true),
    onClosePanel: () => {
      setDetailPanelOpen(false)
      setGeneratorOpen(false)
    },
    onShowHelp: () => window.dispatchEvent(new CustomEvent('showKeyboardShortcuts')),
    onGoToFavorites: () => setFilters({ category: 'Favorites' }),
  }), [setDetailPanelOpen, setGeneratorOpen, setFilters]))

  // Load scripts on mount
  useEffect(() => {
    loadScripts()
  }, [loadScripts])

  // Listen for create script event from Header
  useEffect(() => {
    const handler = () => setCreateDialogOpen(true)
    window.addEventListener('openCreateScript', handler)
    return () => window.removeEventListener('openCreateScript', handler)
  }, [])

  // Listen for edit script event from ScriptDetailPanel
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<string>
      setEditScriptId(customEvent.detail)
      setEditDialogOpen(true)
    }
    window.addEventListener('openEditScript', handler)
    return () => window.removeEventListener('openEditScript', handler)
  }, [])

  // Listen for import scripts event from Header
  useEffect(() => {
    const handler = () => setImportDialogOpen(true)
    window.addEventListener('openImportScripts', handler)
    return () => window.removeEventListener('openImportScripts', handler)
  }, [])

  // Handle special filters (Favorites, Pinned)
  const displayScripts = useCallback(() => {
    let result = filteredScripts()
    if (filters.category === 'Favorites') {
      result = result.filter((s) => s.isFavorite)
    } else if (filters.category === 'Pinned') {
      result = result.filter((s) => s.isPinned)
    } else if (filters.category === 'Recent') {
      result = [...result]
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        .slice(0, 20)
    }
    return result
  }, [filteredScripts, filters.category])

  const displayed = displayScripts()

  const handleSeed = async () => {
    try {
      await seedDatabase()
    } catch {
      // silently fail
    }
  }

  // Handle script click
  const handleScriptClick = (script: Script) => {
    selectScript(script)
  }

  // Sort controls
  const sortOptions = [
    { value: 'updatedAt', label: 'Last Updated' },
    { value: 'createdAt', label: 'Created' },
    { value: 'name', label: 'Name' },
    { value: 'rating', label: 'Rating' },
    { value: 'runCount', label: 'Run Count' },
  ]

  // Derive unique languages from scripts
  const languageOptions = Array.from(
    new Set(scripts.map((s) => s.language).filter(Boolean))
  ).sort()

  // Remove a tag filter
  const handleRemoveTag = (tag: string) => {
    setFilters({ tags: filters.tags.filter((t) => t !== tag) })
  }

  // Mobile sidebar content
  const mobileSidebar = (
    <Sheet open={isMobile && sidebarOpen} onOpenChange={setSidebarOpen}>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">Browse script categories and filters</SheetDescription>
        <Sidebar inSheet />
      </SheetContent>
    </Sheet>
  )

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <Header />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Desktop Sidebar */}
        {!isMobile && <Sidebar />}

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Toolbar - sort, view toggle, etc */}
          <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b bg-background/50">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs h-6">
                {displayed.length} script{displayed.length !== 1 ? 's' : ''}
              </Badge>
              <AnimatePresence mode="popLayout">
                {filters.category !== 'All' && (
                  <motion.div
                    key="category-filter"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs h-6 gap-1 cursor-pointer',
                        CATEGORY_COLORS[filters.category]
                          ? `${CATEGORY_COLORS[filters.category].bg} ${CATEGORY_COLORS[filters.category].text} ${CATEGORY_COLORS[filters.category].border}`
                          : ''
                      )}
                      onClick={() => setFilters({ category: 'All' })}
                    >
                      {filters.category}
                      <X className="size-2.5 ml-0.5" />
                    </Badge>
                  </motion.div>
                )}
                {filters.search && (
                  <motion.div
                    key="search-filter"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Badge
                      variant="outline"
                      className="text-xs h-6 gap-1 cursor-pointer"
                      onClick={() => setFilters({ search: '' })}
                    >
                      <Search className="size-2.5" />
                      {filters.search}
                      <X className="size-2.5 ml-0.5" />
                    </Badge>
                  </motion.div>
                )}
                {filters.language && (
                  <motion.div
                    key="language-filter"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Badge
                      variant="outline"
                      className="text-xs h-6 gap-1 cursor-pointer"
                      onClick={() => setFilters({ language: '' })}
                    >
                      <FileCode2 className="size-2.5" />
                      {filters.language}
                      <X className="size-2.5 ml-0.5" />
                    </Badge>
                  </motion.div>
                )}
                {filters.tags.map((tag) => (
                  <motion.div
                    key={`tag-${tag}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Badge
                      variant="outline"
                      className="text-xs h-6 gap-1 cursor-pointer bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag}
                      <X className="size-2.5 ml-0.5" />
                    </Badge>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-2">
              {/* Language filter */}
              <Select
                value={filters.language || '_all'}
                onValueChange={(value) =>
                  setFilters({ language: value === '_all' ? '' : value })
                }
              >
                <SelectTrigger className="h-7 text-xs w-[100px] sm:w-[120px]">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Languages</SelectItem>
                  {languageOptions.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort */}
              <div className="flex items-center gap-1">
                <ArrowUpDown className="size-3 text-muted-foreground" />
                <Select
                  value={filters.sortBy}
                  onValueChange={(value) =>
                    setFilters({
                      sortBy: value as typeof filters.sortBy,
                    })
                  }
                >
                  <SelectTrigger className="h-7 text-xs w-[120px] sm:w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* View toggle - mobile */}
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() =>
                    setFilters({
                      viewMode: filters.viewMode === 'grid' ? 'list' : 'grid',
                    })
                  }
                  aria-label={`Switch to ${filters.viewMode === 'grid' ? 'list' : 'grid'} view`}
                >
                  {filters.viewMode === 'grid' ? (
                    <List className="size-3.5" />
                  ) : (
                    <LayoutGrid className="size-3.5" />
                  )}
                </Button>
              )}

              {/* Generator - mobile */}
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => setGeneratorOpen(true)}
                  aria-label="Script Generator"
                >
                  <Wand2 className="size-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Script Grid / List */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Loader2 className="size-8 text-teal-500" />
                </motion.div>
                <p className="text-sm mt-3">Loading scripts...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col items-center"
                >
                  <div className="size-20 rounded-2xl bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 flex items-center justify-center border border-red-200/50 dark:border-red-800/50 mb-4">
                    <AlertTriangle className="size-8 text-red-500 dark:text-red-400 opacity-60" />
                  </div>
                  <p className="text-lg font-medium mb-1">Failed to load scripts</p>
                  <p className="text-sm mb-6 text-muted-foreground/70 text-center max-w-xs">
                    {error}
                  </p>
                  <Button
                    onClick={retryLoad}
                    className="gap-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                  >
                    <RefreshCw className="size-3.5" />
                    Retry
                  </Button>
                </motion.div>
              </div>
            ) : displayed.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                {scripts.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center"
                  >
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      className="mb-4"
                    >
                      <div className="size-20 rounded-2xl bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-900/30 dark:to-emerald-900/30 flex items-center justify-center border border-teal-200/50 dark:border-teal-800/50">
                        <Database className="size-8 text-teal-500 dark:text-teal-400 opacity-60" />
                      </div>
                    </motion.div>
                    <p className="text-lg font-medium mb-1">No scripts yet</p>
                    <p className="text-sm mb-6 text-muted-foreground/70">
                      Get started by seeding sample data or creating a script
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleSeed}
                        className="gap-1.5"
                      >
                        <Database className="size-3.5" />
                        Seed Sample Data
                      </Button>
                      <Button
                        onClick={() => setCreateDialogOpen(true)}
                        className="gap-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                      >
                        <FileCode2 className="size-3.5" />
                        Create Script
                      </Button>
                    </div>
                    <div className="mt-6 flex items-center gap-4 text-xs text-muted-foreground/40">
                      <span className="flex items-center gap-1">
                        <kbd className="text-[10px] bg-muted/50 rounded px-1.5 py-0.5 border">⌘K</kbd>
                        Search
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="text-[10px] bg-muted/50 rounded px-1.5 py-0.5 border">N</kbd>
                        New script
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="text-[10px] bg-muted/50 rounded px-1.5 py-0.5 border">?</kbd>
                        Shortcuts
                      </span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center"
                  >
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      className="mb-4"
                    >
                      <div className="size-20 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 flex items-center justify-center border border-orange-200/50 dark:border-orange-800/50">
                        <Search className="size-8 text-orange-500 dark:text-orange-400 opacity-60" />
                      </div>
                    </motion.div>
                    <p className="text-lg font-medium mb-1">No matching scripts</p>
                    <p className="text-sm mb-6 text-muted-foreground/70">
                      Try adjusting your search or filters
                    </p>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setFilters({ search: '', category: 'All', tags: [], language: '' })
                      }
                    >
                      Clear All Filters
                    </Button>
                  </motion.div>
                )}
              </div>
            ) : filters.viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {displayed.map((script, index) => (
                  <ScriptCard
                    key={script.id}
                    script={script}
                    viewMode="grid"
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {displayed.map((script, index) => (
                  <ScriptCard
                    key={script.id}
                    script={script}
                    viewMode="list"
                    index={index}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Footer */}
      <Footer />

      {/* Mobile Quick Actions FAB */}
      {isMobile && (
        <div className="fixed bottom-16 right-4 z-50 flex flex-col items-end gap-2">
          <AnimatePresence>
            {fabOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 20 }}
                  transition={{ duration: 0.15 }}
                >
                  <Button
                    size="sm"
                    onClick={() => {
                      setCreateDialogOpen(true)
                      setFabOpen(false)
                    }}
                    className="gap-1.5 shadow-lg bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-full px-4"
                  >
                    <FileCode2 className="size-3.5" />
                    Create Script
                  </Button>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 20 }}
                  transition={{ duration: 0.15, delay: 0.05 }}
                >
                  <Button
                    size="sm"
                    onClick={() => {
                      setGeneratorOpen(true)
                      setFabOpen(false)
                    }}
                    className="gap-1.5 shadow-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-full px-4"
                  >
                    <Sparkles className="size-3.5" />
                    Generate Script
                  </Button>
                </motion.div>
                {scripts.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    transition={{ duration: 0.15, delay: 0.1 }}
                  >
                    <Button
                      size="sm"
                      onClick={() => {
                        handleSeed()
                        setFabOpen(false)
                      }}
                      className="gap-1.5 shadow-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-full px-4"
                    >
                      <Database className="size-3.5" />
                      Seed Data
                    </Button>
                  </motion.div>
                )}
              </>
            )}
          </AnimatePresence>
          <motion.button
            onClick={() => setFabOpen(!fabOpen)}
            className="size-12 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
            whileTap={{ scale: 0.9 }}
            aria-label="Quick actions"
          >
            <motion.div
              animate={{ rotate: fabOpen ? 45 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <Plus className="size-5" />
            </motion.div>
          </motion.button>
        </div>
      )}

      {/* Overlays and Dialogs */}
      {isMobile && mobileSidebar}
      <ScriptDetailPanel />
      <ScriptGenerator />
      <CreateScriptDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      <EditScriptDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        scriptId={editScriptId}
      />
      <ImportScriptsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
      <KeyboardShortcutsDialog />
    </div>
  )
}
