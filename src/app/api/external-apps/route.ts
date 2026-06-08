import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/external-apps - List all external apps
export async function GET() {
  try {
    const apps = await db.externalApp.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { scripts: true },
        },
      },
    });

    return NextResponse.json({ apps });
  } catch (error) {
    console.error('Error fetching external apps:', error);
    return NextResponse.json(
      { error: 'Failed to fetch external apps' },
      { status: 500 }
    );
  }
}

// POST /api/external-apps - Create a new external app
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, appPath, appType, icon, scriptExt, runCommand } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    const app = await db.externalApp.create({
      data: {
        name,
        description: description || '',
        appPath: appPath || '',
        appType: appType || 'generic',
        icon: icon || 'terminal',
        scriptExt: scriptExt || '.py',
        runCommand: runCommand || '',
      },
    });

    return NextResponse.json({ app }, { status: 201 });
  } catch (error) {
    console.error('Error creating external app:', error);
    return NextResponse.json(
      { error: 'Failed to create external app' },
      { status: 500 }
    );
  }
}
