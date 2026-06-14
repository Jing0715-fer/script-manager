import { NextRequest, NextResponse } from 'next/server';
import { createReadStream, existsSync } from 'fs';
import { join, resolve } from 'path';
import { stat } from 'fs/promises';

const UPLOAD_DIR = process.env.SCRIPT_MANAGER_UPLOAD_DIR || join(process.cwd(), 'uploads');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');
    if (!filePath) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 });
    }

    const fullPath = resolve(join(UPLOAD_DIR, filePath));
    // Security: ensure resolved path is within UPLOAD_DIR
    if (!fullPath.startsWith(resolve(UPLOAD_DIR) + '/') && fullPath !== resolve(UPLOAD_DIR)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileStat = await stat(fullPath);
    const stream = createReadStream(fullPath);

    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filePath}"`,
        'Content-Length': String(fileStat.size),
      },
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
