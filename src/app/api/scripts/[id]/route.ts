import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/scripts/[id] - Get single script by id
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const script = await db.script.findUnique({
      where: { id },
      include: {
        executions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        externalApps: {
          include: {
            app: true,
          },
        },
      },
    });

    if (!script) {
      return NextResponse.json(
        { error: 'Script not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ script });
  } catch (error) {
    console.error('Error fetching script:', error);
    return NextResponse.json(
      { error: 'Failed to fetch script' },
      { status: 500 }
    );
  }
}

// PUT /api/scripts/[id] - Update script by id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate field lengths BEFORE update (mirror POST route). The previous
    // version validated after the update, which would let an oversized value
    // partially commit to the DB.
    if (body.name !== undefined && body.name.length > 200) {
      return NextResponse.json({ error: 'Name must be 200 characters or less' }, { status: 400 });
    }
    if (body.description !== undefined && body.description && body.description.length > 2000) {
      return NextResponse.json({ error: 'Description must be 2000 characters or less' }, { status: 400 });
    }

    const existing = await db.script.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Script not found' },
        { status: 404 }
      );
    }

    const script = await db.script.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.filename !== undefined && { filename: body.filename }),
        ...(body.content !== undefined && { content: body.content }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.language !== undefined && { language: body.language }),
        ...(body.source !== undefined && { source: body.source }),
        ...(body.sourceUrl !== undefined && { sourceUrl: body.sourceUrl }),
        ...(body.params !== undefined && { params: body.params }),
        ...(body.inputFiles !== undefined && { inputFiles: body.inputFiles }),
        ...(body.outputFiles !== undefined && { outputFiles: body.outputFiles }),
        ...(body.rating !== undefined && { rating: body.rating }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.tags !== undefined && { tags: body.tags }),
      },
    });

    return NextResponse.json({ script });
  } catch (error) {
    console.error('Error updating script:', error);
    return NextResponse.json(
      { error: 'Failed to update script' },
      { status: 500 }
    );
  }
}

// DELETE /api/scripts/[id] - Delete script by id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.script.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Script not found' },
        { status: 404 }
      );
    }

    await db.script.delete({ where: { id } });

    return NextResponse.json({ message: 'Script deleted successfully' });
  } catch (error) {
    console.error('Error deleting script:', error);
    return NextResponse.json(
      { error: 'Failed to delete script' },
      { status: 500 }
    );
  }
}
