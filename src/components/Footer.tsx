'use client'

import { useEffect, useState } from 'react'
import { Code2, ExternalLink, FileCode2, Star, FolderOpen, Languages, Zap } from 'lucide-react'
import { motion, useSpring } from 'framer-motion'
import { useScriptStore } from '@/store/script-store'
import { cn } from '@/lib/utils'

function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 100, damping: 20 })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    spring.set(value)
  }, [spring, value])

  useEffect(() => {
    const unsubscribe = spring.on('change', (latest) => {
      setDisplay(Math.round(latest))
    })
    return unsubscribe
  }, [spring])

  return <span className="font-semibold text-foreground tabular-nums">{display}</span>
}

export default function Footer() {
  const { scripts } = useScriptStore()

  const totalScripts = scripts.length
  const favorites = scripts.filter((s) => s.isFavorite).length
  const categories = new Set(scripts.map((s) => s.category)).size
  const languages = new Set(scripts.map((s) => s.language)).size

  const stats = [
    { icon: FileCode2, value: totalScripts, label: 'Scripts', color: 'text-teal-500' },
    { icon: Star, value: favorites, label: 'Favs', color: 'text-amber-500' },
    { icon: FolderOpen, value: categories, label: 'Cats', color: 'text-emerald-500' },
    { icon: Languages, value: languages, label: 'Langs', color: 'text-violet-500' },
  ]

  return (
    <footer className="mt-auto relative bg-background/60 backdrop-blur-sm">
      {/* Gradient border at the top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />

      <div className="flex items-center justify-between gap-2 px-4 py-1.5 text-xs text-muted-foreground">
        {/* Stats row - compact */}
        <motion.div
          initial={false}
          animate={{ y: 0 }}
          className="flex items-center gap-2"
        >
          {stats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="flex items-center gap-0.5">
                <Icon className={cn('size-2.5', stat.color)} />
                <AnimatedNumber value={stat.value} />
                <span className="text-muted-foreground/50 hidden sm:inline text-[10px]">{stat.label}</span>
                {i < stats.length - 1 && (
                  <span className="text-border ml-0.5 text-[10px]">·</span>
                )}
              </div>
            )
          })}
        </motion.div>

        {/* Branding */}
        <motion.div
          initial={false}
          animate={{ y: 0 }}
          className="flex items-center gap-1.5"
        >
          <div className="flex items-center gap-1">
            <Zap className="size-3 text-teal-500" />
            <Code2 className="size-3 text-teal-500" />
          </div>
          <span className="font-medium">ScriptHub v1.0</span>
          <span className="text-border mx-0.5">·</span>
          <span className="text-muted-foreground/60">Powered by</span>
          <a
            href="https://z.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 font-medium text-teal-600 dark:text-teal-400 hover:underline"
          >
            Z.ai
            <ExternalLink className="size-2.5" />
          </a>
        </motion.div>
      </div>
    </footer>
  )
}
