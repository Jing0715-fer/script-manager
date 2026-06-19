import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { writeFile, mkdir, unlink, access, readdir, stat, copyFile } from 'fs/promises';
import { join, resolve } from 'path';
import { randomUUID } from 'crypto';

const TMP_DIR = process.env.SCRIPT_MANAGER_TMP_DIR || '/tmp/script-manager';
const UPLOAD_DIR = process.env.SCRIPT_MANAGER_UPLOAD_DIR || join(process.cwd(), 'uploads');
// Python interpreter. Override via SCRIPT_MANAGER_PYTHON. Falls back to the
// project-local venv (so matplotlib/openpyxl/anarci are available), then to
// the system python3.
const PYTHON_BIN =
  process.env.SCRIPT_MANAGER_PYTHON ||
  join(process.cwd(), '.venv', 'bin', 'python3');
// Application launchers for script "runtimes" that aren't vanilla Python.
// Each runtime wraps the script execution in an external app's headless
// interpreter. Override via env vars to point at non-default installs.
const PYMOL_BIN =
  process.env.SCRIPT_MANAGER_PYMOL_BIN ||
  '/Applications/PyMOL.app/Contents/bin/pymol';
// Look for ChimeraX under a few common install paths. The versioned bundle
// (ChimeraX-1.12.app etc.) is what the official .dmg ships.
const CHIMERAX_CANDIDATES = [
  process.env.SCRIPT_MANAGER_CHIMERAX_BIN,
  '/Applications/ChimeraX-1.12.app/Contents/bin/ChimeraX',
  '/Applications/ChimeraX-1.11.app/Contents/bin/ChimeraX',
  '/Applications/ChimeraX-1.10.app/Contents/bin/ChimeraX',
  '/Applications/ChimeraX-1.9.app/Contents/bin/ChimeraX',
  '/Applications/ChimeraX-1.8.app/Contents/bin/ChimeraX',
  '/Applications/ChimeraX-1.7.app/Contents/bin/ChimeraX',
  '/Applications/ChimeraX.app/Contents/bin/ChimeraX',
].filter((p): p is string => typeof p === 'string');

// Helper: check if path exists (async-safe replacement for existsSync)
async function pathExists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

// Ensure directories exist (called lazily on first request)
let dirsInitialized = false;
async function ensureDirs() {
  if (dirsInitialized) return;
  await mkdir(TMP_DIR, { recursive: true });
  await mkdir(UPLOAD_DIR, { recursive: true });
  dirsInitialized = true;
}

interface ExecuteResult {
  output: string;
  error: string;
  exitCode: number | null;
  duration: number;
}

function executeCommand(
  command: string,
  args: string[],
  envOverrides: Record<string, string> = {},
  timeout: number = 60000
): Promise<ExecuteResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';

    const proc = spawn(command, args, {
      cwd: TMP_DIR,
      env: { ...process.env, ...envOverrides },
      timeout,
    });

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    let resolved = false;

    proc.on('close', (code) => {
      if (resolved) return;
      resolved = true;
      const duration = Date.now() - startTime;
      resolve({
        output: stdout,
        error: stderr,
        exitCode: code,
        duration,
      });
    });

    proc.on('error', (err) => {
      if (resolved) return;
      resolved = true;
      const duration = Date.now() - startTime;
      resolve({
        output: stdout,
        error: err.message,
        exitCode: null,
        duration,
      });
    });
  });
}

