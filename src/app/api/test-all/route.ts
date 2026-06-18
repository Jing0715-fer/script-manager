// @ts-nocheck
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const MOCK_DIR = '/tmp/test-inputs';
// Make sure scripts that read the flag value (e.g. args.input) actually find
// the file. We pass absolute paths to mock params; the execute route
// recognizes this and skips the per-run copy step.
const MOCK_DIR_ABS = MOCK_DIR;
// Respect env var (matches /api/execute); fall back to <cwd>/uploads.
const UPLOAD_DIR = process.env.SCRIPT_MANAGER_UPLOAD_DIR || join(process.cwd(), 'uploads');

// Mock file contents for different file types
const MOCK_FILES: Record<string, string> = {
  pdb: `ATOM      1  N   ALA A   1       1.000   2.000   3.000  1.00 20.00           N
ATOM      2  CA  ALA A   1       2.000   3.000   4.000  1.00 20.00           C
ATOM      3  C   ALA A   1       3.000   4.000   5.000  1.00 20.00           C
ATOM      4  O   ALA A   1       4.000   5.000   6.000  1.00 20.00           O
END`,
  csv: `name,age,city
Alice,30,Beijing
Bob,25,Shanghai
Charlie,35,Guangzhou`,
  json: `{"data": [{"name": "test", "value": 42}]}`,
  html: `<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Hello</h1></body></html>`,
  md: `# Test Document\nThis is a **test** markdown file.\n- Item 1\n- Item 2`,
  txt: `This is a test file.\nIt contains sample content for testing.`,
  star: `\\version 10000\nloop_\n_rlnCoordinateX\n_rlnCoordinateY\n1.0 2.0\n3.0 4.0\n`,
  mrc: `MOCK_MRC_FILE`,
};

let mockFilesCreated = false;

async function ensureMockFiles() {
  if (mockFilesCreated) return;
  await mkdir(MOCK_DIR, { recursive: true });
  await mkdir(UPLOAD_DIR, { recursive: true });
  for (const [ext, content] of Object.entries(MOCK_FILES)) {
    await writeFile(join(MOCK_DIR, `test.${ext}`), content, 'utf-8');
  }
  // Also copy to uploads dir for the execute API's input file resolution
  for (const [ext, content] of Object.entries(MOCK_FILES)) {
    await writeFile(join(UPLOAD_DIR, `test.${ext}`), content, 'utf-8');
  }
  mockFilesCreated = true;
}

// Determine mock file path based on param name
function getMockFilePath(pName: string): string {
  const n = pName.toLowerCase();
  if (n.includes('pdb') || n.includes('protein') || n.includes('structure')) return `${MOCK_DIR}/test.pdb`;
  if (n.includes('csv') || n.includes('data')) return `${MOCK_DIR}/test.csv`;
  if (n.includes('json')) return `${MOCK_DIR}/test.json`;
  if (n.includes('html') || n.includes('htm')) return `${MOCK_DIR}/test.html`;
  if (n.includes('md') || n.includes('markdown')) return `${MOCK_DIR}/test.md`;
  if (n.includes('star') || n.includes('relion')) return `${MOCK_DIR}/test.star`;
  if (n.includes('mrc') || n.includes('map') || n.includes('volume')) return `${MOCK_DIR}/test.mrc`;
  if (n.includes('pdf')) return `${MOCK_DIR}/test.txt`; // no real PDF mock
  if (n.includes('pptx') || n.includes('ppt')) return `${MOCK_DIR}/test.txt`; // no real PPTX mock
  return `${MOCK_DIR}/test.txt`;
}

// Determine mock file path for input file entry
function getInputFilePath(fName: string): string {
  const n = fName.toLowerCase();
  if (n.includes('pdb') || n.includes('protein') || n.includes('structure')) return `test.pdb`;
  if (n.includes('csv') || n.includes('data')) return `test.csv`;
  if (n.includes('json')) return `test.json`;
  if (n.includes('html') || n.includes('htm')) return `test.html`;
  if (n.includes('star') || n.includes('relion')) return `test.star`;
  if (n.includes('mrc') || n.includes('map') || n.includes('volume')) return `test.mrc`;
  if (n.includes('pdf')) return `test.txt`;
  if (n.includes('pptx') || n.includes('ppt')) return `test.txt`;
  return `test.txt`;
}

