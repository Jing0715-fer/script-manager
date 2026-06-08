'use client';

import { useState } from 'react';
import {
  Plus, Loader2, Code2, Globe, FileText, Database, Server, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SCRIPT_CATEGORIES } from '@/lib/shared-constants';

const categories = [...SCRIPT_CATEGORIES];

const languages = [
  { value: 'python', label: 'Python', ext: '.py' },
  { value: 'bash', label: 'Bash', ext: '.sh' },
  { value: 'javascript', label: 'JavaScript', ext: '.js' },
  { value: 'typescript', label: 'TypeScript', ext: '.ts' },
  { value: 'r', label: 'R', ext: '.R' },
  { value: 'perl', label: 'Perl', ext: '.pl' },
  { value: 'ruby', label: 'Ruby', ext: '.rb' },
];

// Script templates
const scriptTemplates = [
  {
    id: 'none',
    name: 'Blank',
    description: 'Start from scratch',
    icon: Code2,
    content: '',
    language: 'python',
  },
  {
    id: 'http-request',
    name: 'HTTP Request',
    description: 'Fetch data from an API endpoint',
    icon: Globe,
    content: `#!/usr/bin/env python3
"""HTTP Request Script"""

import urllib.request
import json

url = "https://api.example.com/data"
headers = {"Accept": "application/json"}

req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode())
    print(json.dumps(data, indent=2))
    print(f"Status: {response.status}")
`,
    language: 'python',
  },
  {
    id: 'file-processor',
    name: 'File Processor',
    description: 'Read and process files',
    icon: FileText,
    content: `#!/usr/bin/env python3
"""File Processor Script"""

import os

INPUT_DIR = "./input"
OUTPUT_DIR = "./output"

os.makedirs(OUTPUT_DIR, exist_ok=True)

for filename in os.listdir(INPUT_DIR):
    filepath = os.path.join(INPUT_DIR, filename)
    if os.path.isfile(filepath):
        with open(filepath, 'r') as f:
            content = f.read()
        # Process content here
        out_path = os.path.join(OUTPUT_DIR, f"processed_{filename}")
        with open(out_path, 'w') as f:
            f.write(content.upper())
        print(f"Processed: {filename}")

print("Done!")
`,
    language: 'python',
  },
  {
    id: 'data-parser',
    name: 'Data Parser',
    description: 'Parse CSV/JSON data',
    icon: Database,
    content: `#!/usr/bin/env python3
"""Data Parser - CSV/JSON"""

import json
import csv

# Parse JSON
json_data = '{"name": "Alice", "age": 30, "city": "NYC"}'
parsed = json.loads(json_data)
print("JSON parsed:", parsed)

# Parse CSV (in-memory example)
csv_data = "name,age,city\\nAlice,30,NYC\\nBob,25,LA\\nCharlie,35,SF"
reader = csv.DictReader(csv_data.strip().split("\\n"))
print("\\nCSV parsed:")
for row in reader:
    print(f"  {row['name']}: {row['age']}y, {row['city']}")

print(f"\\nTotal records: {len(list(csv.DictReader(csv_data.strip().split('\\n'))))}")
`,
    language: 'python',
  },
  {
    id: 'api-server',
    name: 'API Server',
    description: 'Express-style HTTP server',
    icon: Server,
    content: `#!/usr/bin/env node
/** Simple API Server (requires Express) */

const express = require('express');
const app = express();

app.use(express.json());

// In-memory data store
let items = [];
let nextId = 1;

// GET all items
app.get('/api/items', (req, res) => {
  res.json({ items, count: items.length });
});

// POST new item
app.post('/api/items', (req, res) => {
  const item = { id: nextId++, ...req.body, createdAt: new Date() };
  items.push(item);
  res.status(201).json(item);
});

// GET single item
app.get('/api/items/:id', (req, res) => {
  const item = items.find(i => i.id === parseInt(req.params.id));
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
`,
    language: 'javascript',
  },
  {
    id: 'cron-job',
    name: 'Cron Job',
    description: 'Scheduled task runner',
    icon: Clock,
    content: `#!/usr/bin/env python3
"""Cron-style Scheduled Task Runner"""

import time
import datetime
from threading import Thread

# Task configuration: interval in seconds
TASKS = [
    {"name": "Health Check", "interval": 30, "func": "check_health"},
    {"name": "Data Sync", "interval": 60, "func": "sync_data"},
    {"name": "Cleanup", "interval": 300, "func": "cleanup"},
]

def check_health():
    """Simulated health check"""
    print(f"[{now()}] Health check: OK")

def sync_data():
    """Simulated data sync"""
    print(f"[{now()}] Syncing data...")

def cleanup():
    """Simulated cleanup"""
    print(f"[{now()}] Cleanup completed")

def now():
    return datetime.datetime.now().strftime("%H:%M:%S")

def run_task(name, interval, func_name):
    funcs = {"check_health": check_health, "sync_data": sync_data, "cleanup": cleanup}
    func = funcs.get(func_name)
    if not func:
        print(f"Unknown task: {func_name}")
        return
    print(f"[{now()}] Starting task: {name} (every {interval}s)")
    while True:
        try:
            func()
        except Exception as e:
            print(f"[{now()}] Error in {name}: {e}")
        time.sleep(interval)

if __name__ == "__main__":
    print(f"[{now()}] Cron scheduler started")
    for task in TASKS:
        Thread(target=run_task, args=(task["name"], task["interval"], task["func"]), daemon=True).start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print(f"\\n[{now()}] Scheduler stopped")
`,
    language: 'python',
  },
];

