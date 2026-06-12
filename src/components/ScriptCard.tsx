'use client'

import { useState } from 'react'
import {
  Star,
  Pin,
  Play,
  Terminal,
  Eye,
  Clock,
  Code2,
  FileCode2,
  Atom,
  FlaskConical,
  Microscope,
  Snowflake,
  Bot,
  Image as ImageIcon,
  BarChart3,
  FileText,
  Boxes,
  Palette,
  type LucideIcon,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CATEGORY_COLORS } from '@/types'
import type { Script, ViewMode } from '@/types'
import { useScriptStore } from '@/store/script-store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ScriptCardProps {
  script: Script
  viewMode: ViewMode
  index?: number
}

function InteractiveRatingStars({ rating, onRate }: { rating: number; onRate: (r: number) => void }) {
  const [hoverRating, setHoverRating] = useState(0)
  const displayRating = hoverRating || rating

  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => setHoverRating(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={(e) => {
            e.stopPropagation()
            onRate(star)
          }}
          onMouseEnter={() => setHoverRating(star)}
          className="p-0 hover:scale-125 transition-transform cursor-pointer"
          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
        >
          <Star
            className={cn(
              'size-3 transition-colors',
              star <= displayRating
                ? 'fill-amber-400 text-amber-400'
                : 'text-muted-foreground/30 hover:text-amber-300'
            )}
          />
        </button>
      ))}
    </div>
  )
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'size-3',
            star <= rating
              ? 'fill-amber-400 text-amber-400'
              : 'text-muted-foreground/30'
          )}
        />
      ))}
    </div>
  )
}

// Category icon mapping (lucide-react components — no emojis)
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'ChimeraX': Atom,
  'PyMOL': FlaskConical,
  'PDB Processing': Boxes,
  'Visualization': Palette,
  'Antibody Analysis': Microscope,
  'Structural Biology': Microscope,
  'Cryo-EM': Snowflake,
  'AI/ML': Bot,
  'Image Processing': ImageIcon,
  'Data Processing': BarChart3,
  'General': FileText,
}

function LanguageBadge({ language }: { language: string }) {
  const isPython = language.toLowerCase() === 'python'
  const isChimeraX = language.toLowerCase() === 'chimerax'
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] h-5 gap-1 font-medium',
        isPython
          ? 'border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300'
          : isChimeraX
            ? 'border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300'
            : 'border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300'
      )}
    >
      {language}
    </Badge>
  )
}

function TagsBadges({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) return null
  const maxVisible = 2
  const visible = tags.slice(0, maxVisible)
  const overflow = tags.length - maxVisible

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {visible.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="text-[9px] h-4 px-1.5 font-medium bg-muted/60 hover:bg-muted/80"
        >
          {tag}
        </Badge>
      ))}
      {overflow > 0 && (
        <Badge
          variant="secondary"
          className="text-[9px] h-4 px-1.5 font-medium bg-muted/60"
        >
          +{overflow}
        </Badge>
      )}
    </div>
  )
}

function RelativeDate({ date }: { date: string }) {
  const relative = formatDistanceToNow(new Date(date), { addSuffix: true })
    .replace('about ', '')
    .replace('less than a minute ago', 'just now')
    .replace(' minute ago', 'm ago')
    .replace(' minutes ago', 'm ago')
    .replace(' hour ago', 'h ago')
    .replace(' hours ago', 'h ago')
    .replace(' day ago', 'd ago')
    .replace(' days ago', 'd ago')
    .replace(' month ago', 'mo ago')
    .replace(' months ago', 'mo ago')
    .replace(' year ago', 'y ago')
    .replace(' years ago', 'y ago')

  return (
    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
      <Clock className="size-2.5" />
      {relative}
    </span>
  )
}

