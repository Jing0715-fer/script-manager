/**
 * Script analyzer — extracts params, description, and metadata from raw code.
 * Used at script import/edit time and as a one-shot migration utility.
 */
import type { ScriptParam } from '@/types';

const PY_TYPE_MAP: Record<string, ScriptParam['type']> = {
  str: 'string',
  int: 'number',
  float: 'number',
  bool: 'boolean',
  boolean: 'boolean',
  Path: 'path',
  pathlib: 'path',
};

/**
 * Strip leading comment/docstring blocks so we read code in the right context.
 */
function stripComments(code: string, language: string): string {
  let c = code;
  // Python module/class/function docstrings
  if (language === 'python' || language === 'py') {
    c = c.replace(/^[\t ]*(?:"""[\s\S]*?"""|'''[\s\S]*?''')\s*/m, '');
  }
  // Bash comments
  if (language === 'bash' || language === 'shell' || language === 'sh') {
    c = c.split('\n').map(line => line.replace(/^\s*#.*$/, '')).join('\n');
  }
  return c;
}

/**
 * Try to extract a module-level docstring (Python) or first comment block
 * (Bash) as a short description.
 */
export function extractDescription(code: string, language: string, name: string, filename?: string): string {
  if (!code) return '';
  const lc = (language || '').toLowerCase();

  // Python module docstring
  if (lc === 'python' || lc === 'py') {
    const m = code.match(/^[\t ]*(?:"""([\s\S]*?)"""|'''([\s\S]*?)''')/);
    if (m) {
      const doc = (m[1] || m[2] || '').trim();
      if (doc) return doc.split('\n')[0].slice(0, 200);
    }
  }

  // Bash/Shell: first contiguous comment block at top
  if (lc === 'bash' || lc === 'shell' || lc === 'sh') {
    const lines = code.split('\n');
    const comments: string[] = [];
    for (const line of lines) {
      const m = line.match(/^\s*#\s?(.*)$/);
      if (m) comments.push(m[1].trim());
      else if (line.trim() === '') {
        if (comments.length) break;
      } else {
        break;
      }
    }
    if (comments.length) return comments.join(' ').slice(0, 200);
  }

  // Heuristics from name/filename
  const fname = (filename || name || '').toLowerCase();
  const keywordMap: Record<string, string> = {
    'split': 'Splits input into parts by a key (date, chain, etc.)',
    'rmsd': 'Calculates RMSD between two structures and reports per-residue values',
    'tile': 'Renders tiled 2D structure images for figure preparation',
    'cdr': 'Identifies and visualizes antibody complementarity-determining regions (CDRs)',
    'locres': 'Computes and colors local resolution map (cryo-EM)',
    'mrc': 'Manipulates MRC density maps',
    'fab': 'Analyzes or prepares Fab fragment structures',
    'highlight': 'Highlights a structural region or selection in the viewer',
    'nanobody': 'Identifies and visualizes nanobody (Nb) CDRs',
    'anarci': 'Runs ANARCI to number antibody / nanobody sequences (IMGT/Kabat)',
    'excel': 'Exports data to an Excel workbook',
    'json': 'Reads or writes JSON configuration',
    'interface': 'Analyzes protein-protein interfaces and contacts',
    'epitope': 'Maps and exports antibody epitopes',
    'epitop': 'Maps and exports antibody epitopes',
    'scalebar': 'Adds a scale bar to a figure',
    'rename': 'Renames chains, atoms, or residues',
    'segment': 'Segments a map or surface and creates a mesh',
    'pptx': 'Builds a PowerPoint report',
    'isomesh': 'Generates an isosurface mesh for a density map',
    'interaction': 'Computes residue-residue interactions / contacts',
    'segid': 'Assigns or normalizes segment IDs in a model',
    'script': 'Test or development script for the ScriptHub runner',
  };
  for (const [kw, desc] of Object.entries(keywordMap)) {
    if (fname.includes(kw)) return desc;
  }
  return '';
}

/**
 * Heuristic parameter extraction from raw script code.
 * Returns a list of ScriptParam describing inputs the user should be able to
 * provide through the UI. Best-effort — covers argparse, sys.argv, and input().
 */
export function extractParams(code: string, language: string): ScriptParam[] {
  if (!code) return [];
  const lc = (language || '').toLowerCase();
  const stripped = stripComments(code, language);

  if (lc === 'python' || lc === 'py') {
    // 1) argparse: parser.add_argument('--name', type=str, default=..., help='...')
    if (/argparse\.(ArgumentParser|add_argument)/.test(stripped) || /^\s*parser\s*=\s*argparse\./m.test(stripped)) {
      const params: ScriptParam[] = [];
      const re = /add_argument\(\s*(['\"])(-{1,2})([\w-]+)\1\s*([^)]*)\)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(stripped))) {
        const name = m[3];
        const rest = m[4] || '';
        const isPositional = !m[2];
        const typeMatch = rest.match(/type=(\w+)/);
        const defaultMatch = rest.match(/default\s*=\s*([^,)]+)/);
        const helpMatch = rest.match(/help\s*=\s*['"]([^'"]*)['"]/);
        const choiceMatch = rest.match(/choices\s*=\s*\[([^\]]+)\]/);
        const t = typeMatch?.[1] || (defaultMatch && /^\d+(\.\d+)?$/.test(defaultMatch[1].trim()) ? 'number' : 'string');
        const params2: ScriptParam = {
          name,
          label: name,
          type: PY_TYPE_MAP[t] || (isPositional ? 'string' : 'string'),
          description: helpMatch?.[1] || undefined,
          required: /required\s*=\s*True/.test(rest) || isPositional,
        };
        if (defaultMatch) {
          const dv = defaultMatch[1].trim().replace(/^['"]|['"]$/g, '');
          params2.default = dv;
          // If it has a numeric default, treat as number
          if (/^\d+(\.\d+)?$/.test(dv) && params2.type === 'string') {
            params2.type = 'number';
          }
        }
        if (choiceMatch) {
          params2.type = 'select';
          params2.options = choiceMatch[1]
            .split(',')
            .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
            .filter(Boolean)
            .map(v => ({ label: v, value: v }));
        }
        params.push(params2);
      }
      return params;
    }
    // 2) sys.argv positional args
    const argvMatches = [...stripped.matchAll(/sys\.argv\[(\d+)\]/g)].map(m => parseInt(m[1]));
    if (argvMatches.length > 0) {
      const maxIdx = Math.max(...argvMatches);
      const params: ScriptParam[] = [];
      for (let i = 1; i <= maxIdx; i++) {
        params.push({
          name: `arg${i}`,
          label: `Argument ${i}`,
          type: 'path',
          required: true,
        });
      }
      return params;
    }
    // 3) input() calls
    const inputCount = (stripped.match(/^\s*input\s*\(/gm) || []).length;
    if (inputCount > 0) {
      const params: ScriptParam[] = [];
      for (let i = 1; i <= inputCount; i++) {
        params.push({
          name: `input${i}`,
          label: `Input ${i}`,
          type: 'string',
          required: true,
        });
      }
      return params;
    }
    // 4) Fallback: detect top-level main(session, foo=..., bar=...) signatures —
    //    ChimeraX/PyMOL scripts often pass parameters as function kwargs. Only
    //    consider the *first* top-level def to avoid picking up helpers.
    const topLevelDefs: string[] = [];
    const lines = stripped.split('\n');
    for (const line of lines) {
      // Top-level defs are at column 0 (no indentation)
      const m = line.match(/^def\s+(\w+)\s*\(([^)]*)\)/);
      if (m) topLevelDefs.push(m[2]);
    }
    if (topLevelDefs.length > 0) {
      const params: ScriptParam[] = [];
      const seen = new Set<string>();
      for (const argList of topLevelDefs) {
        const args = argList
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        for (const arg of args) {
          if (arg.startsWith('**') || arg.startsWith('*')) continue;
          if (arg === 'self' || arg === 'session' || arg === 'cls') continue;
          const m = arg.match(/^([\w]+)(?:\s*=\s*(.+))?$/);
          if (!m) continue;
          const name = m[1];
          const defaultVal = m[2];
          if (seen.has(name)) continue;
          seen.add(name);
          if (defaultVal === undefined) continue;
          params.push({
            name,
            label: name,
            type: /^\d+(\.\d+)?$/.test(defaultVal) ? 'number'
                : /^(True|False|true|false)$/.test(defaultVal) ? 'boolean'
                : /^['"].*['"]$/.test(defaultVal) ? 'string'
                : 'string',
            default: defaultVal.replace(/^['"]|['"]$/g, ''),
            required: false,
          });
        }
      }
      if (params.length) return params;
    }
    return [];
  }

  if (lc === 'bash' || lc === 'shell' || lc === 'sh') {
    // Look for $1, $2, ...
    const positional = [...stripped.matchAll(/\$\{?(\d+)\}?/g)]
      .map(m => parseInt(m[1]))
      .filter(n => n > 0);
    if (positional.length > 0) {
      const maxIdx = Math.max(...positional);
      const params: ScriptParam[] = [];
      for (let i = 1; i <= maxIdx; i++) {
        params.push({
          name: `arg${i}`,
          label: `Argument ${i}`,
          type: 'string',
          required: true,
        });
      }
      return params;
    }
  }

  return [];
}
