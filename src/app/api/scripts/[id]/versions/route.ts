// @ts-nocheck
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/scripts/[id]/versions — list versions (paginated, latest first)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(_request.url);
    let page = parseInt(searchParams.get('page') || '1', 10);
    if (isNaN(page) || page < 1) page = 1;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

    const where = { scriptId: id };

    const [versions, total] = await Promise.all([
      db.scriptVersion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.scriptVersion.count({ where }),
    ]);

    return NextResponse.json({
      versions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching script versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch versions' },
      { status: 500 }
    );
  }
}

// POST /api/scripts/[id]/versions — create new version
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content, message } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const lineCount = content.split('\n').length;

    const version = await db.scriptVersion.create({
      data: {
        scriptId: id,
        content,
        lineCount,
        message: message || null,
      },
    });

    return NextResponse.json({ version }, { status: 201 });
  } catch (error) {
    console.error('Error creating script version:', error);
    return NextResponse.json(
      { error: 'Failed to create version' },
      { status: 500 }
    );
  }
}
