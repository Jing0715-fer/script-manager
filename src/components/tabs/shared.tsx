'use client';

import React from 'react';

// ─── Empty State (shared across tabs) ────────────────────────────

export function TabEmptyState({
  icon, title, description, actions,
}: {
  icon: React.ReactNode; title: string; description: string; actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-3 opacity-40">{icon}</div>
      <h3 className="text-sm font-semibold mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-[250px]">{description}</p>
      {actions}
    </div>
  );
}

// ─── ANSI Color Parsing ───────────────────────────────────────────

const ANSI_STYLES: Record<string, string> = {
  '0': 'color: inherit; font-weight: inherit;',
  '1': 'font-weight: bold;',
  '2': 'opacity: 0.7;',
  '3': 'font-style: italic;',
  '31': 'color: #ef4444;',
  '32': 'color: #22c55e;',
  '33': 'color: #eab308;',
  '34': 'color: #3b82f6;',
  '35': 'color: #a855f7;',
  '36': 'color: #06b6d4;',
  '37': 'color: #e5e7eb;',
  '90': 'color: #6b7280;',
  '91': 'color: #f87171;',
  '92': 'color: #4ade80;',
  '93': 'color: #facc15;',
  '94': 'color: #60a5fa;',
  '95': 'color: #c084fc;',
  '96': 'color: #22d3ee;',
  '97': 'color: #f3f4f6;',
};

const ANSI_REGEX = /\x1b\[([0-9;]*)m/g;

export function parseAnsiToSpans(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = ANSI_REGEX.exec(text)) !== null) {
    // Push text before this escape sequence
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const codes = match[1].split(';');
    const styleParts: string[] = [];

    for (const code of codes) {
      if (ANSI_STYLES[code]) {
        styleParts.push(ANSI_STYLES[code]);
      }
    }

    // We'll apply the style on the next text segment
    if (styleParts.length > 0) {
      // Find the next escape or end of string
      const afterSeq = match.index + match[0].length;
      const nextEscape = text.slice(afterSeq).search(/\x1b\[/);
      const endIdx = nextEscape === -1 ? text.length : afterSeq + nextEscape;

      const styledText = text.slice(afterSeq, endIdx);
      if (styledText.length > 0) {
        parts.push(
          <span key={match.index} style={{ display: 'inline', ...parseStyleString(styleParts.join(' ')) }}>
            {renderContentLinks(styledText)}
          </span>
        );
      }

      lastIndex = endIdx;
      ANSI_REGEX.lastIndex = endIdx;
    } else {
      lastIndex = match.index + match[0].length;
    }
  }

  // Push remaining text
  if (lastIndex < text.length) {
    parts.push(renderContentLinks(text.slice(lastIndex)));
  }

  return parts.length > 0 ? parts : [text];
}

function parseStyleString(styleStr: string): React.CSSProperties {
  const styles: React.CSSProperties = {};
  const pairs = styleStr.split(';').map(p => p.trim()).filter(Boolean);
  for (const pair of pairs) {
    const [key, value] = pair.split(':').map(s => s.trim());
    if (key && value) {
      switch (key) {
        case 'color': styles.color = value; break;
        case 'font-weight': styles.fontWeight = value as any; break;
        case 'opacity': styles.opacity = parseFloat(value); break;
        case 'font-style': styles.fontStyle = value as any; break;
      }
    }
  }
  return styles;
}

// ─── URL + File Path detection in text ───────────────────────────

function renderContentLinks(text: string): React.ReactNode {
  // Split by URLs and file paths, wrapping them in clickable spans
  const parts: React.ReactNode[] = [];
  const urlRegex = /(https?:\/\/[^\s<>"')\]]+)/g;
  const filePathRegex = /(\/(?:[\w.-]+\/)*[\w.-]+)/g;

  let lastIndex = 0;
  let combinedRegex = new RegExp(`${urlRegex.source}|${filePathRegex.source}`, 'g');
  let match: RegExpExecArray | null;

  while ((match = combinedRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const matchedText = match[0];

    if (matchedText.startsWith('http://') || matchedText.startsWith('https://')) {
      parts.push(
        <a
          key={match.index}
          href={matchedText}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 decoration-cyan-400/50"
          onClick={(e) => e.stopPropagation()}
        >
          {matchedText}
        </a>
      );
    } else {
      parts.push(
        <span key={match.index} className="text-amber-400/80 font-medium">
          {matchedText}
        </span>
      );
    }

    lastIndex = match.index + matchedText.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

// ─── Formatted Timer ────────────────────────────────────────────

export function formatTimer(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor((ms % 1000) / 10);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(2, '0')}`;
}

// ─── localStorage helpers ────────────────────────────────────────

export function loadNotes(scriptId: string): string {
  try {
    return localStorage.getItem(`scripthub-notes-${scriptId}`) || '';
  } catch { return ''; }
}

export function saveNotes(scriptId: string, notes: string) {
  try {
    localStorage.setItem(`scripthub-notes-${scriptId}`, notes);
  } catch { /* ignore */ }
}
