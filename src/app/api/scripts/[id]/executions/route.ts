import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

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

    return NextResponse.json({ executions });
  } catch (error) {
    console.error('Error fetching executions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch executions' },
      { status: 500 }
    );
  }
}