// Generate mock test inputs based on script metadata
function generateMockParams(script: any): { params: Record<string, string>; inputFiles: Record<string, string> } {
  const language = script.language?.toLowerCase() || '';
  const name = script.name?.toLowerCase() || '';

  let params: Record<string, string> = {};
  let inputFiles: Record<string, string> = {};

  // Parse script metadata
  let scriptParams: Array<{ name: string; type: string; default?: any; description?: string }> = [];
  let scriptInputFiles: Array<{ name: string; path?: string; description?: string }> = [];
  try { scriptParams = JSON.parse(script.params || '[]'); } catch { /* ignore */ }
  try { scriptInputFiles = JSON.parse(script.inputFiles || '[]'); } catch { /* ignore */ }

  // Generate mock params based on param type/name
  for (const p of scriptParams) {
    const pName = p.name?.toLowerCase() || '';
    const pType = p.type?.toLowerCase() || '';

    // Skip params whose name is malformed in the DB or which carry a default
    // — letting the script use its own default is safer than injecting a wrong
    // value.
    if (typeof p.name !== 'string' || p.name.trim() === '') continue;
    if (p.default !== undefined && p.default !== null) continue;

    // Split composite names like "-i / --input" into each flag so they all
    // get the same mock value (e.g. both -i and --input will be populated).
    const flagNames = p.name.includes(' / ')
      ? p.name.split(' / ').map((s: string) => s.trim()).filter(Boolean)
      : [p.name];

    // Skip any malformed segments (containing spaces or non-flag chars
    // beyond what's expected). Plain "directory" style positional params
    // with a default have already been skipped above.
    const validFlags = flagNames.filter((n: string) => {
      if (n.includes(' ')) return false;
      if (n.startsWith('-') && !/^--?[A-Za-z][\w-]*$/.test(n)) return false;
      return true;
    });
    if (validFlags.length === 0) continue;

    // Use the first valid flag's name for keyword heuristics — composite
    // names like "-i / --input" lose the descriptive words ("path", "file")
    // that drive type inference.
    const inferName = (validFlags[0] || pName).toLowerCase();

    let value: string;
    if (pType === 'file' || pType === 'path' || inferName.includes('path') || inferName.includes('file') || inferName.includes('input') || inferName.includes('output') || pName.includes('_path') || pName.includes('_file')) {
      // Use the absolute path under /tmp/test-inputs so the script can open
      // it directly. The execute route also recognizes this and skips the
      // per-run copy step (avoiding a name collision on the read side).
      const base = getMockFilePath(inferName).split('/').pop() || 'test.txt';
      value = `${MOCK_DIR_ABS}/${base}`;
    } else if (pName.includes('url') || pName.includes('link')) {
      value = 'https://example.com';
    } else if (pName.includes('color') || pName.includes('colour')) {
      value = '#10b981';
    } else if (pName.includes('style') || pName.includes('theme')) {
      value = 'modern';
    } else if (pName.includes('symbol') || pName.includes('ticker') || pName.includes('stock')) {
      value = 'AAPL';
    } else if (pName.includes('query') || pName.includes('search') || pName.includes('keyword')) {
      value = 'test query';
    } else if (pName.includes('description') || pName.includes('text') || pName.includes('content') || pName.includes('message')) {
      value = 'Sample test content for validation';
    } else if (pName.includes('name') || pName.includes('title') || pName.includes('label')) {
      value = 'Test Script';
    } else if (pName.includes('count') || pName.includes('number') || pName.includes('num') || pName.includes('size')) {
      value = '10';
    } else if (pType === 'number' || pType === 'int' || pType === 'integer' || pType === 'float') {
      value = '1';
    } else if (pType === 'boolean' || pType === 'bool') {
      value = 'true';
    } else {
      value = 'test';
    }

    // Write the value under every valid flag name. argparse scripts
    // typically use the long form; the execute route already maps a
    // single-dash key as-is and a non-dash key to --key.
    for (const flag of validFlags) {
      params[flag] = value;
    }
  }

  // Generate mock input files
  for (const f of scriptInputFiles) {
    const fName = f.name?.toLowerCase() || '';
    let value: string;
    if (fName.includes('pdb') || fName.includes('protein') || fName.includes('structure')) {
      value = `${MOCK_DIR_ABS}/test.pdb`;
    } else if (fName.includes('csv') || fName.includes('data')) {
      value = `${MOCK_DIR_ABS}/test.csv`;
    } else if (fName.includes('json')) {
      value = `${MOCK_DIR_ABS}/test.json`;
    } else if (fName.includes('pdf')) {
      value = `${MOCK_DIR_ABS}/test.txt`; // no real PDF mock
    } else if (fName.includes('html') || fName.includes('htm')) {
      value = `${MOCK_DIR_ABS}/test.html`;
    } else if (fName.includes('star') || fName.includes('relion')) {
      value = `${MOCK_DIR_ABS}/test.star`;
    } else if (fName.includes('mrc') || fName.includes('map') || fName.includes('volume')) {
      value = `${MOCK_DIR_ABS}/test.mrc`;
    } else if (fName.includes('md') || fName.includes('markdown')) {
      value = `${MOCK_DIR_ABS}/test.md`;
    } else if (fName.includes('pdb_dir') || fName.includes('rc_dir') || fName.includes('dir')) {
      value = MOCK_DIR_ABS.replace(/\/$/, ''); // directory itself (no trailing slash)
    } else {
      value = `${MOCK_DIR_ABS}/test.txt`;
    }

    // Resolve the dict key for the execute route. Names like
    // "input PDB file (-i/--input)" should be sent under a real argparse
    // flag, e.g. "--input" or "-i". The execute route already skips keys
    // that look like descriptions (contain spaces, parens, braces, slashes),
    // so we override the key here when we can extract a flag.
    let key = f.name;
    const flagMatch = f.name.match(/\(([-]{1,2}[A-Za-z][\w-]*)\s*\/\s*([-]{1,2}[A-Za-z][\w-]*)\)/);
    if (flagMatch) {
      key = flagMatch[2]; // prefer the long form
    }

    inputFiles[key] = value;
  }

  // Script-specific overrides
  if (name.includes('hello') || name.includes('system monitor') || name.includes('env setup')) {
    params = {};
    inputFiles = {};
  }

  return { params, inputFiles };
}

