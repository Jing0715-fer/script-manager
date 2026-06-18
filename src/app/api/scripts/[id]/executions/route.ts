// @ts-nocheck
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

function safeParse<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

// GET /api/scripts/[id]/executions - Fetch execution logs for a script
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const script = await db.script.findUnique({ where: { id } });
    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }

    const executions = await db.executionLog.findMany({
      where: { scriptId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        status: true,
        duration: true,
        output: true,
        error: true,
        exitCode: true,
        params: true,
        resultFiles: true,
        createdAt: true,
      },
    });

    // Parse JSON-encoded string fields so the API contract matches the single
    // execution endpoint (/api/executions/[id]) and the frontend types.
    const normalized = executions.map((e: any) => ({
      ...e,
      params: e.params ? safeParse(e.params, {}) : {},
      resultFiles: e.resultFiles ? safeParse(e.resultFiles, []) : [],
    }));

    return NextResponse.json({ executions: normalized });
  } catch (error) {
    console.error('Error fetching executions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch executions' },
      { status: 500 }
    );
  }
}
