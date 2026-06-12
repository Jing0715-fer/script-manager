'use client'

import {
  FileCode2,
  Star,
  Pin,
  Clock,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Tag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useIsMobile } from '@/hooks/use-mobile'
import { useScriptStore } from '@/store/script-store'
import { CATEGORY_COLORS } from '@/types'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SidebarProps {
  inSheet?: boolean
}

export default function Sidebar({ inSheet = false }: SidebarProps) {
  const isMobile = useIsMobile()
  const {
    filters,
    setFilters,
    sidebarOpen,
    setSidebarOpen,
    scripts,
    filteredScripts,
    categories,
  } = useScriptStore()

  const cats = categories()
  const favoriteCount = scripts.filter((s) => s.isFavorite).length
  const pinnedCount = scripts.filter((s) => s.isPinned).length
  const totalScripts = scripts.length

  const handleCategoryClick = (category: string) => {
    setFilters({ category })
    if (isMobile || inSheet) {
      setSidebarOpen(false)
    }
  }

  const getPopularTags = () => {
    const tagMap = new Map<string, number>()
    scripts.forEach((s) => {
      const tags = (s.tags as string[] | null) ?? []
      tags.forEach((tag) => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1)
      })
    })
    return Array.from(tagMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)
  }

  const handleTagClick = (tag: string) => {
    const currentTags = filters.tags
    if (currentTags.includes(tag)) {
      setFilters({ tags: currentTags.filter((t) => t !== tag) })
    } else {
      setFilters({ tags: [...currentTags, tag] })
    }
  }

  const specialFilters = [
    {
      id: 'All',
      label: 'All Scripts',
      icon: FileCode2,
      count: totalScripts,
      color: 'text-foreground',
    },
    {
      id: 'Favorites',
      label: 'Favorites',
      icon: Star,
      count: favoriteCount,
      color: 'text-amber-500',
    },
    {
      id: 'Pinned',
      label: 'Pinned',
      icon: Pin,
      count: pinnedCount,
      color: 'text-teal-500',
    },
    {
      id: 'Recent',
      label: 'Recent',
      icon: Clock,
      count: 0,
      color: 'text-slate-500',
    },
  ]

  const handleSpecialFilter = (id: string) => {
    if (id === 'Favorites') {
      setFilters({ category: 'All', search: '', tags: [] })
      // We'll use a special approach - filter by isFavorite in filteredScripts
      // For now just set category to All and we'll handle special filters separately
      setFilters({ category: id })
    } else if (id === 'Pinned') {
      setFilters({ category: id })
    } else {
      setFilters({ category: id })
    }
    if (isMobile || inSheet) {
      setSidebarOpen(false)
    }
  }

  const content = (
    <motion.div
      initial={false}
      animate={{ x: 0 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-5 text-teal-600 dark:text-teal-400" />
          {!sidebarOpen && !isMobile && (
            <span className="font-semibold text-sm">Categories</span>
          )}
        </div>
        {!isMobile && !inSheet && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? (
              <ChevronLeft className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </Button>
        )}
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Special Filters */}
          <div className="space-y-0.5 mb-3">
            {specialFilters.map((filter) => {
              const Icon = filter.icon
              const isActive = filters.category === filter.id
              return (
                <button
                  key={filter.id}
                  onClick={() => handleSpecialFilter(filter.id)}
                  className={cn(
                    'flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm transition-colors min-h-[44px]',
                    isActive
                      ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className={cn('size-4 shrink-0', filter.color)} />
                  {(sidebarOpen || isMobile || inSheet) && (
                    <>
                      <span className="flex-1 text-left">{filter.label}</span>
                      <Badge
                        variant="secondary"
                        className="text-xs h-5 min-w-[20px] justify-center"
                      >
                        {filter.count}
                      </Badge>
                    </>
                  )}
                </button>
              )
            })}
          </div>

          <Separator className="my-2" />

          {/* Category List */}
          {(sidebarOpen || isMobile || inSheet) && (
            <div className="space-y-0.5">
              <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Categories
              </p>
              {cats.map((cat) => {
                const colors = CATEGORY_COLORS[cat.name] || CATEGORY_COLORS['General']
                const isActive = filters.category === cat.name
                return (
                  <button
                    key={cat.name}
                    onClick={() => handleCategoryClick(cat.name)}
                    className={cn(
                      'flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm transition-colors min-h-[44px]',
                      isActive
                        ? `${colors.bg} ${colors.text} font-medium`
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <span
                      className={cn(
                        'size-2.5 rounded-full shrink-0',
                        colors.bg,
                        isActive && 'ring-2 ring-offset-1',
                        isActive && colors.border
                      )}
                    />
                    <span className="flex-1 text-left truncate">{cat.name}</span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-xs h-5 min-w-[20px] justify-center',
                        isActive && `${colors.bg} ${colors.text} border-0`
                      )}
                    >
                      {cat.count}
                    </Badge>
                  </button>
                )
              })}
            </div>
          )}

          {/* Collapsed: Just category dots */}
          {!sidebarOpen && !isMobile && !inSheet && (
            <div className="flex flex-col items-center gap-3 py-2">
              {cats.map((cat) => {
                const colors = CATEGORY_COLORS[cat.name] || CATEGORY_COLORS['General']
                const isActive = filters.category === cat.name
                return (
                  <button
                    key={cat.name}
                    onClick={() => handleCategoryClick(cat.name)}
                    className={cn(
                      'size-8 rounded-full flex items-center justify-center transition-colors',
                      isActive
                        ? `${colors.bg} ring-2 ring-offset-1 ${colors.border}`
                        : 'hover:bg-accent'
                    )}
                    title={cat.name}
                    aria-label={`Filter by ${cat.name}`}
                  >
                    <span
                      className={cn('size-2.5 rounded-full', colors.bg)}
                    />
                  </button>
                )
              })}
            </div>
          )}

          {/* Popular Tags */}
          {(sidebarOpen || isMobile || inSheet) && (
            <>
              <Separator className="my-2" />
              <div className="space-y-0.5">
                <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="size-3" />
                  Popular Tags
                </p>
                <ScrollArea className="max-h-48">
                  <div className="flex flex-wrap gap-1.5 px-3 py-1">
                    {getPopularTags().map((tag) => {
                      const isActive = filters.tags.includes(tag.name)
                      return (
                        <button
                          key={tag.name}
                          onClick={() => handleTagClick(tag.name)}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors min-h-[28px]',
                            isActive
                              ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 ring-1 ring-teal-300 dark:ring-teal-700'
                              : 'bg-muted/60 text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                          )}
                          aria-pressed={isActive}
                          aria-label={`Filter by tag: ${tag.name}`}
                        >
                          <span>{tag.name}</span>
                          <span className={cn(
                            'text-[10px] font-medium',
                            isActive ? 'text-teal-500 dark:text-teal-400' : 'text-muted-foreground/70'
                          )}>
                            {tag.count}
                          </span>
                        </button>
                      )
                    })}
                    {getPopularTags().length === 0 && (
                      <p className="text-xs text-muted-foreground/50 py-1">No tags yet</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}

          {/* Collapsed: Tag icon */}
          {!sidebarOpen && !isMobile && !inSheet && (
            <>
              <Separator className="my-2" />
              <div className="flex flex-col items-center gap-1 py-1">
                <span className="text-[10px] text-muted-foreground/50">Tags</span>
                {filters.tags.length > 0 && (
                  <Badge className="size-5 p-0 text-[10px] flex items-center justify-center bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-0">
                    {filters.tags.length}
                  </Badge>
                )}
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Quick Stats */}
      {(sidebarOpen || isMobile || inSheet) && (
        <>
          <Separator />
          <div className="p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Quick Stats</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                <p className="text-lg font-bold text-teal-600 dark:text-teal-400">
                  {totalScripts}
                </p>
                <p className="text-xs text-muted-foreground">Scripts</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                <p className="text-lg font-bold text-amber-500">
                  {favoriteCount}
                </p>
                <p className="text-xs text-muted-foreground">Favorites</p>
              </div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  )

  // On mobile or in Sheet, just render the content
  if (isMobile || inSheet) {
    return content
  }

  // On desktop, render as a fixed sidebar
  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r bg-background/50 transition-all duration-300 shrink-0',
        sidebarOpen ? 'w-60' : 'w-16'
      )}
    >
      {content}
    </aside>
  )
}
