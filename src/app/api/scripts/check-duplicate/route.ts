import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/scripts/check-duplicate?filename=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json(
        { error: 'Missing filename query parameter' },
        { status: 400 }
      );
    }

    const existing = await db.script.findFirst({
      where: { filename },
      select: {
        id: true,
        name: true,
        filename: true,
        updatedAt: true,
      },
    });

    if (existing) {
      return NextResponse.json({
        exists: true,
        script: existing,
      });
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    console.error('Error checking duplicate script:', error);
    return NextResponse.json(
      { error: 'Failed to check for duplicate' },
      { status: 500 }
    );
  }
}