function CodePreview({ code }: { code: string }) {
  const lines = code.split('\n').slice(0, 3)
  const totalLines = code.split('\n').length
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950 overflow-hidden shadow-sm">
      <div className="flex items-center gap-1.5 px-2 py-1 border-b border-zinc-800 bg-zinc-900">
        <Terminal className="size-2.5 text-emerald-400 shrink-0" />
        <span className="text-[9px] text-zinc-400 font-medium">Preview</span>
        <span className="text-[9px] text-zinc-600 ml-auto font-mono">
          {totalLines} lines
        </span>
      </div>
      <div className="px-2 py-1.5 font-mono text-[9px] leading-relaxed text-zinc-300 max-h-12 overflow-hidden">
        {lines.map((line, i) => (
          <div key={i} className="flex">
            <span className="w-4 text-right mr-2 text-zinc-600 select-none shrink-0">{i + 1}</span>
            <span className="truncate">{line || ' '}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ScriptCard({ script, viewMode, index = 0 }: ScriptCardProps) {
  const { selectScript, toggleFavorite, togglePinned, setRating } = useScriptStore()
  const colors = CATEGORY_COLORS[script.category] || CATEGORY_COLORS['General']
  const CategoryIcon = CATEGORY_ICONS[script.category] || CATEGORY_ICONS['General']

  const handleRate = async (rating: number) => {
    try {
      await setRating(script.id, rating)
      toast.success(`Rated ${rating} star${rating > 1 ? 's' : ''}`)
    } catch {
      toast.error('Failed to update rating')
    }
  }

  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 1, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        whileHover={{ scale: 1.005, y: -1 }}
      >
        <Card
          className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:border-teal-200 dark:hover:border-teal-800 py-0"
          onClick={() => selectScript(script)}
        >
          <div className="flex items-center gap-4 p-4">
            {/* Left: Category icon */}
            <div className="hidden sm:flex items-center justify-center size-10 rounded-lg shrink-0 bg-muted/50 border border-muted-foreground/5">
              <CategoryIcon className="size-5 text-muted-foreground" />
            </div>

            {/* Center: Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-semibold text-sm truncate">{script.name}</h3>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] h-5 shrink-0',
                    colors.bg,
                    colors.text,
                    colors.border
                  )}
                >
                  {script.category}
                </Badge>
                <LanguageBadge language={script.language} />
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {script.description}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <TagsBadges tags={script.tags} />
                <span className="text-[10px] text-muted-foreground/40">·</span>
                <span className="text-[10px] text-muted-foreground/50 flex items-center gap-0.5">
                  <FileCode2 className="size-2.5" />
                  {script.code.split('\n').length} lines
                </span>
                <RelativeDate date={script.updatedAt} />
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <InteractiveRatingStars rating={script.rating} onRate={handleRate} />
              <Badge variant="secondary" className="text-[10px] h-5 ml-2 gap-0.5">
                <Play className="size-2.5" />
                {script.runCount}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleFavorite(script.id)
                }}
                aria-label={script.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Star
                  className={cn(
                    'size-3.5 transition-colors',
                    script.isFavorite
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground group-hover:text-amber-300'
                  )}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={(e) => {
                  e.stopPropagation()
                  togglePinned(script.id)
                }}
                aria-label={script.isPinned ? 'Unpin' : 'Pin'}
              >
                <Pin
                  className={cn(
                    'size-3.5 transition-colors',
                    script.isPinned
                      ? 'fill-teal-500 text-teal-500'
                      : 'text-muted-foreground group-hover:text-teal-400'
                  )}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={(e) => {
                  e.stopPropagation()
                  selectScript(script)
                }}
                aria-label="View details"
              >
                <Eye className="size-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    )
  }

  // Grid view
  return (
    <motion.div
      initial={{ opacity: 1, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ scale: 1.02, y: -2 }}
    >
      <Card
        className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-teal-200 dark:hover:border-teal-800 overflow-hidden relative"
        onClick={() => selectScript(script)}
      >
        {/* Gradient overlay based on category color */}
        <div
          className="absolute top-0 left-0 right-0 h-20 pointer-events-none opacity-40"
          style={{
            background: `linear-gradient(to bottom, var(--category-gradient-color, rgba(20,184,166,0.15)), transparent)`,
          }}
        />
        <div className="relative">
          <CardHeader className="pb-0 pt-4 px-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <CategoryIcon className="size-4 text-muted-foreground shrink-0" />
                  <CardTitle className="text-sm font-semibold line-clamp-1 leading-tight">
                    {script.name}
                  </CardTitle>
                </div>
              </div>
              {script.isPinned && (
                <Pin className="size-3.5 fill-teal-500 text-teal-500 shrink-0 mt-0.5" />
              )}
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-2">
            {/* Category & Language badges */}
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] h-5',
                  colors.bg,
                  colors.text,
                  colors.border
                )}
              >
                {script.category}
              </Badge>
              <LanguageBadge language={script.language} />
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {script.description}
            </p>

            {/* Code preview */}
            <div className="mb-2">
              <CodePreview code={script.code} />
            </div>

            {/* Tags */}
            <div className="mb-2">
              <TagsBadges tags={script.tags} />
            </div>

            {/* Rating, Run count, Date */}
            <div className="flex items-center gap-3 mb-3">
              <InteractiveRatingStars rating={script.rating} onRate={handleRate} />
              <Badge variant="secondary" className="text-[10px] h-5 gap-0.5">
                <Play className="size-2.5" />
                {script.runCount}
              </Badge>
              <RelativeDate date={script.updatedAt} />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(script.id)
                  }}
                  aria-label={script.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Star
                    className={cn(
                      'size-3.5 transition-colors',
                      script.isFavorite
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted-foreground group-hover:text-amber-300'
                    )}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={(e) => {
                    e.stopPropagation()
                    togglePinned(script.id)
                  }}
                  aria-label={script.isPinned ? 'Unpin' : 'Pin'}
                >
                  <Pin
                    className={cn(
                      'size-3.5 transition-colors',
                      script.isPinned
                        ? 'fill-teal-500 text-teal-500'
                        : 'text-muted-foreground group-hover:text-teal-400'
                    )}
                  />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                onClick={(e) => {
                  e.stopPropagation()
                  selectScript(script)
                }}
              >
                <Eye className="size-3" />
                View
              </Button>
            </div>
          </CardContent>
        </div>
      </Card>
    </motion.div>
  )
}
