import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { writeFile, mkdir, unlink, access, readdir, stat, copyFile } from 'fs/promises';
import { join, resolve } from 'path';
import { randomUUID } from 'crypto';

const TMP_DIR = '/tmp/script-manager';
const UPLOAD_DIR = '/home/z/my-project/uploads';

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
    const language = script.language?.toLowerCase() || 'python';

    // Determine file extension and command
    let command: string;
    let args: string[];
    let extension: string;

    if (language === 'chimerax') {
      return NextResponse.json({
        execution: null,
        output: '',
        error: `This is a ChimeraX script that requires the ChimeraX application to run.\nPlease open ChimeraX and run: open ${script.filename}\nOr use the ChimeraX command line to execute this script.`,
        exitCode: -1,
        duration: 0,
        status: 'requires_chimerax',
        resultFiles: [],
      });
    } else if (language === 'pymol') {
      return NextResponse.json({
        execution: null,
        output: '',
        error: `This is a PyMOL script that requires the PyMOL application to run.\nPlease open PyMOL and run: @${script.filename}\nOr use the PyMOL command line to execute this script.`,
        exitCode: -1,
        duration: 0,
        status: 'requires_pymol',
        resultFiles: [],
      });
    } else if (language === 'shell' || language === 'bash' || language === 'sh') {
      extension = '.sh';
      command = 'bash';
    } else if (language === 'node' || language === 'javascript' || language === 'js') {
      extension = '.js';
      command = 'node';
    } else if (language === 'python' || language === 'py') {
      extension = '.py';
      command = 'python3';
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

    // Build environment variables and copy input files to tmp dir
    const envOverrides: Record<string, string> = {};
    const inputFileList: string[] = [];
    if (execInputFiles && typeof execInputFiles === 'object') {
      for (const [key, value] of Object.entries(execInputFiles)) {
        const srcPath = join(UPLOAD_DIR, value);
        const resolvedSrc = resolve(srcPath);
        if (await pathExists(resolvedSrc) && resolvedSrc.startsWith(resolve(UPLOAD_DIR))) {
          // Copy with runId prefix to avoid collisions
          const destPath = join(TMP_DIR, `${runId}_${value}`);
          const resolvedDest = resolve(destPath);
          if (resolvedDest.startsWith(resolve(TMP_DIR))) {
            try {
              await copyFile(srcPath, destPath);
              inputFileList.push(destPath);
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
      ? Math.max(...argvMatches.map(m => parseInt(m.match(/\d+/)?.[0] || '0')))
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

    if (hasArgparse) {
      // Argparse-based scripts: convert params to --key value format
      args = [scriptFile];
      if (execParams && typeof execParams === 'object') {
        for (const [key, value] of Object.entries(execParams as Record<string, string>)) {
          if (key.startsWith('-')) {
            args.push(key, String(value));
          } else {
            args.push(`--${key}`, String(value));
          }
        }
      }
      // Add positional args for input files
      for (const fp of inputFileList) args.push(fp);
    } else if (maxArgIndex > 0) {
      // sys.argv-based scripts: positional args
      args = [scriptFile];

      // Fill positional args: first from input files, then from params
      const allFiles = [...inputFileList, ...paramFileList];
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
          args.push(inputFileList[i]);
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
      execution: executionLog,
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
