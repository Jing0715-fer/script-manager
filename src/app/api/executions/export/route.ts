import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/executions/export - Export execution history as CSV
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters (same as /api/executions)
    const period = searchParams.get('period') || '30d';
    const status = searchParams.get('status') || undefined;
    const scriptId = searchParams.get('scriptId') || undefined;

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

    // Fetch all matching executions
    const executions = await db.executionLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        script: {
          select: { name: true },
        },
      },
    });

    // Helper to escape CSV fields
    const escapeCsv = (value: string): string => {
      if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    // Truncate helper
    const truncate = (str: string, maxLen: number): string => {
      if (!str) return '';
      return str.length > maxLen ? str.slice(0, maxLen) : str;
    };

    // Build CSV
    const headers = ['Script Name', 'Status', 'Duration (ms)', 'Exit Code', 'Timestamp', 'Output', 'Error'];
    const rows = executions.map(e => [
      escapeCsv(e.script?.name || 'Unknown'),
      escapeCsv(e.status),
      String(e.duration),
      e.exitCode != null ? String(e.exitCode) : '',
      escapeCsv(e.createdAt.toISOString()),
      escapeCsv(truncate(e.output || '', 200)),
      escapeCsv(truncate(e.error || '', 200)),
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const filename = `execution-report-${period}-${now.toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting executions:', error);
    return NextResponse.json(
      { error: 'Failed to export executions' },
      { status: 500 }
    );
  }
}