// Async cleanup helper
async function cleanupTempFiles(scriptFile: string | null, paramsFile: string | null, execInputFiles: Record<string, string> | null) {
  try {
    if (scriptFile) await unlink(scriptFile).catch(() => {});
    if (paramsFile) await unlink(paramsFile).catch(() => {});
    if (execInputFiles && typeof execInputFiles === 'object') {
      for (const [, value] of Object.entries(execInputFiles)) {
        const tmpPath = join(TMP_DIR, value);
        await unlink(tmpPath).catch(() => {});
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}

// POST /api/execute - Execute a script by id
export async function POST(request: NextRequest) {
  let scriptFile: string | null = null;
  let paramsFile: string | null = null;
  let execInputFiles: Record<string, string> | null = null;

  try {
    await ensureDirs();
    const body = await request.json();
    const { id, params: execParams, inputFiles, timeout: requestTimeout } = body;
    execInputFiles = inputFiles || null;

    if (!id) {
      return NextResponse.json(
        { error: 'Script id is required' },
        { status: 400 }
      );
    }

    // Find the script
    const script = await db.script.findUnique({ where: { id } });
    if (!script) {
      return NextResponse.json(
        { error: 'Script not found' },
        { status: 404 }
      );
    }

    // Generate unique filenames for temp files
    const runId = randomUUID();
    // Pick a runtime. The DB may store language="python" for everything, so
    // we also inspect the source for chimerax/pymol imports and switch to
    // the matching application's headless interpreter.
    const declaredLanguage = (script.language?.toLowerCase() || 'python');
    const sourceText = script.content || '';
    let language = declaredLanguage;
    if (declaredLanguage === 'python') {
      if (/^\s*from\s+chimerax\b|^\s*import\s+chimerax\b/m.test(sourceText)) {
        language = 'chimerax';
      } else if (/^\s*from\s+pymol\b|^\s*import\s+pymol\b/m.test(sourceText)) {
        language = 'pymol';
      }
    }

    // Determine file extension and command
    let command: string;
    let args: string[];
    let extension: string;

    if (language === 'chimerax') {
      // Try to run the script via ChimeraX's headless interpreter.
      // We probe a list of common install paths because the official .dmg
      // ships versioned bundle names (ChimeraX-1.12.app, etc.).
      let chimeraBin: string | null = null;
      for (const candidate of CHIMERAX_CANDIDATES) {
        if (await pathExists(candidate)) {
          chimeraBin = candidate;
          break;
        }
      }
      if (!chimeraBin) {
        return NextResponse.json({
          execution: null,
          output: '',
          error: `ChimeraX is not installed. Looked in:\n${CHIMERAX_CANDIDATES.map(p => '  ' + p).join('\n')}\nPlease install UCSF ChimeraX from https://www.cgl.ucsf.edu/chimera/download.html or set SCRIPT_MANAGER_CHIMERAX_BIN to the ChimeraX binary path.`,
          exitCode: -1,
          duration: 0,
          status: 'requires_chimerax',
          resultFiles: [],
        });
      }
      extension = '.py';
      command = chimeraBin;
    } else if (language === 'pymol') {
      // Run via PyMOL's headless interpreter (MacPyMOL or pymol -c on Linux).
      // Scripts that do `from pymol import cmd` execute inside PyMOL's
      // bundled Python runtime.
      if (!(await pathExists(PYMOL_BIN))) {
        return NextResponse.json({
          execution: null,
          output: '',
          error: `PyMOL is not installed at ${PYMOL_BIN}.\nPlease install PyMOL from https://pymol.org or set SCRIPT_MANAGER_PYMOL_BIN to the pymol binary path.`,
          exitCode: -1,
          duration: 0,
          status: 'requires_pymol',
          resultFiles: [],
        });
      }
      extension = '.py';
      command = PYMOL_BIN;
    } else if (language === 'shell' || language === 'bash' || language === 'sh') {
      extension = '.sh';
      command = 'bash';
    } else if (language === 'node' || language === 'javascript' || language === 'js') {
      extension = '.js';
      command = 'node';
    } else if (language === 'python' || language === 'py') {
      extension = '.py';
      command = PYTHON_BIN;
    } else if (language === 'typescript' || language === 'ts') {
      return NextResponse.json({
        execution: null,
        output: '',
        error: `TypeScript execution is not supported in this environment. Please compile to JavaScript first or use a Node.js runtime with ts-node.`,
        exitCode: -1,
        duration: 0,
        status: 'unsupported_language',
        resultFiles: [],
      });
    } else if (language === 'r') {
      return NextResponse.json({
        execution: null,
        output: '',
        error: `R script execution requires R to be installed. Please run: Rscript ${script.filename}`,
        exitCode: -1,
        duration: 0,
        status: 'unsupported_language',
        resultFiles: [],
      });
    } else {
      return NextResponse.json({
        execution: null,
        output: '',
        error: `The language "${language}" is not supported for direct execution. Supported languages: Python, Bash/Shell, JavaScript/Node.`,
        exitCode: -1,
        duration: 0,
        status: 'unsupported_language',
        resultFiles: [],
      });
    }

    // Write script content to temp file (async)
    scriptFile = join(TMP_DIR, `${runId}${extension}`);
    await writeFile(scriptFile, script.content, 'utf-8');

    // Parse input files info
    let scriptInputFiles: Array<{ name: string; path: string; description: string }> = [];
    try {
      scriptInputFiles = JSON.parse(script.inputFiles || '[]');
    } catch { /* ignore */ }

    // Parse script.params (metadata) so we can decide whether each key is a
    // flag (boolean / store_true) and should NOT take a value. Without this,
    // argparse-based scripts with `--flag action='store_true'` see their
    // boolean value as a positional arg and fail with "unrecognized arguments".
    interface ScriptParamMeta {
      name: string;
      type?: string;
      required?: boolean;
      description?: string;
      default?: unknown;
    }
    let scriptParamMeta: ScriptParamMeta[] = [];
    try {
      scriptParamMeta = JSON.parse(script.params || '[]');
    } catch { /* ignore */ }
    const paramTypeByName = new Map<string, string>();
    for (const p of scriptParamMeta) {
      if (p && typeof p.name === 'string') {
        paramTypeByName.set(p.name, (p.type || 'string').toLowerCase());
      }
    }
    const isFlagParam = (key: string): boolean => {
      const t = paramTypeByName.get(key);
      return t === 'boolean' || t === 'bool' || t === 'flag';
    };

    // Build environment variables and copy input files to tmp dir
    const envOverrides: Record<string, string> = {};
    const inputFileList: Array<{ key: string; path: string }> = [];
    if (execInputFiles && typeof execInputFiles === 'object') {
      // If a flag (e.g. "--input", "-i") is already supplied via execParams,
      // do not push its inputFile again as a positional argument.
      const paramFlagKeys = new Set(
        Object.keys(execParams || {}).filter(
          (k) => typeof k === 'string' && (k.startsWith('--') || (k.startsWith('-') && k.length > 1))
        )
      );
      for (const [key, value] of Object.entries(execInputFiles)) {
        // Skip malformed keys: descriptive names like "{x}_{y}.tiff",
        // "input PDB file (-i/--input)", "font path (optional)" etc. are
        // documentation, not argparse names.
        if (
          typeof key !== 'string' ||
          key.includes(' ') ||
          key.includes('/') ||
          key.includes('(') ||
          key.includes('{') ||
          key.includes('<') ||
          /^\W*\w*\.(tiff|pdb|pptx|png|json|csv|html|md|star|mrc|txt|pdf)\W*$/i.test(key)
        ) {
          // Still set INPUT_ env var so scripts that read it still get the path,
          // but DO NOT push it onto args (which would become a positional
          // argument argparse doesn't expect).
          envOverrides[`INPUT_${key.replace(/[^A-Za-z0-9]/g, '_').toUpperCase()}`] = String(value);
          continue;
        }
        // If this inputFile key matches a flag the caller already passed via
        // execParams, only expose it as INPUT_<KEY> env var; do not push it
        // onto args (which would be a duplicate / unknown positional).
        if (paramFlagKeys.has(key)) {
          envOverrides[`INPUT_${key.toUpperCase()}`] = String(value);
          continue;
        }
        const srcPath = join(UPLOAD_DIR, value);
        const resolvedSrc = resolve(srcPath);
        // If the value is already an absolute path under the mock-inputs
        // dir (test-all passes these so scripts can read the flag value
        // directly), trust it and skip the upload-dir copy.
        if (typeof value === 'string' && value.startsWith('/tmp/test-inputs/') && await pathExists(value)) {
          inputFileList.push({ key, path: value });
          envOverrides[`INPUT_${key.toUpperCase()}`] = value;
        } else if (await pathExists(resolvedSrc) && resolvedSrc.startsWith(resolve(UPLOAD_DIR))) {
          // Copy with runId prefix to avoid collisions
          const destPath = join(TMP_DIR, `${runId}_${value}`);
          const resolvedDest = resolve(destPath);
          if (resolvedDest.startsWith(resolve(TMP_DIR))) {
            try {
              await copyFile(srcPath, destPath);
              inputFileList.push({ key, path: destPath });
              envOverrides[`INPUT_${key.toUpperCase()}`] = destPath;
            } catch { /* ignore copy errors */ }
          }
        } else {
          // File not in uploads dir, use value as-is for env var
          envOverrides[`INPUT_${key.toUpperCase()}`] = value;
        }
      }
    }

    // Smart argument building based on script analysis
    const scriptContent = script.content || '';

    // Parse positional arg count from sys.argv usage
    const argvMatches = scriptContent.match(/sys\.argv\[(\d+)\]/g) || [];
    const maxArgIndex = argvMatches.length > 0
      ? Math.max(...argvMatches.map((m: string) => parseInt(m.match(/\d+/)?.[0] || '0')))
      : 0;

    // Check for argparse usage
    const hasArgparse = /argparse\.(ArgumentParser|add_argument)/.test(scriptContent);

    // Check for usage hints in comments (e.g., #python script.py input.pdb output.pdb)
    const usageHint = scriptContent.match(/#\s*python\s+\S+(.+)/)?.[1]?.trim() || '';

    // Also check if param values look like file paths (async)
    const paramFileList: string[] = [];
    if (execParams && typeof execParams === 'object') {
      for (const [, value] of Object.entries(execParams as Record<string, string>)) {
        const v = String(value);
        if (v.includes('/') || v.includes('.')) {
          const testPath = v.startsWith('/') ? v : join(TMP_DIR, v);
          if (await pathExists(testPath)) {
            paramFileList.push(testPath);
          }
        }
      }
    }

    if (language === 'pymol' || language === 'chimerax') {
      // PyMOL and ChimeraX use their own argument conventions:
      // PyMOL:    pymol -c script.py [args...]
      // ChimeraX: ChimeraX --nogui --script script.py [args...]
      // Their Python scripts read runtime globals (cmd / run) and params via
      // INPUT_<KEY> env vars; we skip the argparse/sys.argv path here.
      if (language === 'pymol') {
        args = ['-c', scriptFile];
      } else {
        // --exit makes ChimeraX quit as soon as the script finishes; without
        // it the process keeps the GUI event loop alive waiting for stdin.
        args = ['--nogui', '--silent', '--exit', '--script', scriptFile];
      }
    } else if (hasArgparse) {
      // Argparse-based scripts: convert params to --key value format.
      // Boolean / flag params (per script.params metadata) are appended as
      // --key alone, since argparse `add_argument('--flag', action='store_true')`
      // does not consume a value. Without this, "true" is treated as a
      // positional arg and produces "unrecognized arguments".
      // Input files whose key matches a known param name are passed as
      // --key value (not positional), so argparse `--input_pdb FILE` works.
      args = [scriptFile];
      // Build a set of names declared on the script for fast lookup. An input
      // file whose name matches a declared name should bind to that flag
      // (--key value); otherwise it falls back to a positional arg. Include
      // BOTH script.params (CLI args) and script.inputFiles (file inputs
      // declared via `add_argument('--input_pdb', type=str)`).
      const declaredParamNames = new Set<string>();
      for (const p of scriptParamMeta) {
        if (p?.name) declaredParamNames.add(p.name);
      }
      for (const f of scriptInputFiles) {
        if (f?.name) declaredParamNames.add(f.name);
      }
      if (execParams && typeof execParams === 'object') {
        for (const [key, value] of Object.entries(execParams as Record<string, string>)) {
          const flagKey = key.startsWith('-') ? key : `--${key}`;
          if (isFlagParam(key)) {
            // Only include --flag when the value is truthy, mirroring store_true.
            if (value && value !== 'false' && value !== '0') {
              args.push(flagKey);
            }
          } else {
            args.push(flagKey, String(value));
          }
        }
      }
      // Input files: bind to declared param flags as --key value; otherwise
      // append as positional args.
      const positionalInputs: string[] = [];
      for (const f of inputFileList) {
        if (declaredParamNames.has(f.key)) {
          args.push(`--${f.key}`, f.path);
        } else {
          positionalInputs.push(f.path);
        }
      }
      for (const fp of positionalInputs) args.push(fp);
    } else if (maxArgIndex > 0) {
      // sys.argv-based scripts: positional args
      args = [scriptFile];

      // Fill positional args: first from input files, then from params
      const allFiles = inputFileList.map((f) => f.path).concat(paramFileList);
      const paramValues = execParams && typeof execParams === 'object'
        ? Object.values(execParams as Record<string, string>).map(String)
        : [];

      for (let i = 1; i <= maxArgIndex; i++) {
        if (i - 1 < allFiles.length) {
          args.push(allFiles[i - 1]);
        } else if (i - 1 - allFiles.length < paramValues.length) {
          args.push(paramValues[i - 1 - allFiles.length]);
        } else {
          // Auto-generate output path for the last positional arg
          const outputPath = join(TMP_DIR, `${runId}_output${i === maxArgIndex && allFiles.length > 0 ? '_result.pdb' : '.txt'}`);
          args.push(outputPath);
        }
      }
    } else if (usageHint) {
      // Parse usage hint for positional args
      const hintArgs = usageHint.split(/\s+/).filter(Boolean);
      args = [scriptFile];
      for (let i = 0; i < hintArgs.length; i++) {
        if (i < inputFileList.length) {
          args.push(inputFileList[i].path);
        } else {
          const outputPath = join(TMP_DIR, `${runId}_output_${i}.txt`);
          args.push(outputPath);
        }
      }
    } else {
      // Fallback: JSON params file (async write)
      if (execParams && typeof execParams === 'object') {
        paramsFile = join(TMP_DIR, `${runId}_params.json`);
        await writeFile(paramsFile, JSON.stringify(execParams, null, 2), 'utf-8');
        for (const [key, value] of Object.entries(execParams as Record<string, string>)) {
          envOverrides[`PARAM_${key.toUpperCase()}`] = String(value);
        }
        args = [scriptFile, paramsFile];
      } else {
        args = [scriptFile];
      }
    }

    // Execute the script with timeout (default 60s, min 5s, max 600s)
    const timeoutMs = Math.max(5000, Math.min(600000, requestTimeout || 60000));
    // For chimerax/pymol scripts, expose a stable SESSION_PATH env var so the
    // script can save its session/state with `run(session, f"save $SESSION_PATH")`
    // (chimerax) or `cmd.save(SESSION_PATH)` (pymol). The resultFiles collector
    // picks up any file with the runId prefix.
    if (language === 'chimerax' || language === 'pymol') {
      const ext = language === 'pymol' ? 'pse' : 'cxs';
      envOverrides['SESSION_PATH'] = join(TMP_DIR, `${runId}_session.${ext}`);
    }

    const result = await executeCommand(command, args, envOverrides, timeoutMs);

    // Determine status
    let status: string;
    if (result.exitCode === 0) {
      status = 'success';
    } else if (result.exitCode === null) {
      status = 'timeout';
    } else {
      status = 'error';
    }

    // Collect result files from tmp dir (async)
    const resultFiles: Array<{ name: string; path: string; size: number }> = [];
    try {
      const tmpFiles = await readdir(TMP_DIR);
      for (const f of tmpFiles) {
        if (f.startsWith(runId) && f !== `${runId}${extension}` && f !== `${runId}_params.json`) {
          const filePath = join(TMP_DIR, f);
          try {
            const fileStat = await stat(filePath);
            if (fileStat.isFile()) {
              // Copy to uploads for persistent storage (async)
              const destPath = join(UPLOAD_DIR, `${runId}_${f.replace(runId + '_', '')}`);
              await copyFile(filePath, destPath);
              resultFiles.push({
                name: f.replace(runId + '_', ''),
                path: destPath,
                size: fileStat.size,
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ }

    // Create execution log
    const executionLog = await db.executionLog.create({
      data: {
        scriptId: script.id,
        params: execParams ? JSON.stringify(execParams) : '{}',
        output: result.output,
        error: result.error,
        status,
        duration: result.duration,
        exitCode: result.exitCode,
        resultFiles: JSON.stringify(resultFiles),
      },
    });

    // Clean up temp files (async)
    await cleanupTempFiles(scriptFile, paramsFile, execInputFiles);

    return NextResponse.json({
      execution: {
        id: executionLog.id,
        scriptId: executionLog.scriptId,
        params: executionLog.params,
        output: executionLog.output,
        error: executionLog.error,
        status: executionLog.status,
        duration: executionLog.duration,
        exitCode: executionLog.exitCode,
        createdAt: executionLog.createdAt,
      },
      output: result.output,
      error: result.error,
      exitCode: result.exitCode,
      duration: result.duration,
      status,
      resultFiles,
    });
  } catch (error) {
    // Clean up temp files on error (async)
    await cleanupTempFiles(scriptFile, paramsFile, execInputFiles);

    console.error('Error executing script:', error);
    return NextResponse.json(
      { error: 'Failed to execute script' },
      { status: 500 }
    );
  }
}
