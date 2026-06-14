// @ts-nocheck
'use client';

import { useState, useMemo } from 'react';
import { Search, Code2, Terminal, Braces, Loader2, Check, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from '@/lib/framer-motion-shim';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { apiPost } from '@/lib/api-client';
import { LanguageIcon } from '@/components/LanguageIcon';

// ─── Template Types ──────────────────────────────────────────────

interface ScriptTemplate {
  id: string;
  name: string;
  description: string;
  language: string;
  category: string;
  content: string;
  filename: string;
}

// ─── Template Data ──────────────────────────────────────────────

const TEMPLATES: ScriptTemplate[] = [
  // Python templates
  {
    id: 'py-http-server',
    name: 'HTTP Server',
    description: 'A simple HTTP server that serves files from a directory with logging support',
    language: 'python',
    category: 'Networking',
    filename: 'http_server.py',
    content: `#!/usr/bin/env python3
"""Simple HTTP Server with logging and directory listing."""

import http.server
import socketserver
import os
import argparse
from datetime import datetime

PORT = 8080
DIRECTORY = "."

class LoggingHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP request handler with request logging."""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def log_message(self, format, *args):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {self.address_string()} - {format % args}")

def main():
    parser = argparse.ArgumentParser(description="Simple HTTP Server")
    parser.add_argument("-p", "--port", type=int, default=PORT)
    parser.add_argument("-d", "--directory", default=DIRECTORY)
    args = parser.parse_args()
    
    with socketserver.TCPServer(("", args.port), LoggingHandler) as httpd:
        print(f"Serving {args.directory} on port {args.port}")
        print(f"Open http://localhost:{args.port}")
        httpd.serve_forever()

if __name__ == "__main__":
    main()`,
  },
  {
    id: 'py-web-scraper',
    name: 'Web Scraper',
    description: 'Fetches and parses web pages to extract data using regex and string matching',
    language: 'python',
    category: 'Data',
    filename: 'web_scraper.py',
    content: `#!/usr/bin/env python3
"""Simple web scraper that extracts links and text from a URL."""

import urllib.request
import re
import json
from html.parser import HTMLParser

class TextExtractor(HTMLParser):
    """Extract visible text and links from HTML."""
    def __init__(self):
        super().__init__()
        self.links = []
        self.text_parts = []
        self._skip = False
    
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self._skip = True
        if tag == 'a':
            href = dict(attrs).get('href', '')
            if href:
                self.links.append(href)
    
    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self._skip = False
    
    def handle_data(self, data):
        if not self._skip:
            stripped = data.strip()
            if stripped:
                self.text_parts.append(stripped)

def scrape(url):
    """Scrape a URL and return links and text."""
    req = urllib.request.Request(url, headers={'User-Agent': 'ScriptHub/1.0'})
    with urllib.request.urlopen(req, timeout=10) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
    
    parser = TextExtractor()
    parser.feed(html)
    
    return {
        "url": url,
        "links": list(set(parser.links))[:20],
        "text_length": len(' '.join(parser.text_parts)),
        "paragraphs": [t for t in parser.text_parts if len(t) > 50][:5],
    }

if __name__ == "__main__":
    import sys
    url = sys.argv[1] if len(sys.argv) > 1 else "https://example.com"
    result = scrape(url)
    print(json.dumps(result, indent=2, ensure_ascii=False))`,
  },
  {
    id: 'py-file-organizer',
    name: 'File Organizer',
    description: 'Organizes files in a directory by extension into categorized folders',
    language: 'python',
    category: 'Utilities',
    filename: 'file_organizer.py',
    content: `#!/usr/bin/env python3
"""File organizer: sort files by extension into categorized folders."""

import os
import shutil
from pathlib import Path
from collections import defaultdict

CATEGORY_MAP = {
    'Images': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'],
    'Documents': ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xlsx', 'csv'],
    'Audio': ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'],
    'Video': ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv'],
    'Code': ['py', 'js', 'ts', 'html', 'css', 'json', 'xml', 'sh', 'rb', 'go'],
    'Archives': ['zip', 'tar', 'gz', 'rar', '7z'],
}

def organize(directory="."):
    """Organize files in the given directory."""
    directory = Path(directory)
    files = [f for f in directory.iterdir() if f.is_file()]
    
    stats = defaultdict(int)
    moved = 0
    
    for filepath in files:
        ext = filepath.suffix.lstrip('.').lower()
        
        target_category = 'Other'
        for category, extensions in CATEGORY_MAP.items():
            if ext in extensions:
                target_category = category
                break
        
        target_dir = directory / target_category
        target_dir.mkdir(exist_ok=True)
        
        dest = target_dir / filepath.name
        if not dest.exists():
            shutil.move(str(filepath), str(dest))
            moved += 1
        
        stats[target_category] += 1
    
    print(f"Organized {moved} files:")
    for cat, count in sorted(stats.items()):
        print(f"  {cat}: {count} files")

if __name__ == "__main__":
    import sys
    target = sys.argv[1] if len(sys.argv) > 1 else "."
    organize(target)`,
  },
  {
    id: 'py-data-processor',
    name: 'Data Processor',
    description: 'Process CSV/JSON data with filtering, aggregation, and summary statistics',
    language: 'python',
    category: 'Data',
    filename: 'data_processor.py',
    content: `#!/usr/bin/env python3
"""Data processor: filter, aggregate, and summarize tabular data."""

import json
import sys
from collections import Counter

def summarize(data, group_by=None):
    """Generate summary statistics for a list of records."""
    if not data:
        return {"error": "No data provided"}
    
    stats = {
        "total_records": len(data),
        "keys": list(data[0].keys()),
    }
    
    if group_by and group_by in data[0]:
        groups = Counter(r[group_by] for r in data)
        stats["group_counts"] = dict(groups.most_common())
    
    # Numeric column summaries
    for key in data[0]:
        values = [r[key] for r in data if isinstance(r.get(key), (int, float))]
        if values:
            stats[f"{key}_stats"] = {
                "min": min(values),
                "max": max(values),
                "avg": round(sum(values) / len(values), 2),
            }
    
    return stats

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("file", help="JSON file to process")
    parser.add_argument("--group", help="Field to group by")
    parser.add_argument("--filter", help="Filter field:value")
    args = parser.parse_args()
    
    with open(args.file) as f:
        data = json.load(f)
    
    if args.filter:
        field, _, value = args.filter.partition(":")
        data = [r for r in data if str(r.get(field, "")) == value]
    
    result = summarize(data, args.group)
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()`,
  },
  // Bash templates
  {
    id: 'sh-log-rotator',
    name: 'Log Rotator',
    description: 'Rotates, compresses, and prunes old log files based on age and size',
    language: 'bash',
    category: 'Maintenance',
    filename: 'log_rotator.sh',
    content: [
      '#!/usr/bin/env bash',
      '# Log Rotator: rotate, compress, and prune old log files',
      '# Usage: ./log_rotator.sh [directory] [max_age_days] [max_size_mb]',
      '',
      'DIR="${1:-.}"',
      'MAX_AGE="${2:-30}"',
      'MAX_SIZE="${3:-100}"  # MB',
      '',
      'echo "=== Log Rotator ==="',
      'echo "Directory: $DIR"',
      'echo "Max age: $MAX_AGE days"',
      'echo "Max size: $MAX_SIZE MB"',
      '',
      'rotated=0',
      'removed=0',
      'saved_space=0',
      '',
      'while IFS= read -r -d \'\' \'\' file; do',
      '    filepath="$file"',
      '    filename=$(basename "$filepath")',
      '    size=$(du -m "$filepath" 2>/dev/null | cut -f1)',
      '    age=$(( ($(date +%s) - $(stat -c %Y "$filepath" 2>/dev/null || echo 0)) / 86400 ))',
      '',
      '    # Remove files older than max age',
      '    if [ "$age" -gt "$MAX_AGE" ]; then',
      '        rm -f "$filepath"',
      '        echo "  Removed: $filename (age: ${age}d)"',
      '        removed=$((removed + 1))',
      '        saved_space=$((saved_space + size))',
      '        continue',
      '    fi',
      '',
      '    # Compress large files',
      '    if [ "$size" -gt "$MAX_SIZE" ] && [[ ! "$filename" =~ \\.gz$ ]]; then',
      '        gzip -f "$filepath"',
      '        echo "  Compressed: $filename (${size}MB)"',
      '        rotated=$((rotated + 1))',
      '    fi',
      'done < <(find "$DIR" -type f -name "*.log" -print0 2>/dev/null)',
      '',
      'echo ""',
      'echo "=== Summary ==="',
      'echo "Compressed: $rotated files"',
      'echo "Removed: $removed files"',
      'echo "Space saved: ${saved_space}MB"',
    ].join('\n'),
  },
  {
    id: 'sh-system-backup',
    name: 'System Backup',
    description: 'Creates timestamped backups of specified directories with compression',
    language: 'bash',
    category: 'Maintenance',
    filename: 'system_backup.sh',
    content: [
      '#!/usr/bin/env bash',
      '# System Backup: create timestamped compressed backups',
      '# Usage: ./system_backup.sh [backup_dir] [source_dirs...]',
      '',
      'BACKUP_DIR="${1:-/tmp/backups}"',
      'TIMESTAMP=$(date +%Y%m%d_%H%M%S)',
      'BACKUP_NAME="backup_${TIMESTAMP}.tar.gz"',
      '',
      'mkdir -p "$BACKUP_DIR"',
      '',
      'sources=("${@:2}")',
      'if [ ${#sources[@]} -eq 0 ]; then',
      '    # Default: backup common config directories',
      '    sources=(~/.config ~/.bashrc ~/.profile ~/.ssh)',
      'fi',
      '',
      'echo "=== System Backup ==="',
      'echo "Timestamp: $TIMESTAMP"',
      'echo "Backup to: $BACKUP_DIR/$BACKUP_NAME"',
      'echo "Sources: ${sources[*]}"',
      '',
      'total_size=0',
      'valid_sources=()',
      '',
      'for src in "${sources[@]}"; do',
      '    if [ -e "$src" ]; then',
      '        valid_sources+=("$src")',
      '        size=$(du -sh "$src" 2>/dev/null | cut -f1)',
      '        echo "  + $src ($size)"',
      '    else',
      '        echo "  ! $src not found, skipping"',
      '    fi',
      'done',
      '',
      'if [ ${#valid_sources[@]} -eq 0 ]; then',
      '    echo "Error: No valid sources to backup"',
      '    exit 1',
      'fi',
      '',
      'echo ""',
      'echo "Creating backup..."',
      'tar -czf "$BACKUP_DIR/$BACKUP_NAME" "${valid_sources[@]}" 2>/dev/null',
      'result=$?',
      '',
      'if [ $result -eq 0 ]; then',
      '    backup_size=$(du -sh "$BACKUP_DIR/$BACKUP_NAME" | cut -f1)',
      '    echo "Backup created: $BACKUP_DIR/$BACKUP_NAME ($backup_size)"',
      'else',
      '    echo "Error: Backup failed with exit code $result"',
      '    exit 1',
      'fi',
      '',
      '# Prune old backups (keep last 7)',
      'ls -t "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm -f',
      'echo "Old backups pruned (keeping last 7)"',
    ].join('\n'),
  },
  {
    id: 'sh-disk-usage',
    name: 'Disk Usage Monitor',
    description: 'Monitors disk usage across mount points and alerts when thresholds are exceeded',
    language: 'bash',
    category: 'Monitoring',
    filename: 'disk_usage_monitor.sh',
    content: [
      '#!/usr/bin/env bash',
      '# Disk Usage Monitor: check disk space and alert on thresholds',
      '# Usage: ./disk_usage_monitor.sh [warning_percent] [critical_percent]',
      '',
      'WARN="${1:-80}"',
      'CRIT="${2:-95}"',
      '',
      'echo "=== Disk Usage Monitor ==="',
      'echo "Warning threshold: ${WARN}%"',
      'echo "Critical threshold: ${CRIT}%"',
      'echo ""',
      '',
      'alert_count=0',
      '',
      'while read -r line; do',
      '    usage=$(echo "$line" | awk \'{print $5}\' | tr -d \'%\')',
      '    mount=$(echo "$line" | awk \'{print $6}\')',
      '',
      '    if [ "$usage" -ge "$CRIT" ]; then',
      '        echo "[CRITICAL] $mount: ${usage}% used"',
      '        alert_count=$((alert_count + 1))',
      '    elif [ "$usage" -ge "$WARN" ]; then',
      '        echo "[WARNING]  $mount: ${usage}% used"',
      '        alert_count=$((alert_count + 1))',
      '    else',
      '        echo "[OK]       $mount: ${usage}% used"',
      '    fi',
      'done < <(df -h --output=pcent,target -x tmpfs -x devtmpfs 2>/dev/null | tail -n +2)',
      '',
      'echo ""',
      'if [ $alert_count -gt 0 ]; then',
      '    echo "Alerts: $alert_count mount point(s) above threshold"',
      'else',
      '    echo "All mount points within normal limits"',
      'fi',
      '',
      '# Show top 10 largest directories in /',
      'echo ""',
      'echo "=== Top 10 Largest Directories ==="',
      'du -sh /* 2>/dev/null | sort -rh | head -10 | while read -r size path; do',
      '    echo "  $size  $path"',
      'done',
    ].join('\n'),
  },
  {
    id: 'sh-process-killer',
    name: 'Process Killer',
    description: 'Find and kill processes by name, port, or resource usage threshold',
    language: 'bash',
    category: 'System',
    filename: 'process_killer.sh',
    content: [
      '#!/usr/bin/env bash',
      '# Process Killer: find and kill processes by name, port, or resource usage',
      '# Usage: ./process_killer.sh [--name PATTERN | --port PORT | --mem-percent N]',
      '',
      'MODE="name"',
      'TARGET=""',
      '',
      'while [[ $# -gt 0 ]]; do',
      '    case $1 in',
      '        --name) MODE="name"; TARGET="$2"; shift 2 ;;',
      '        --port) MODE="port"; TARGET="$2"; shift 2 ;;',
      '        --mem) MODE="mem"; TARGET="$2"; shift 2 ;;',
      '        --list) MODE="list"; shift ;;',
      '        *) TARGET="$1"; shift ;;',
      '    esac',
      'done',
      '',
      'echo "=== Process Killer ==="',
      '',
      'case $MODE in',
      '    name)',
      '        echo "Finding processes matching: $TARGET"',
      '        pids=$(pgrep -if "$TARGET" 2>/dev/null)',
      '        ;;',
      '    port)',
      '        echo "Finding processes on port: $TARGET"',
      '        pids=$(lsof -ti :"$TARGET" 2>/dev/null)',
      '        ;;',
      '    mem)',
      '        echo "Finding processes using >${TARGET}% memory"',
      '        pids=$(ps aux --sort=-%mem | awk -v threshold="$TARGET" \'"NR > 1 && $4 > threshold { print $2 }\'")',
      '        ;;',
      '    list)',
      '        echo "Top 15 processes by memory:"',
      '        ps aux --sort=-%mem | head -16 | awk \'" { printf "  PID: %-6s MEM: %5s%%  CPU: %5s%%  %s\\n", $2, $4, $3, $11 }\'',
      '        exit 0',
      '        ;;',
      'esac',
      '',
      'if [ -z "$pids" ]; then',
      '    echo "No matching processes found"',
      '    exit 0',
      'fi',
      '',
      'echo ""',
      'for pid in $pids; do',
      '    info=$(ps -p "$pid" -o pid,ppid,%mem,%cpu,comm --no-headers 2>/dev/null)',
      '    if [ -n "$info" ]; then',
      '        echo "  Found: $info"',
      '    fi',
      'done',
      '',
      'echo ""',
      'read -p "Kill these processes? [y/N] " confirm',
      'if [[ "$confirm" =~ ^[Yy]$ ]]; then',
      '    for pid in $pids; do',
      '        kill -9 "$pid" 2>/dev/null && echo "  Killed PID $pid"',
      '    done',
      '    echo "Done"',
      'else',
      '    echo "Cancelled"',
      'fi',
    ].join('\n'),
  },
];

// ─── Language filter options ─────────────────────────────────────

const LANGUAGES = ['All', 'Python', 'Bash', 'JavaScript'];
const LANG_LABELS: Record<string, string> = {
  Python: 'Python',
  Bash: 'Bash',
  JavaScript: 'JS',
};

// ─── Template Gallery Component ──────────────────────────────────

export function TemplateGallery({
  open,
  onOpenChange,
  onTemplateSelected,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateSelected?: (code: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('All');
  const [creating, setCreating] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return TEMPLATES.filter(t => {
      if (language !== 'All' && t.language !== language.toLowerCase()) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [search, language]);

  const handleUseTemplate = async (template: ScriptTemplate) => {
    // If onTemplateSelected callback is provided, fill the current script instead
    if (onTemplateSelected) {
      onTemplateSelected(template.content);
      toast.success(`Applied "${template.name}" template to current script`);
      onOpenChange(false);
      return;
    }
    setCreating(template.id);
    try {
      await apiPost('/api/scripts', {
        name: template.name,
        description: template.description,
        filename: template.filename,
        content: template.content,
        category: template.category,
        language: template.language === 'bash' ? 'shell' : template.language,
        source: 'template',
      });
      toast.success(`Created "${template.name}" from template`);
      onOpenChange(false);
    } catch {
      toast.error('Failed to create script from template');
    } finally {
      setCreating(null);
    }
  };

  // Group by language for display
  const grouped = useMemo(() => {
    const groups: Record<string, ScriptTemplate[]> = {};
    filtered.forEach(t => {
      const lang = t.language.charAt(0).toUpperCase() + t.language.slice(1);
      if (!groups[lang]) groups[lang] = [];
      groups[lang].push(t);
    });
    return groups;
  }, [filtered]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="size-7 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm">
              <Braces className="size-3.5 text-white" />
            </div>
            Script Templates
          </DialogTitle>
          <DialogDescription>
            Choose from {TEMPLATES.length} pre-built templates to get started quickly
          </DialogDescription>
        </DialogHeader>

        {/* Search and filter bar */}
        <div className="px-6 pt-4 pb-2 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(lang => (
                <SelectItem key={lang} value={lang} className="text-xs">
                  {lang === 'All' ? 'All' : LANG_LABELS[lang] || lang} {lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="text-[10px] shrink-0">
            {filtered.length} template{filtered.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Templates grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="size-8 mb-2 opacity-40" />
              <p className="text-sm">No templates match your search</p>
              <Button
                variant="ghost"
                size="xs"
                className="mt-2 text-xs"
                onClick={() => { setSearch(''); setLanguage('All'); }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AnimatePresence mode="popLayout">
                {Object.entries(grouped).map(([lang, templates]) => (
                  templates.map((template, idx) => (
                    <motion.div
                      key={template.id}
                      layout
                      initial={{ opacity: 0, y: 12, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{
                        duration: 0.25,
                        delay: idx * 0.05,
                        layout: { duration: 0.2 },
                      }}
                      className="template-card-hover rounded-xl border bg-card/50 overflow-hidden"
                    >
                      <div className="p-4">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`size-6 rounded-md flex items-center justify-center shrink-0 ${
                              template.language === 'python'
                                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                                : template.language === 'bash'
                                ? 'bg-amber-100 dark:bg-amber-900/30'
                                : 'bg-sky-100 dark:bg-sky-900/30'
                            }`}>
                              <LanguageIcon language={template.language} className="text-[10px]" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-semibold truncate">{template.name}</h4>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-muted-foreground">
                                  {LANG_LABELS[template.language] || template.language}
                                </span>
                                <span className="text-muted-foreground/30">·</span>
                                <span className="text-[10px] text-muted-foreground">{template.category}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                          {template.description}
                        </p>

                        {/* Preview code */}
                        <div className="rounded-lg bg-muted/50 border overflow-hidden mb-3">
                          <pre className="text-[10px] font-mono p-2.5 overflow-hidden text-muted-foreground leading-relaxed" style={{ maxHeight: '80px' }}>
                            <code>{(template.content || '').split('\n').slice(0, 4).join('\n')}...</code>
                          </pre>
                        </div>

                        {/* Action */}
                        <Button
                          size="xs"
                          className="w-full h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm btn-depth-press"
                          onClick={() => handleUseTemplate(template)}
                          disabled={creating === template.id}
                        >
                          {creating === template.id ? (
                            <><Loader2 className="size-3 animate-spin" />Creating...</>
                          ) : onTemplateSelected ? (
                            <><Code2 className="size-3" />Apply to Script</>
                          ) : (
                            <><Code2 className="size-3" />Use Template</>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  ))
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
