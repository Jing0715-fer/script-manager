import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const UPLOAD_DIR = process.env.SCRIPT_MANAGER_UPLOAD_DIR || join(process.cwd(), 'uploads');

// GET /api/files/[id] - Download a file by its stored name
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Find file that starts with this id
    if (!existsSync(UPLOAD_DIR)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const files = readdirSync(UPLOAD_DIR);
    const targetFile = files.find(f => f.startsWith(id));

    if (!targetFile) {
      // Also check for files with runId prefix (result files)
      const resultFile = files.find(f => f.includes(id));
      if (!resultFile) {
        return NextResponse.json(
          { error: 'File not found' },
          { status: 404 }
        );
      }
      const filePath = join(UPLOAD_DIR, resultFile);
      const buffer = readFileSync(filePath);
      const fileName = resultFile.includes('_') ? resultFile.split('_').slice(1).join('_') : resultFile;

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      });
    }

    const filePath = join(UPLOAD_DIR, targetFile);
    const buffer = readFileSync(filePath);
    const fileName = targetFile.includes('_') ? targetFile.split('_').slice(1).join('_') : targetFile;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
