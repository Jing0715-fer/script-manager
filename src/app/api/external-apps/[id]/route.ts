import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/external-apps/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const app = await db.externalApp.findUnique({
      where: { id },
      include: {
        scripts: {
          include: {
            script: true,
          },
        },
      },
    });

    if (!app) {
      return NextResponse.json(
        { error: 'External app not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ app });
  } catch (error) {
    console.error('Error fetching external app:', error);
    return NextResponse.json(
      { error: 'Failed to fetch external app' },
      { status: 500 }
    );
  }
}

// PUT /api/external-apps/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.externalApp.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'External app not found' },
        { status: 404 }
      );
    }

    const app = await db.externalApp.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.appPath !== undefined && { appPath: body.appPath }),
        ...(body.appType !== undefined && { appType: body.appType }),
        ...(body.icon !== undefined && { icon: body.icon }),
        ...(body.scriptExt !== undefined && { scriptExt: body.scriptExt }),
        ...(body.runCommand !== undefined && { runCommand: body.runCommand }),
      },
    });

    return NextResponse.json({ app });
  } catch (error) {
    console.error('Error updating external app:', error);
    return NextResponse.json(
      { error: 'Failed to update external app' },
      { status: 500 }
    );
  }
}

// DELETE /api/external-apps/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.externalApp.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'External app not found' },
        { status: 404 }
      );
    }

    await db.externalApp.delete({ where: { id } });

    return NextResponse.json({ message: 'External app deleted successfully' });
  } catch (error) {
    console.error('Error deleting external app:', error);
    return NextResponse.json(
      { error: 'Failed to delete external app' },
      { status: 500 }
    );
  }
}