const defaultTemplates: Record<string, string> = {
  python: `#!/usr/bin/env python3
"""Script: \${NAME}"""

def main():
    print("Hello from \${NAME}!")

if __name__ == "__main__":
    main()
`,
  bash: `#!/usr/bin/env bash
# Script: \${NAME}

echo "Hello from \${NAME}!"
`,
  javascript: `// Script: \${NAME}

function main() {
  console.log("Hello from \${NAME}!");
}

main();
`,
  typescript: `// Script: \${NAME}

function main(): void {
  console.log("Hello from \${NAME}!");
}

main();
`,
  r: `# Script: \${NAME}

main <- function() {
  cat("Hello from \${NAME}!\\n")
}

main()
`,
  perl: `#!/usr/bin/env perl
# Script: \${NAME}

print "Hello from \${NAME}!\\n";
`,
  ruby: `#!/usr/bin/env ruby
# Script: \${NAME}

def main
  puts "Hello from \${NAME}!"
end

main
`,
};

interface CreateScriptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export default function CreateScriptDialog({ open, onOpenChange, onSaved }: CreateScriptDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Uncategorized');
  const [language, setLanguage] = useState('python');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [useTemplate, setUseTemplate] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState('none');

  const selectedLang = languages.find(l => l.value === language);
  const selectedTemplate = scriptTemplates.find(t => t.id === selectedTemplateId);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    if (useTemplate && !content) {
      const template = defaultTemplates[lang] || '';
      setContent(template.replace(/\$\{NAME\}/g, name || 'My Script'));
    }
  };

  const handleNameChange = (newName: string) => {
    setName(newName);
    if (useTemplate) {
      const template = defaultTemplates[language] || '';
      setContent(template.replace(/\$\{NAME\}/g, newName || 'My Script'));
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = scriptTemplates.find(t => t.id === templateId);
    if (tmpl && tmpl.content) {
      setContent(tmpl.content);
      setLanguage(tmpl.language);
      setUseTemplate(false);
    } else {
      const template = defaultTemplates[language] || '';
      setContent(template.replace(/\$\{NAME\}/g, name || 'My Script'));
      setUseTemplate(true);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Script name is required');
      return;
    }
    if (!content.trim()) {
      toast.error('Script content is required');
      return;
    }

    setSaving(true);
    try {
      const filename = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') + (selectedLang?.ext || '.txt');
      const r = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          filename,
          content,
          category,
          language,
          source: 'manual',
        }),
      });

      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error || 'Failed to create script');
      }

      toast.success('Script created successfully', { description: name });
      onSaved();
      onOpenChange(false);
      // Reset form
      setName('');
      setDescription('');
      setCategory('Uncategorized');
      setLanguage('python');
      setContent('');
      setUseTemplate(true);
      setSelectedTemplateId('none');
    } catch (e: any) {
      toast.error('Failed to create script', { description: e.message || 'Unknown error' });
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-xl" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm">
              <Plus className="size-4 text-white" />
            </div>
            Create New Script
          </DialogTitle>
          <DialogDescription>
            Create a new script from scratch or use a template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Template Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Template</Label>
            <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {scriptTemplates.map(tmpl => (
                  <SelectItem key={tmpl.id} value={tmpl.id}>
                    <div className="flex items-center gap-2">
                      <tmpl.icon className="size-3" />
                      <span>{tmpl.name}</span>
                      <span className="text-[9px] text-muted-foreground">— {tmpl.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Template preview */}
            {selectedTemplate && selectedTemplate.content && (
              <div className="rounded-md border bg-muted/30 p-2">
                <pre className="text-[9px] font-mono text-muted-foreground leading-4 overflow-hidden">
                  {(selectedTemplate.content || '').split('\n').slice(0, 3).map((line, i) => (
                    <div key={i}>
                      <span className="select-none text-muted-foreground/30 pr-2">{i + 1}</span>
                      {line || ' '}
                    </div>
                  ))}
                  <div className="text-muted-foreground/50">...</div>
                </pre>
              </div>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Name *</Label>
            <Input
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="My Awesome Script"
              className="h-9 text-sm"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Description</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What does this script do? Describe its purpose, inputs, and outputs..."
              className="min-h-[80px] text-sm resize-none"
            />
          </div>

          {/* Category & Language */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Language</Label>
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map(lang => (
                    <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filename preview */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Filename:</Label>
            <Badge variant="outline" className="text-[10px] font-mono">
              {name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'untitled'}{selectedLang?.ext || '.txt'}
            </Badge>
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Code *</Label>
              <Button
                variant="ghost"
                size="xs"
                className="text-[10px] gap-1"
                onClick={() => {
                  setUseTemplate(false);
                  setSelectedTemplateId('none');
                  const template = defaultTemplates[language] || '';
                  setContent(template.replace(/\$\{NAME\}/g, name || 'My Script'));
                }}
              >
                <Code2 className="size-3" />
                Load Default
              </Button>
            </div>
            <Textarea
              value={content}
              onChange={e => { setContent(e.target.value); setUseTemplate(false); }}
              placeholder="Write your script code here..."
              className="min-h-[240px] font-mono text-[11px] leading-5 bg-muted/30 resize-y"
              autoFocus={false}
            />
            <p className="text-[10px] text-muted-foreground">
              {content.split('\n').length} lines • {content.length} characters
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t mt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleSave}
            disabled={saving || !name.trim() || !content.trim()}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Create Script
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
