import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET /api/tags - Returns all unique tags across all scripts with counts
export async function GET() {
  try {
    const scripts = await db.script.findMany({
      select: { tags: true },
    });

    const tagCounts: Record<string, number> = {};
    for (const script of scripts) {
      try {
        const tags: string[] = JSON.parse(script.tags || '[]');
        for (const tag of tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      } catch {
        // ignore malformed tags
      }
    }

    const tags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    return NextResponse.json({ tags, total: tags.length });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}
