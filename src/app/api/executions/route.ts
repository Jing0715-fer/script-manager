import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { join } from 'path';

const UPLOAD_DIR = process.env.SCRIPT_MANAGER_UPLOAD_DIR || join(process.cwd(), 'uploads');

// DELETE /api/executions - Delete a single execution log and its result files
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    const execution = await db.executionLog.findUnique({ where: { id }, select: { resultFiles: true } });
    if (!execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }
    // Cleanup result files on disk
    if (execution.resultFiles) {
      try {
        const files = JSON.parse(execution.resultFiles);
        for (const f of files) {
          if (f.path) await unlink(join(UPLOAD_DIR, f.path)).catch(() => {});
        }
      } catch { /* ignore */ }
    }
    await db.executionLog.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting execution:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}

// GET /api/executions - Full execution history API with stats, daily trend, and top scripts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const period = searchParams.get('period') || '7d';
    const status = searchParams.get('status') || undefined;
    const scriptId = searchParams.get('scriptId') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);
    let offset = parseInt(searchParams.get('offset') || '0', 10);
    if (isNaN(offset) || offset < 0) offset = 0;

    // Build date filter based on period
    const now = new Date();
    let dateFilter: Date | undefined;
    switch (period) {
      case '24h':
        dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        dateFilter = undefined;
        break;
    }

    // Build where clause
    const whereConditions: Record<string, unknown>[] = [];
    if (dateFilter) {
      whereConditions.push({ createdAt: { gte: dateFilter } });
    }
    if (scriptId) {
      whereConditions.push({ scriptId });
    }
    if (status) {
      whereConditions.push({ status });
    }

    const where = whereConditions.length > 0
      ? whereConditions.length === 1
        ? whereConditions[0]
        : { AND: whereConditions }
      : undefined;

    // Fetch executions with script info, plus total count
    const [executions, totalCount] = await Promise.all([
      db.executionLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          script: {
            select: { id: true, name: true, filename: true, language: true, category: true },
          },
        },
      }),
      db.executionLog.count({ where }),
    ]);

    // Compute daily trend and top scripts
    // For accurate stats, we need all matching executions (not just the paginated ones)
    const allMatchingExecutions = await db.executionLog.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: {
        scriptId: true,
        status: true,
        duration: true,
        createdAt: true,
        script: {
          select: { id: true, name: true },
        },
      },
    });

    // Compute aggregate stats (across all matching records)
    const successCount = allMatchingExecutions.filter((e: { status: string }) => e.status === 'success').length;
    const errorCount = allMatchingExecutions.filter((e: { status: string }) => e.status === 'error').length;
    const runningCount = allMatchingExecutions.filter((e: { status: string }) => e.status === 'running').length;
    const durations = allMatchingExecutions.filter((e: { duration: number }) => e.duration > 0).map((e: { duration: number }) => e.duration);
    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length)
      : 0;
    const totalRuns = allMatchingExecutions.length;
    const successRate = totalRuns > 0 ? parseFloat(((successCount / totalRuns) * 100).toFixed(1)) : 0;

    // Group by date
    const dailyMap = new Map<string, { count: number; successCount: number; errorCount: number }>();
    for (const exec of allMatchingExecutions) {
      const dateStr = exec.createdAt.toISOString().split('T')[0];
      const existing = dailyMap.get(dateStr) || { count: 0, successCount: 0, errorCount: 0 };
      existing.count++;
      if (exec.status === 'success') existing.successCount++;
      if (exec.status === 'error') existing.errorCount++;
      dailyMap.set(dateStr, existing);
    }

    // Fill in missing dates for the period
    const dailyTrend: Array<{ date: string; count: number; successCount: number; errorCount: number }> = [];
    const daysToShow = period === '24h' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : Math.max(dailyMap.size, 30);
    for (let i = daysToShow - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const data = dailyMap.get(dateStr) || { count: 0, successCount: 0, errorCount: 0 };
      dailyTrend.push({ date: dateStr, ...data });
    }

    // Compute top scripts by execution count
    const scriptCountMap = new Map<string, { scriptId: string; scriptName: string; count: number; totalDuration: number; successCount: number }>();
    for (const exec of allMatchingExecutions) {
      const scriptName = exec.script?.name || 'Unknown';
      const sid = exec.scriptId;
      const existing = scriptCountMap.get(sid) || { scriptId: sid, scriptName, count: 0, totalDuration: 0, successCount: 0 };
      existing.count++;
      existing.totalDuration += exec.duration || 0;
      if (exec.status === 'success') existing.successCount++;
      scriptCountMap.set(sid, existing);
    }

    const topScripts = Array.from(scriptCountMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(s => ({
        scriptId: s.scriptId,
        scriptName: s.scriptName,
        count: s.count,
        avgDuration: s.count > 0 ? Math.round(s.totalDuration / s.count) : 0,
        successRate: s.count > 0 ? parseFloat(((s.successCount / s.count) * 100).toFixed(1)) : 0,
      }));

    return NextResponse.json({
      executions: executions.map((e: any) => ({
        id: e.id,
        scriptId: e.scriptId,
        scriptName: e.script?.name || 'Unknown',
        status: e.status,
        duration: e.duration,
        output: e.output,
        error: e.error,
        exitCode: e.exitCode,
        createdAt: e.createdAt,
      })),
      stats: {
        totalRuns,
        successCount,
        errorCount,
        runningCount,
        avgDuration,
        successRate,
      },
      dailyTrend,
      topScripts,
      pagination: {
        total: totalCount,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Error fetching executions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch executions' },
      { status: 500 }
    );
  }
}
