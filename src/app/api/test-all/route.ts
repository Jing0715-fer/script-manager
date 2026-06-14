// @ts-nocheck
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const MOCK_DIR = '/tmp/test-inputs';
const UPLOAD_DIR = '/home/z/my-project/uploads';

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

    if (p.default !== undefined && p.default !== null) {
      params[p.name] = String(p.default);
    } else if (pType === 'file' || pName.includes('path') || pName.includes('file') || pName.includes('_path') || pName.includes('_file')) {
      params[p.name] = getMockFilePath(pName);
    } else if (pName.includes('url') || pName.includes('link')) {
      params[p.name] = 'https://example.com';
    } else if (pName.includes('color') || pName.includes('colour')) {
      params[p.name] = '#10b981';
    } else if (pName.includes('style') || pName.includes('theme')) {
      params[p.name] = 'modern';
    } else if (pName.includes('symbol') || pName.includes('ticker') || pName.includes('stock')) {
      params[p.name] = 'AAPL';
    } else if (pName.includes('query') || pName.includes('search') || pName.includes('keyword')) {
      params[p.name] = 'test query';
    } else if (pName.includes('description') || pName.includes('text') || pName.includes('content') || pName.includes('message')) {
      params[p.name] = 'Sample test content for validation';
    } else if (pName.includes('name') || pName.includes('title') || pName.includes('label')) {
      params[p.name] = 'Test Script';
    } else if (pName.includes('count') || pName.includes('number') || pName.includes('num') || pName.includes('size')) {
      params[p.name] = '10';
    } else if (pType === 'number' || pType === 'int' || pType === 'integer' || pType === 'float') {
      params[p.name] = '1';
    } else if (pType === 'boolean' || pType === 'bool') {
      params[p.name] = 'true';
    } else {
      params[p.name] = 'test';
    }
  }

  // Generate mock input files
  for (const f of scriptInputFiles) {
    const fName = f.name?.toLowerCase() || '';
    if (fName.includes('pdb') || fName.includes('protein') || fName.includes('structure')) {
      inputFiles[f.name] = 'test.pdb';
    } else if (fName.includes('csv') || fName.includes('data')) {
      inputFiles[f.name] = 'test.csv';
    } else if (fName.includes('json')) {
      inputFiles[f.name] = 'test.json';
    } else if (fName.includes('pdf')) {
      inputFiles[f.name] = 'test.txt'; // no real PDF mock
    } else if (fName.includes('html') || fName.includes('htm')) {
      inputFiles[f.name] = 'test.html';
    } else if (fName.includes('star') || fName.includes('relion')) {
      inputFiles[f.name] = 'test.star';
    } else if (fName.includes('mrc') || fName.includes('map') || fName.includes('volume')) {
      inputFiles[f.name] = 'test.mrc';
    } else if (fName.includes('md') || fName.includes('markdown')) {
      inputFiles[f.name] = 'test.md';
    } else if (fName.includes('pdb_dir') || fName.includes('rc_dir') || fName.includes('dir')) {
      inputFiles[f.name] = 'test.txt'; // directory mock
    } else {
      inputFiles[f.name] = 'test.txt';
    }
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

      // Check unsupported languages
      if (lang === 'chimerax' || lang === 'pymol') {
        const { params: mockParams, inputFiles: mockInputFiles } = generateMockParams(script);
        results.push({
          id: script.id,
          name: script.name,
          language: script.language,
          category: script.category || '',
          status: 'requires_app',
          mockParams,
          mockInputFiles,
          error: `Requires ${lang === 'chimerax' ? 'ChimeraX' : 'PyMOL'} application`,
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
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : `http://localhost:${process.env.PORT || 3003}`;

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
          status: execData.status === 'success' ? 'success' : 'error',
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
