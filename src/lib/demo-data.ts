import type { DemoScript } from '@/types';

/**
 * Shared demo script data for ScriptHub.
 *
 * Used by:
 *  - /api/seed/route.ts  (server-side seeding)
 *  - page.tsx             (client-side fallback when API is unavailable)
 *
 * IMPORTANT: Keep all data serialisable (no Date objects, no functions).
 * The `id` field uses a "demo-" prefix so the client can distinguish
 * fallback data from real database records.
 */



export const DEMO_SCRIPTS: DemoScript[] = [
  {
    id: 'demo-hello-world',
    name: 'Hello World',
    description: 'A simple greeting script that demonstrates basic parameter handling and output formatting.',
    filename: 'hello_world.py',
    content: `#!/usr/bin/env python3
"""A simple greeting script."""
import argparse

parser = argparse.ArgumentParser(description="Greet someone")
parser.add_argument("--name", help="Your name", default="World")
parser.add_argument("--greeting", help="Greeting word", default="Hello")
parser.add_argument("--uppercase", help="Output in uppercase", action="store_true")
args = parser.parse_args()

message = f"{args.greeting}, {args.name}!"
if args.uppercase:
    message = message.upper()
print(message)`,
    category: 'Utility',
    language: 'python',
    source: 'demo',
    sourceUrl: null,
    params: JSON.stringify([
      { name: 'name', type: 'string', description: 'Your name', required: false, default: 'World' },
      { name: 'greeting', type: 'string', description: 'Greeting word', required: false, default: 'Hello' },
      { name: 'uppercase', type: 'boolean', description: 'Output in uppercase', required: false, default: 'false' },
    ]),
    inputFiles: '[]',
    outputFiles: '[]',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { executions: 0 },
    tags: JSON.stringify(['demo', 'greeting']),
  },
  {
    id: 'demo-csv2json',
    name: 'CSV to JSON Converter',
    description: 'Convert CSV files to JSON format with configurable delimiters and output formatting.',
    filename: 'csv2json.py',
    content: `#!/usr/bin/env python3
"""Convert CSV to JSON format."""
import argparse
import json
import csv
import sys

parser = argparse.ArgumentParser(description="Convert CSV to JSON")
parser.add_argument("--input", help="Input CSV file path", required=True)
parser.add_argument("--output", help="Output JSON file path", default="output.json")
parser.add_argument("--delimiter", help="CSV delimiter", default=",")
parser.add_argument("--indent", help="JSON indent level", type=int, default=2)
args = parser.parse_args()

try:
    with open(args.input, 'r') as f:
        reader = csv.DictReader(f, delimiter=args.delimiter)
        data = list(reader)

    with open(args.output, 'w') as f:
        json.dump(data, f, indent=args.indent)

    print(f"Converted {len(data)} rows from {args.input} to {args.output}")
except FileNotFoundError:
    print(f"Error: Input file '{args.input}' not found", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)`,
    category: 'Data',
    language: 'python',
    source: 'demo',
    sourceUrl: null,
    params: JSON.stringify([
      { name: 'input', type: 'file', description: 'Input CSV file path', required: true },
      { name: 'output', type: 'string', description: 'Output JSON file path', required: false, default: 'output.json' },
      { name: 'delimiter', type: 'string', description: 'CSV delimiter', required: false, default: ',' },
    ]),
    inputFiles: JSON.stringify([
      { name: 'csv_input', description: 'CSV file to convert', required: true, format: 'csv' },
    ]),
    outputFiles: JSON.stringify([
      { name: 'json_output', description: 'Converted JSON file', format: 'json' },
    ]),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { executions: 0 },
    tags: JSON.stringify(['data', 'csv', 'json', 'conversion']),
  },
  {
    id: 'demo-sys-monitor',
    name: 'System Monitor',
    description: 'Monitor system resources including CPU, memory, and disk usage. Generates a formatted report.',
    filename: 'sys_monitor.sh',
    content: `#!/bin/bash
# System Monitor Script
# Generates a report of system resource usage

echo "========================================="
echo "       System Monitor Report"
echo "========================================="
echo ""
echo "Date: $(date)"
echo "Hostname: $(hostname)"
echo "Uptime: $(uptime -p)"
echo ""
echo "----- Memory Usage -----"
free -h
echo ""
echo "----- Disk Usage -----"
df -h | head -10
echo ""
echo "----- Top Processes -----"
ps aux --sort=-%mem | head -6
echo ""
echo "========================================="
echo "Report generated successfully"`,
    category: 'System',
    language: 'bash',
    source: 'demo',
    sourceUrl: null,
    params: '[]',
    inputFiles: '[]',
    outputFiles: '[]',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { executions: 0 },
    tags: JSON.stringify(['system', 'monitoring', 'linux']),
  },
  {
    id: 'demo-protein-analyzer',
    name: 'Protein Structure Analyzer',
    description: 'Analyze PDB protein structure files. Extract chain information, residue counts, and generate summary reports for visualization tools like ChimeraX.',
    filename: 'protein_analyzer.py',
    content: `#!/usr/bin/env python3
"""Analyze PDB protein structure files."""
import argparse
import sys

parser = argparse.ArgumentParser(description="Analyze PDB protein structure")
parser.add_argument("--pdb", help="PDB file path", required=True)
parser.add_argument("--chains", help="Chains to analyze (comma-separated)", default="all")
parser.add_argument("--output", help="Output report file", default="analysis_report.txt")
parser.add_argument("--verbose", help="Verbose output", action="store_true")
args = parser.parse_args()

try:
    chains = {}
    atoms = 0
    with open(args.pdb, 'r') as f:
        for line in f:
            if line.startswith('ATOM') or line.startswith('HETATM'):
                atoms += 1
                chain_id = line[21] if len(line) > 21 else '?'
                residue_name = line[17:20].strip() if len(line) > 20 else 'UNK'
                if chain_id not in chains:
                    chains[chain_id] = {'residues': set(), 'atoms': 0}
                chains[chain_id]['atoms'] += 1
                res_seq = line[22:26].strip() if len(line) > 25 else '0'
                chains[chain_id]['residues'].add(f"{residue_name}:{res_seq}")

    report = []
    report.append("Protein Structure Analysis Report")
    report.append("=" * 40)
    report.append(f"File: {args.pdb}")
    report.append(f"Total atoms: {atoms}")
    report.append(f"Chains found: {len(chains)}")
    report.append("")
    for chain_id, data in sorted(chains.items()):
        report.append(f"Chain {chain_id}:")
        report.append(f"  Atoms: {data['atoms']}")
        report.append(f"  Unique residues: {len(data['residues'])}")

    report_text = "\\n".join(report)
    print(report_text)

    with open(args.output, 'w') as f:
        f.write(report_text)
    print(f"\\nReport saved to {args.output}")

except FileNotFoundError:
    print(f"Error: PDB file '{args.pdb}' not found", file=sys.stderr)
    sys.exit(1)`,
    category: 'Structural Biology',
    language: 'python',
    source: 'demo',
    sourceUrl: null,
    params: JSON.stringify([
      { name: 'pdb', type: 'file', description: 'PDB file path', required: true },
      { name: 'chains', type: 'string', description: 'Chains to analyze', required: false, default: 'all' },
      { name: 'output', type: 'string', description: 'Output report file', required: false, default: 'analysis_report.txt' },
    ]),
    inputFiles: JSON.stringify([
      { name: 'pdb_file', description: 'Protein structure file', required: true, format: 'pdb' },
    ]),
    outputFiles: JSON.stringify([
      { name: 'analysis_report', description: 'Analysis report file', format: 'txt' },
    ]),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { executions: 0 },
    tags: JSON.stringify(['biology', 'protein', 'pdb', 'analysis']),
  },
  {
    id: 'demo-port-scanner',
    name: 'Network Port Scanner',
    description: 'Scan network ports and services on a target host. Reports open/closed ports and service information.',
    filename: 'port_scanner.py',
    content: `#!/usr/bin/env python3
"""Network port scanner."""
import argparse
import socket

parser = argparse.ArgumentParser(description="Scan network ports")
parser.add_argument("--host", help="Target host", default="localhost")
parser.add_argument("--start-port", help="Start port", type=int, default=1)
parser.add_argument("--end-port", help="End port", type=int, default=100)
parser.add_argument("--timeout", help="Connection timeout (seconds)", type=float, default=1.0)
args = parser.parse_args()

open_ports = []
closed = 0

print(f"Scanning {args.host} ports {args.start_port}-{args.end_port}...")
for port in range(args.start_port, args.end_port + 1):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(args.timeout)
    result = sock.connect_ex((args.host, port))
    if result == 0:
        try:
            service = socket.getservbyport(port)
        except OSError:
            service = "unknown"
        open_ports.append((port, service))
        print(f"  Port {port}: OPEN ({service})")
    else:
        closed += 1
    sock.close()

print(f"\\nScan complete: {len(open_ports)} open, {closed} closed")`,
    category: 'Network',
    language: 'python',
    source: 'demo',
    sourceUrl: null,
    params: JSON.stringify([
      { name: 'host', type: 'string', description: 'Target host', required: false, default: 'localhost' },
      { name: 'start-port', type: 'number', description: 'Start port', required: false, default: '1' },
      { name: 'end-port', type: 'number', description: 'End port', required: false, default: '100' },
    ]),
    inputFiles: '[]',
    outputFiles: '[]',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { executions: 0 },
    tags: JSON.stringify(['network', 'security', 'port-scan']),
  },
  {
    id: 'demo-batch-rename',
    name: 'Batch File Renamer',
    description: 'Rename multiple files using pattern matching and replacement. Supports regex patterns and dry-run mode.',
    filename: 'batch_rename.py',
    content: `#!/usr/bin/env python3
"""Batch file renamer with pattern matching."""
import argparse
import os
import re

parser = argparse.ArgumentParser(description="Batch rename files")
parser.add_argument("--directory", help="Target directory", default=".")
parser.add_argument("--pattern", help="Search pattern (regex)", required=True)
parser.add_argument("--replacement", help="Replacement string", required=True)
parser.add_argument("--dry-run", help="Preview without renaming", action="store_true")
parser.add_argument("--extension", help="Filter by file extension", default=None)
args = parser.parse_args()

renamed = 0
for filename in os.listdir(args.directory):
    if args.extension and not filename.endswith(args.extension):
        continue

    new_name = re.sub(args.pattern, args.replacement, filename)
    if new_name != filename:
        old_path = os.path.join(args.directory, filename)
        new_path = os.path.join(args.directory, new_name)
        if args.dry_run:
            print(f"[DRY RUN] {filename} -> {new_name}")
        else:
            os.rename(old_path, new_path)
            print(f"[RENAMED] {filename} -> {new_name}")
        renamed += 1

action = "Would rename" if args.dry_run else "Renamed"
print(f"{action} {renamed} file(s)")`,
    category: 'Automation',
    language: 'python',
    source: 'demo',
    sourceUrl: null,
    params: JSON.stringify([
      { name: 'directory', type: 'string', description: 'Target directory', required: false, default: '.' },
      { name: 'pattern', type: 'string', description: 'Search pattern (regex)', required: true },
      { name: 'replacement', type: 'string', description: 'Replacement string', required: true },
      { name: 'extension', type: 'string', description: 'Filter by extension', required: false },
    ]),
    inputFiles: '[]',
    outputFiles: '[]',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { executions: 0 },
    tags: JSON.stringify(['automation', 'files', 'regex']),
  },
  {
    id: 'demo-json-visualizer',
    name: 'JSON Data Visualizer',
    description: 'Parse JSON data and generate ASCII charts and tables. Supports bar charts, histograms, and summary statistics.',
    filename: 'json_visualizer.py',
    content: `#!/usr/bin/env python3
"""Visualize JSON data as ASCII charts."""
import argparse
import json
import sys

parser = argparse.ArgumentParser(description="Visualize JSON data")
parser.add_argument("--input", help="Input JSON file", required=True)
parser.add_argument("--chart-type", help="Chart type", choices=["bar", "table", "summary"], default="summary")
parser.add_argument("--key", help="Key to visualize", default=None)
args = parser.parse_args()

try:
    with open(args.input, 'r') as f:
        data = json.load(f)

    if args.chart_type == "summary":
        if isinstance(data, list):
            print(f"Array with {len(data)} items")
            if data and isinstance(data[0], dict):
                print(f"Fields: {', '.join(data[0].keys())}")
        elif isinstance(data, dict):
            print(f"Object with {len(data)} keys")
            print(f"Keys: {', '.join(data.keys())}")
    elif args.chart_type == "bar" and args.key:
        if isinstance(data, list):
            values = [item.get(args.key, 0) for item in data if isinstance(item, dict)]
            max_val = max(values) if values else 1
            for i, v in enumerate(values[:20]):
                bar = "█" * int((v / max_val) * 40)
                print(f"{i:3d} | {bar} {v}")

    print("\\nVisualization complete.")
except FileNotFoundError:
    print(f"Error: File '{args.input}' not found", file=sys.stderr)
    sys.exit(1)`,
    category: 'Visualization',
    language: 'python',
    source: 'demo',
    sourceUrl: null,
    params: JSON.stringify([
      { name: 'input', type: 'file', description: 'Input JSON file', required: true },
      { name: 'chart-type', type: 'string', description: 'Chart type (bar/table/summary)', required: false, default: 'summary' },
      { name: 'key', type: 'string', description: 'Key to visualize', required: false },
    ]),
    inputFiles: JSON.stringify([
      { name: 'json_input', description: 'JSON data file', required: true, format: 'json' },
    ]),
    outputFiles: '[]',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { executions: 0 },
    tags: JSON.stringify(['visualization', 'json', 'charts', 'ascii']),
  },
  {
    id: 'demo-md2html',
    name: 'Markdown to HTML Converter',
    description: 'Convert Markdown files to HTML with support for tables, code blocks, and custom CSS themes.',
    filename: 'md2html.py',
    content: `#!/usr/bin/env python3
"""Convert Markdown to HTML."""
import argparse
import re
import sys

parser = argparse.ArgumentParser(description="Convert Markdown to HTML")
parser.add_argument("--input", help="Input Markdown file", required=True)
parser.add_argument("--output", help="Output HTML file", default="output.html")
parser.add_argument("--title", help="Page title", default="Document")
parser.add_argument("--theme", help="CSS theme", choices=["light", "dark", "github"], default="github")
args = parser.parse_args()

try:
    with open(args.input, 'r') as f:
        md_content = f.read()

    # Simple markdown to HTML conversion
    html = md_content
    html = re.sub(r'^### (.+)$', r'<h3>\\1</h3>', html, flags=re.MULTILINE)
    html = re.sub(r'^## (.+)$', r'<h2>\\1</h2>', html, flags=re.MULTILINE)
    html = re.sub(r'^# (.+)$', r'<h1>\\1</h1>', html, flags=re.MULTILINE)
    html = re.sub(r'\\*\\*(.+?)\\*\\*', r'<strong>\\1</strong>', html)
    html = re.sub(r'\\*(.+?)\\*', r'<em>\\1</em>', html)
    html = re.sub(r'\`(.+?)\`', r'<code>\\1</code>', html)
    html = re.sub(r'^- (.+)$', r'<li>\\1</li>', html, flags=re.MULTILINE)

    full_html = f"""<!DOCTYPE html>
<html><head><title>{args.title}</title></head>
<body>{html}</body></html>"""

    with open(args.output, 'w') as f:
        f.write(full_html)

    print(f"Converted {args.input} to {args.output}")
except FileNotFoundError:
    print(f"Error: File '{args.input}' not found", file=sys.stderr)
    sys.exit(1)`,
    category: 'Web',
    language: 'python',
    source: 'demo',
    sourceUrl: null,
    params: JSON.stringify([
      { name: 'input', type: 'file', description: 'Input Markdown file', required: true },
      { name: 'output', type: 'string', description: 'Output HTML file', required: false, default: 'output.html' },
      { name: 'title', type: 'string', description: 'Page title', required: false, default: 'Document' },
    ]),
    inputFiles: JSON.stringify([
      { name: 'markdown_input', description: 'Markdown file', required: true, format: 'md' },
    ]),
    outputFiles: JSON.stringify([
      { name: 'html_output', description: 'Converted HTML file', format: 'html' },
    ]),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { executions: 0 },
    tags: JSON.stringify(['web', 'markdown', 'html', 'conversion']),
  },
  {
    id: 'demo-setup-env',
    name: 'Environment Setup',
    description: 'Initialize and configure the Python environment. Check dependencies, install packages, and verify installations.',
    filename: 'setup_env.sh',
    content: `#!/bin/bash
# Environment Setup Script
# Checks and configures the Python environment

echo "Checking Python environment..."
echo ""

# Check Python version
echo "Python Version:"
python3 --version 2>/dev/null || echo "  Python3 not found"
echo ""

# Check pip
echo "Pip Status:"
pip3 --version 2>/dev/null || echo "  pip3 not found"
echo ""

# Check common packages
echo "Checking Common Packages:"
for pkg in numpy pandas matplotlib requests flask; do
    if python3 -c "import $pkg" 2>/dev/null; then
        version=$(python3 -c "import $pkg; print($pkg.__version__)" 2>/dev/null || echo "unknown")
        echo "  OK $pkg ($version)"
    else
        echo "  MISSING $pkg (not installed)"
    fi
done
echo ""

# System info
echo "System Information:"
echo "  OS: $(uname -s)"
echo "  Architecture: $(uname -m)"
echo "  CPU Cores: $(nproc 2>/dev/null || echo 'unknown')"
echo "  Memory: $(free -h 2>/dev/null | awk '/^Mem:/{print $2}' || echo 'unknown')"
echo ""
echo "Environment check complete"`,
    category: 'System',
    language: 'bash',
    source: 'demo',
    sourceUrl: null,
    params: '[]',
    inputFiles: '[]',
    outputFiles: '[]',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { executions: 0 },
    tags: JSON.stringify(['system', 'python', 'environment', 'setup']),
  },
  {
    id: 'demo-security-audit',
    name: 'Security Audit Scanner',
    description: 'Scan files and directories for potential security issues. Checks file permissions, sensitive data exposure, and common vulnerabilities.',
    filename: 'security_audit.py',
    content: `#!/usr/bin/env python3
"""Security audit scanner for files and directories."""
import argparse
import os
import re

parser = argparse.ArgumentParser(description="Security audit scanner")
parser.add_argument("--path", help="Directory to scan", default=".")
parser.add_argument("--check-permissions", help="Check file permissions", action="store_true")
parser.add_argument("--check-secrets", help="Check for hardcoded secrets", action="store_true")
parser.add_argument("--output", help="Output report file", default="security_report.txt")
args = parser.parse_args()

issues = []
files_scanned = 0

# Secret patterns
SECRET_PATTERNS = [
    (r'(?:password|passwd|pwd)\\s*=\\s*["\'][^"\']+["\']', 'Hardcoded password'),
    (r'(?:api[_-]?key|apikey)\\s*=\\s*["\'][^"\']+["\']', 'Hardcoded API key'),
    (r'(?:secret|token)\\s*=\\s*["\'][^"\']+["\']', 'Hardcoded secret/token'),
]

for root, dirs, files in os.walk(args.path):
    for fname in files:
        fpath = os.path.join(root, fname)
        files_scanned += 1

        if args.check_permissions:
            try:
                mode = os.stat(fpath).st_mode
                if mode & 0o002:
                    issues.append(('PERM', fpath, 'World-writable file'))
                if mode & 0o111 and fname.endswith(('.py', '.sh', '.bash')):
                    pass  # Executable scripts are expected
                elif mode & 0o111 and not fname.endswith(('.py', '.sh', '.bash')):
                    issues.append(('PERM', fpath, 'Unexpected executable permission'))
            except OSError:
                pass

        if args.check_secrets and fname.endswith(('.py', '.js', '.ts', '.sh', '.yaml', '.yml', '.env')):
            try:
                with open(fpath, 'r') as f:
                    for i, line in enumerate(f, 1):
                        for pattern, desc in SECRET_PATTERNS:
                            if re.search(pattern, line, re.IGNORECASE):
                                issues.append(('SECRET', f'{fpath}:{i}', desc))
            except (OSError, UnicodeDecodeError):
                pass

report = [
    "Security Audit Report",
    "=" * 40,
    f"Directory: {args.path}",
    f"Files scanned: {files_scanned}",
    f"Issues found: {len(issues)}",
    "",
]

for severity, location, description in issues:
    icon = "[KEY]" if severity == "SECRET" else "[WARN]"
    report.append(f"{icon} [{severity}] {location}: {description}")

if not issues:
    report.append("No security issues found!")

report_text = "\\n".join(report)
print(report_text)

with open(args.output, 'w') as f:
    f.write(report_text)
print(f"\\nReport saved to {args.output}")`,
    category: 'Security',
    language: 'python',
    source: 'demo',
    sourceUrl: null,
    params: JSON.stringify([
      { name: 'path', type: 'string', description: 'Directory to scan', required: false, default: '.' },
      { name: 'check-permissions', type: 'boolean', description: 'Check file permissions', required: false, default: 'true' },
      { name: 'check-secrets', type: 'boolean', description: 'Check for hardcoded secrets', required: false, default: 'true' },
    ]),
    inputFiles: '[]',
    outputFiles: JSON.stringify([
      { name: 'security_report', description: 'Security audit report', format: 'txt' },
    ]),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { executions: 0 },
    tags: JSON.stringify(['security', 'audit', 'vulnerability', 'secrets']),
  },
  // ─── Scripts from pptx-template-editor repo ──────────────────
  {
    id: 'demo-pdf2img',
    name: 'PDF to Image Converter',
    description: 'Convert PDF pages to JPEG images using PyMuPDF (fitz). Supports configurable DPI, quality, and max file size. Faster than pdftoppm with no native dependencies.',
    filename: 'pdf2img.py',
    content: `#!/usr/bin/env python3
"""
PDF to Image converter using PyMuPDF (fitz).

Faster than pdftoppm and has no native dependencies on macOS.
Usage: pdf2img.py <pdf_path> <output_prefix> <dpi> <quality>
Output: writes <output_prefix>-1.jpg, <output_prefix>-2.jpg, ...
"""
import sys
import os
import json
import base64
import io

def main():
    if len(sys.argv) < 5:
        print(json.dumps({"success": False, "error": "Usage: pdf2img.py <pdf> <out_prefix> <dpi> <quality>"}))
        sys.exit(1)
    pdf_path = sys.argv[1]
    out_prefix = sys.argv[2]
    dpi = int(sys.argv[3])
    quality = int(sys.argv[4])
    max_bytes = int(sys.argv[5]) if len(sys.argv) > 5 else 500 * 1024

    try:
        import fitz  # PyMuPDF
    except ImportError:
        print(json.dumps({"success": False, "error": "PyMuPDF not installed. Run: pip install pymupdf"}))
        sys.exit(1)

    try:
        doc = fitz.open(pdf_path)
        written = []
        for i, page in enumerate(doc, start=1):
            # Render at given DPI
            zoom = dpi / 72.0
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            # Encode as JPEG with given quality
            img_bytes = pix.tobytes("jpeg", jpg_quality=quality)
            if len(img_bytes) > max_bytes:
                # Try lower quality
                img_bytes = pix.tobytes("jpeg", jpg_quality=max(40, quality - 20))
            out_path = f"{out_prefix}-{i}.jpg"
            with open(out_path, "wb") as f:
                f.write(img_bytes)
            written.append(out_path)
        doc.close()
        print(json.dumps({"success": True, "files": written, "count": len(written)}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()`,
    category: 'Document Processing',
    language: 'python',
    source: 'github',
    sourceUrl: 'https://github.com/Jing0715-fer/pptx-template-editor/blob/main/scripts/pdf2img.py',
    params: JSON.stringify([
      { name: 'pdf_path', type: 'file', description: 'Input PDF file path', required: true },
      { name: 'out_prefix', type: 'string', description: 'Output file prefix', required: true },
      { name: 'dpi', type: 'number', description: 'Render DPI', required: false, default: '150' },
      { name: 'quality', type: 'number', description: 'JPEG quality (1-100)', required: false, default: '85' },
    ]),
    inputFiles: JSON.stringify([
      { name: 'pdf_input', description: 'PDF file to convert', required: true, format: 'pdf' },
    ]),
    outputFiles: JSON.stringify([
      { name: 'image_output', description: 'Converted JPEG images', format: 'jpg' },
    ]),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { executions: 0 },
    tags: JSON.stringify(['pdf', 'image', 'conversion', 'pymupdf', 'document']),
  },
  {
    id: 'demo-pptx-parser',
    name: 'PPTX Template Parser',
    description: 'Parse PowerPoint (.pptx) files and extract text elements, tables, images, and slide structure. Built for template editing workflows with position-aware element extraction.',
    filename: 'pptx_parser.py',
    content: `#!/usr/bin/env python3
"""
PPTX Template Parser - Extract structured data from PowerPoint files.

Parses .pptx files and extracts:
- Text elements with formatting (bold, italic, font size/color)
- Table elements with cell data
- Image elements with position info
- Slide dimensions and layout data

Requires: pip install python-pptx
"""
import sys
import json
import argparse
from pathlib import Path

def parse_pptx(filepath):
    """Parse a PPTX file and return structured slide data."""
    try:
        from pptx import Presentation
        from pptx.util import Inches, Pt, Emu
    except ImportError:
        return {"success": False, "error": "python-pptx not installed. Run: pip install python-pptx"}

    try:
        prs = Presentation(filepath)
        slides_data = []

        # Slide dimensions (in EMU)
        slide_width = prs.slide_width
        slide_height = prs.slide_height

        for i, slide in enumerate(prs.slides):
            slide_info = {
                "slide_number": i + 1,
                "elements": []
            }

            for shape in slide.shapes:
                element = {
                    "shape_name": shape.shape_id,
                    "shape_type": str(shape.shape_type),
                    "position": {
                        "left": shape.left,
                        "top": shape.top,
                        "width": shape.width,
                        "height": shape.height,
                    }
                }

                if shape.has_text_frame:
                    element["type"] = "text"
                    element["text"] = shape.text_frame.text
                    paragraphs = []
                    for para in shape.text_frame.paragraphs:
                        para_info = {
                            "text": para.text,
                            "runs": []
                        }
                        for run in para.runs:
                            run_info = {
                                "text": run.text,
                                "bold": run.font.bold or False,
                                "italic": run.font.italic or False,
                            }
                            if run.font.size:
                                run_info["font_size_pt"] = run.font.size / 12700
                            para_info["runs"].append(run_info)
                        paragraphs.append(para_info)
                    element["paragraphs"] = paragraphs

                elif shape.has_table:
                    element["type"] = "table"
                    table = shape.table
                    rows = []
                    for row in table.rows:
                        cells = [cell.text for cell in row.cells]
                        rows.append(cells)
                    element["rows"] = rows
                    element["row_count"] = len(rows)
                    element["col_count"] = len(rows[0]) if rows else 0

                elif hasattr(shape, "image"):
                    element["type"] = "image"
                    try:
                        element["image_content_type"] = shape.image.content_type
                        element["image_size_bytes"] = len(shape.image.blob)
                    except Exception:
                        element["image_error"] = "Could not extract image data"

                slide_info["elements"].append(element)

            slides_data.append(slide_info)

        return {
            "success": True,
            "file": filepath,
            "slide_count": len(prs.slides),
            "slide_size": {
                "width_emu": slide_width,
                "height_emu": slide_height,
                "width_inches": round(slide_width / 914400, 2),
                "height_inches": round(slide_height / 914400, 2),
            },
            "slides": slides_data
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def main():
    parser = argparse.ArgumentParser(description="Parse PPTX template files")
    parser.add_argument("input", help="Input PPTX file path")
    parser.add_argument("--output", help="Output JSON file", default=None)
    parser.add_argument("--compact", help="Compact JSON output", action="store_true")
    args = parser.parse_args()

    result = parse_pptx(args.input)

    if args.output:
        indent = None if args.compact else 2
        with open(args.output, 'w') as f:
            json.dump(result, f, indent=indent, ensure_ascii=False)
        print(f"Saved to {args.output}")
    else:
        indent = None if args.compact else 2
        print(json.dumps(result, indent=indent, ensure_ascii=False))

if __name__ == "__main__":
    main()`,
    category: 'Document Processing',
    language: 'python',
    source: 'github',
    sourceUrl: 'https://github.com/Jing0715-fer/pptx-template-editor',
    params: JSON.stringify([
      { name: 'input', type: 'file', description: 'Input PPTX file path', required: true },
      { name: 'output', type: 'string', description: 'Output JSON file', required: false },
    ]),
    inputFiles: JSON.stringify([
      { name: 'pptx_input', description: 'PowerPoint template file', required: true, format: 'pptx' },
    ]),
    outputFiles: JSON.stringify([
      { name: 'json_output', description: 'Parsed slide data', format: 'json' },
    ]),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { executions: 0 },
    tags: JSON.stringify(['pptx', 'powerpoint', 'parser', 'template', 'document']),
  },
  {
    id: 'demo-pptx-replacer',
    name: 'PPTX Template Replacer',
    description: 'Replace placeholder tokens in PowerPoint templates with data. Supports text replacement, table population, and batch generation of PPTX files from templates.',
    filename: 'pptx_replacer.py',
    content: `#!/usr/bin/env python3
"""
PPTX Template Replacer - Replace placeholders in PowerPoint templates.

Finds {{placeholder}} tokens in PPTX files and replaces them with
provided data. Supports text, tables, and batch generation.

Requires: pip install python-pptx
"""
import sys
import json
import argparse
import copy
import re
from pathlib import Path

def replace_in_pptx(input_path, replacements, output_path):
    """Replace placeholders in a PPTX template."""
    try:
        from pptx import Presentation
    except ImportError:
        return {"success": False, "error": "python-pptx not installed. Run: pip install python-pptx"}

    try:
        prs = Presentation(input_path)
        replaced_count = 0

        for slide in prs.slides:
            for shape in slide.shapes:
                if shape.has_text_frame:
                    for para in shape.text_frame.paragraphs:
                        for run in para.runs:
                            original = run.text
                            new_text = original
                            for key, value in replacements.items():
                                placeholder = "{{" + key + "}}"
                                if placeholder in new_text:
                                    new_text = new_text.replace(placeholder, str(value))
                                    replaced_count += 1
                            if new_text != original:
                                run.text = new_text

                elif shape.has_table:
                    table = shape.table
                    for row in table.rows:
                        for cell in row.cells:
                            if cell.text_frame:
                                for para in cell.text_frame.paragraphs:
                                    for run in para.runs:
                                        original = run.text
                                        new_text = original
                                        for key, value in replacements.items():
                                            placeholder = "{{" + key + "}}"
                                            if placeholder in new_text:
                                                new_text = new_text.replace(placeholder, str(value))
                                                replaced_count += 1
                                        if new_text != original:
                                            run.text = new_text

        prs.save(output_path)
        return {
            "success": True,
            "replacements": replaced_count,
            "output": output_path,
            "keys_used": list(replacements.keys())
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def main():
    parser = argparse.ArgumentParser(description="Replace placeholders in PPTX templates")
    parser.add_argument("input", help="Input PPTX template file")
    parser.add_argument("--data", help="JSON file with replacements", required=True)
    parser.add_argument("--output", help="Output PPTX file", default="output.pptx")
    args = parser.parse_args()

    try:
        with open(args.data, 'r') as f:
            replacements = json.load(f)
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Failed to load data: {e}"}))
        sys.exit(1)

    result = replace_in_pptx(args.input, replacements, args.output)
    print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()`,
    category: 'Document Processing',
    language: 'python',
    source: 'github',
    sourceUrl: 'https://github.com/Jing0715-fer/pptx-template-editor',
    params: JSON.stringify([
      { name: 'input', type: 'file', description: 'Input PPTX template', required: true },
      { name: 'data', type: 'file', description: 'JSON file with replacement data', required: true },
      { name: 'output', type: 'string', description: 'Output PPTX file', required: false, default: 'output.pptx' },
    ]),
    inputFiles: JSON.stringify([
      { name: 'pptx_template', description: 'PPTX template with {{placeholders}}', required: true, format: 'pptx' },
      { name: 'replacements_json', description: 'JSON with key-value replacements', required: true, format: 'json' },
    ]),
    outputFiles: JSON.stringify([
      { name: 'pptx_output', description: 'Generated PPTX file', format: 'pptx' },
    ]),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { executions: 0 },
    tags: JSON.stringify(['pptx', 'powerpoint', 'template', 'replacement', 'document']),
  },
];

/**
 * For the seed route: strips the `id`, `createdAt`, `updatedAt`, `_count` fields
 * so Prisma can create records with auto-generated IDs and timestamps.
 */
export function getSeedData(): Array<{
  name: string;
  description: string;
  filename: string;
  content: string;
  category: string;
  language: string;
  source: string;
  params: string;
  inputFiles: string;
  outputFiles: string;
  tags?: string | null;
}> {
  return DEMO_SCRIPTS.map(({ name, description, filename, content, category, language, source, params, inputFiles, outputFiles, tags }) => ({
    name, description, filename, content, category, language, source, params, inputFiles, outputFiles, tags,
  }));
}
