'use client';

import { Code2, Terminal, Zap, FileCode2, BarChart3, Cog, Gem, Dna, Microscope, Globe, Wrench, type LucideProps } from 'lucide-react';

type IconProps = LucideProps;

const iconMap: Record<string, React.ComponentType<IconProps>> = {
  python: FileCode2,
  bash: Terminal,
  shell: Terminal,
  sh: Terminal,
  javascript: Zap,
  js: Zap,
  node: Zap,
  typescript: FileCode2,
  ts: FileCode2,
  r: BarChart3,
  perl: Cog,
  ruby: Gem,
  chimerax: Dna,
  pymol: Microscope,
  go: Zap,
  rust: Wrench,
  java: Globe,
};

export function LanguageIcon({ language, className, onGradient = false }: { language: string; className?: string; onGradient?: boolean }) {
  const lang = language?.toLowerCase() || '';
  const Icon = iconMap[lang] || Code2;

  if (onGradient) {
    return (
      <span className="relative inline-flex items-center justify-center">
        {/* Dark shadow for depth */}
        <Icon className={`absolute text-black/50 blur-[0.5px] ${className || 'size-3.5'}`} aria-hidden="true" />
        {/* Main white icon with strong shadow */}
        <Icon className={`text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] drop-shadow-[0_0px_1px_rgba(0,0,0,0.4)] ${className || 'size-3.5'}`} />
      </span>
    );
  }

  // Standalone icon - use bright colors with good contrast
  const colorMap: Record<string, string> = {
    python: 'text-emerald-500 dark:text-emerald-400',
    bash: 'text-amber-500 dark:text-amber-400',
    shell: 'text-amber-500 dark:text-amber-400',
    sh: 'text-amber-500 dark:text-amber-400',
    javascript: 'text-yellow-500 dark:text-yellow-400',
    js: 'text-yellow-500 dark:text-yellow-400',
    node: 'text-green-500 dark:text-green-400',
    typescript: 'text-sky-500 dark:text-sky-400',
    ts: 'text-sky-500 dark:text-sky-400',
    r: 'text-blue-500 dark:text-blue-400',
    perl: 'text-gray-500 dark:text-gray-400',
    ruby: 'text-rose-500 dark:text-rose-400',
    chimerax: 'text-purple-500 dark:text-purple-400',
    pymol: 'text-teal-500 dark:text-teal-400',
    go: 'text-cyan-500 dark:text-cyan-400',
    rust: 'text-orange-500 dark:text-orange-400',
    java: 'text-red-500 dark:text-red-400',
  };
  const colorClass = colorMap[lang] || 'text-foreground';
  return <Icon className={`${colorClass} ${className || 'size-3.5'}`} />;
}