// POST /api/test-all - Test all scripts with mock inputs
export async function POST(request: NextRequest) {
  try {
    await ensureMockFiles();
    const body = await request.json().catch(() => ({}));
    const language = body.language as string | undefined;
    const limit = Math.min(body.limit || 100, 200);

    // Fetch scripts
    const where: any = {};
    if (language) {
      where.language = language;
    }

    const scripts = await db.script.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      take: limit,
      select: {
        id: true,
        name: true,
        language: true,
        filename: true,
        category: true,
        content: true,
        params: true,
        inputFiles: true,
        outputFiles: true,
      },
    });

    const results: Array<{
      id: string;
      name: string;
      language: string;
      category: string;
      status: 'success' | 'error' | 'unsupported' | 'requires_app';
      mockParams: Record<string, string>;
      mockInputFiles: Record<string, string>;
      output?: string;
      error?: string;
      duration?: number;
      exitCode?: number | null;
    }> = [];

    for (const script of scripts) {
      const lang = script.language?.toLowerCase() || '';

      // Note: chimerax/pymol scripts used to be short-circuited here, but
      // /api/execute now has the chimerax/pymol runtime branches and can
      // actually run them. We let /api/execute decide (it returns
      // 'requires_chimerax' / 'requires_pymol' / 'success' as appropriate),
      // so we don't need a special-case here.

      // Some chimerax scripts operate on whatever models are already loaded
      // in the session (description contains "ChimeraX session" / "pre-loaded").
      // The mock can't simulate that, so treat them as requires_app.
      const scriptInputFilesCheck = (() => {
        try { return JSON.parse(script.inputFiles || '[]'); } catch { return []; }
      })();
      const needsChimeraContext = scriptInputFilesCheck.some((f: any) =>
        typeof f?.description === 'string' &&
        /(must be (open|loaded|pre-?loaded) in (the )?ChimeraX|must be opened in (the )?ChimeraX|already (open|loaded) in (the )?ChimeraX)/i.test(f.description)
      );
      if (needsChimeraContext && lang === 'chimerax') {
        const { params: mockParams, inputFiles: mockInputFiles } = generateMockParams(script);
        results.push({
          id: script.id,
          name: script.name,
          language: script.language,
          category: script.category || '',
          status: 'requires_app',
          mockParams,
          mockInputFiles,
          error: 'Requires a pre-loaded ChimeraX model in the session. Open the structure in ChimeraX first, then run the script.',
        });
        continue;
      }

      // Detect GUI-only scripts: importing tkinter, PyQt5, PySide, wxPython,
      // or in a "Runner" category means they need a display server we don't
      // have in headless test environments.
      const src = (script.content || '').toLowerCase();
      const guiImport =
        /\b(import\s+(tkinter|from\s+tkinter)|from\s+pyqt5|import\s+pyqt5|from\s+pyside|import\s+pyside|from\s+wxpython|import\s+wxpython)\b/.test(src) ||
        /\b(QApplication|QMainWindow|tk\.Tk|wx\.App)\b/.test(src);
      if (guiImport || (script.category || '').toLowerCase() === 'runner') {
        const { params: mockParams, inputFiles: mockInputFiles } = generateMockParams(script);
        results.push({
          id: script.id,
          name: script.name,
          language: script.language,
          category: script.category || '',
          status: 'requires_app',
          mockParams,
          mockInputFiles,
          error: 'Requires a GUI runtime (tkinter/PyQt5/PySide); not executable in headless test-all',
        });
        continue;
      }

      if (lang === 'typescript' || lang === 'ts' || lang === 'r') {
        const { params: mockParams, inputFiles: mockInputFiles } = generateMockParams(script);
        results.push({
          id: script.id,
          name: script.name,
          language: script.language,
          category: script.category || '',
          status: 'unsupported',
          mockParams,
          mockInputFiles,
          error: `${lang} execution not supported in this environment`,
        });
        continue;
      }

      // Generate mock params
      const { params: mockParams, inputFiles: mockInputFiles } = generateMockParams(script);

      // Execute via internal API call
      try {
        const port = process.env.PORT || '3002';
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : `http://localhost:${port}`;

        const execResponse = await fetch(`${baseUrl}/api/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: script.id,
            params: mockParams,
            inputFiles: mockInputFiles,
            timeout: 10000,
          }),
        });

        if (!execResponse.ok) {
          results.push({
            id: script.id,
            name: script.name,
            language: script.language,
            category: script.category || '',
            status: 'error',
            mockParams,
            mockInputFiles,
            error: `API returned ${execResponse.status}`,
          });
          continue;
        }

        const execData = await execResponse.json();
        results.push({
          id: script.id,
          name: script.name,
          language: script.language,
          category: script.category || '',
          status: execData.status === 'success' ? 'success' : (execData.status && execData.status.startsWith('requires_') ? 'requires_app' : (execData.status || 'error')),
          mockParams,
          mockInputFiles,
          output: (execData.output || '').slice(0, 500),
          error: (execData.error || '').slice(0, 500),
          duration: execData.duration || 0,
          exitCode: execData.exitCode,
        });
      } catch (err) {
        results.push({
          id: script.id,
          name: script.name,
          language: script.language,
          category: script.category || '',
          status: 'error',
          mockParams,
          mockInputFiles,
          error: String(err).slice(0, 200),
        });
      }
    }

    // Summary
    const summary = {
      total: results.length,
      success: results.filter(r => r.status === 'success').length,
      error: results.filter(r => r.status === 'error').length,
      unsupported: results.filter(r => r.status === 'unsupported').length,
      requiresApp: results.filter(r => r.status === 'requires_app').length,
    };

    return NextResponse.json({ summary, results });
  } catch (error) {
    console.error('Error testing scripts:', error);
    return NextResponse.json(
      { error: 'Failed to test scripts' },
      { status: 500 }
    );
  }
}
