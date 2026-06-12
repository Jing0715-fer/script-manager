import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/scripts - List all scripts with optional category filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const excludeContent = searchParams.get('excludeContent') === 'true';
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(500, Math.max(1, parseInt(limitParam) || 0)) : 0;
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0') || 0);

    const where = category ? { category } : {};

    const selectOptions: any = {
      id: true,
      name: true,
      description: true,
      filename: true,
      content: excludeContent ? false : true,
      category: true,
      language: true,
      source: true,
      sourceUrl: true,
      params: true,
      inputFiles: true,
      outputFiles: true,
      tags: true,
      rating: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { executions: true },
      },
      externalApps: {
        include: {
          app: true,
        },
      },
    };

    const queryOptions: any = {
      where,
      orderBy: { updatedAt: 'desc' },
      select: selectOptions,
    };
    if (limit > 0) {
      queryOptions.take = limit;
      queryOptions.skip = offset;
    }

    const scripts = await db.script.findMany(queryOptions);

    // Normalize Prisma shape -> frontend Script shape:
    // - content -> code
    // - params / inputFiles / outputFiles / tags stored as JSON strings -> parsed arrays
    // - missing Script fields get sensible defaults
    const safeParse = (s: string | null | undefined, fallback: unknown = []) => {
      if (s == null || s === '') return fallback;
      try { return JSON.parse(s); } catch { return fallback; }
    };
    const normalized = (scripts as any[]).map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description ?? '',
      code: s.content ?? '',
      language: s.language ?? 'python',
      category: s.category ?? 'Uncategorized',
      filename: s.filename,
      source: s.source ?? 'manual',
      sourceUrl: s.sourceUrl ?? undefined,
      params: safeParse(s.params, []),
      inputFiles: safeParse(s.inputFiles, []),
      outputFiles: safeParse(s.outputFiles, []),
      tags: safeParse(s.tags, []),
      isFavorite: false,
      isPinned: false,
      rating: s.rating ?? 0,
      version: 1,
      runCount: s._count?.executions ?? 0,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      apps: s.externalApps ?? [],
    }));

    return NextResponse.json({ scripts: normalized });
  } catch (error) {
    console.error('Error fetching scripts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scripts' },
      { status: 500 }
    );
  }
}

// POST /api/scripts - Create a new script
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, filename, content, code, category, language, source, sourceUrl, params, inputFiles, outputFiles, tags, rating } = body;

    if (!name || !filename || (!content && !code)) {
      return NextResponse.json(
        { error: 'name, filename, and content/code are required' },
        { status: 400 }
      );
    }

    // Validate field lengths
    if (name.length > 200) {
      return NextResponse.json({ error: 'Name must be 200 characters or less' }, { status: 400 });
    }
    if (description && description.length > 2000) {
      return NextResponse.json({ error: 'Description must be 2000 characters or less' }, { status: 400 });
    }

    const script = await db.script.create({
      data: {
        name,
        description: description || '',
        filename,
        content: content || code,
        category: category || 'Uncategorized',
        language: language || 'python',
        source: source || 'manual',
        sourceUrl: sourceUrl || null,
        params: typeof params === 'string' ? params : (params ? JSON.stringify(params) : '[]'),
        inputFiles: typeof inputFiles === 'string' ? inputFiles : (inputFiles ? JSON.stringify(inputFiles) : '[]'),
        outputFiles: typeof outputFiles === 'string' ? outputFiles : (outputFiles ? JSON.stringify(outputFiles) : '[]'),
        tags: typeof tags === 'string' ? tags : (tags ? JSON.stringify(tags) : '[]'),
        rating: rating || null,
      },
    });

    // Normalize response shape (code, tags, params, etc.) to match frontend Script type
    const safeParse2 = (s: string | null | undefined, fallback: unknown = []) => {
      if (s == null || s === '') return fallback;
      try { return JSON.parse(s); } catch { return fallback; }
    };
    const normalizedScript = {
      id: script.id,
      name: script.name,
      description: script.description ?? '',
      code: script.content ?? '',
      language: script.language ?? 'python',
      category: script.category ?? 'Uncategorized',
      filename: script.filename,
      source: script.source ?? 'manual',
      sourceUrl: script.sourceUrl ?? undefined,
      params: safeParse2(script.params, []),
      inputFiles: safeParse2(script.inputFiles, []),
      outputFiles: safeParse2(script.outputFiles, []),
      tags: safeParse2(script.tags, []),
      isFavorite: false,
      isPinned: false,
      rating: script.rating ?? 0,
      version: 1,
      runCount: 0,
      createdAt: script.createdAt,
      updatedAt: script.updatedAt,
    };

    return NextResponse.json({ script: normalizedScript }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'A script with this filename already exists' }, { status: 409 });
    }
    console.error('Error creating script:', error);
    return NextResponse.json(
      { error: 'Failed to create script' },
      { status: 500 }
    );
  }
}
