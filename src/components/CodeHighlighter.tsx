'use client'

import dynamic from 'next/dynamic'

const SyntaxHighlighter = dynamic(
  () => import('react-syntax-highlighter').then((mod) => mod.Prism),
  { ssr: false }
)

import { useState, useEffect } from 'react'

interface CodeHighlighterProps {
  language: string
  code: string
  className?: string
  showLineNumbers?: boolean
  maxHeight?: string
}

export default function CodeHighlighter({
  language,
  code,
  className,
  showLineNumbers = true,
  maxHeight,
}: CodeHighlighterProps) {
  const [style, setStyle] = useState<Record<string, React.CSSProperties> | null>(null)

  useEffect(() => {
    import('react-syntax-highlighter/dist/cjs/styles/prism').then((mod) => {
      setStyle(mod.oneDark)
    }).catch(() => {
      // Fallback: no style
    })
  }, [])

  // Render unified box while loading AND after SyntaxHighlighter loads.
  // The wrapper provides the dark background + padding + radius so:
  //   1. Loading state visually matches loaded state (no shift / no duplicate box).
  //   2. Caller doesn't need its own rounded wrapper that ends up overlapping.
  //   3. SyntaxHighlighter uses background:'transparent' so it doesn't double-paint.
  //
  // CRITICAL width fix: long lines must NOT blow out the panel width.
  //
  // Problem: react-syntax-highlighter renders an inner <pre> with default
  // padding:1em and an inner <code> with display:table. Radix <ScrollArea>
  // wraps content in `display: table; min-width: 100%`. Both table layouts
  // make the container shrink-wrap to the widest descendant — so a 1700px
  // line blows the entire panel out to 1700px.
  //
  // Fix strategy (layered):
  //   - Wrapper sets padding, border-radius, background, overflow: auto.
  //   - Override SyntaxHighlighter's customStyle: padding:0, margin:0,
  //     border-radius:0 (so it doesn't double-paint). background:'transparent'
  //     so the wrapper's background shows through.
  //   - codeTagProps forces display:block + min-width:0 to kill the table
  //     shrink-wrap on the inner <code>.
  //   - The wrapper itself has max-width:100%, min-width:0, box-sizing:border-box,
  //     display:block so it can never grow past its parent.
  const inner = !style ? (
    <pre
      style={{
        margin: 0,
        padding: 0,
        background: 'transparent',
        color: '#abb2bf',
        fontFamily: 'monospace',
        fontSize: '0.75rem',
        whiteSpace: 'pre',
        minWidth: '0',
        maxWidth: '100%',
        display: 'block',
        borderRadius: 0,
      }}
    >
      {code}
    </pre>
  ) : (
    <SyntaxHighlighter
      language={language}
      style={style}
      customStyle={{
        margin: 0,
        padding: 0,
        background: 'transparent',
        borderRadius: 0,
        fontSize: '0.75rem',
        minWidth: '0',
        maxWidth: '100%',
        ...(maxHeight ? { maxHeight, overflowY: 'auto' } : {}),
      }}
      codeTagProps={{
        style: {
          whiteSpace: 'pre',
          fontFamily: 'monospace',
          display: 'block',
          minWidth: '0',
        },
      }}
      showLineNumbers={showLineNumbers}
      lineNumberStyle={{ userSelect: 'none' }}
    >
      {code}
    </SyntaxHighlighter>
  )

  return (
    <div
      className={className}
      style={{
        borderRadius: '0.5rem',
        background: '#282c34',
        padding: '0.75rem',
        overflow: 'auto',
        maxWidth: '100%',
        minWidth: 0,
        width: '100%',
        boxSizing: 'border-box',
        display: 'block',
        ...(maxHeight ? { maxHeight, overflowY: 'auto' as const } : {}),
      }}
    >
      {inner}
    </div>
  )
}
