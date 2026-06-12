import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = process.env.SCRIPT_MANAGER_UPLOAD_DIR || join(process.cwd(), 'uploads');

// POST /api/files/upload - Upload a file (multipart/form-data)
// Returns { id, name, size, type, url } where `name` is the stored filename
// (relative to UPLOAD_DIR) and `url` is a public download URL. The stored
// name has a random prefix to avoid collisions and is sanitized for security.
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    await mkdir(UPLOAD_DIR, { recursive: true });

    // Sanitize original filename: keep alnum + . _ -, replace others with _
    const original = (file as File).name || 'upload';
    const safeBase = original
      .replace(/[^A-Za-z0-9._-]+/g, '_')
      .replace(/^[._-]+|[._-]+$/g, '')
      .slice(0, 80) || 'upload';
    const id = randomUUID().slice(0, 8);
    const storedName = `${id}_${safeBase}`;
    const destPath = join(UPLOAD_DIR, storedName);

    const buf = Buffer.from(await (file as File).arrayBuffer());
    await writeFile(destPath, buf);

    return NextResponse.json({
      ok: true,
      id,
      name: storedName,
      originalName: original,
      size: buf.length,
      type: (file as File).type,
      url: `/api/files/${id}`,
    });
  } catch (err: any) {
    console.error('upload error:', err);
    return NextResponse.json(
      { error: err?.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
