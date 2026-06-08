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

    return NextResponse.json({ scripts });
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
    const { name, description, filename, content, category, language, source, sourceUrl, params, inputFiles, outputFiles, tags, rating } = body;

    if (!name || !filename || !content) {
      return NextResponse.json(
        { error: 'name, filename, and content are required' },
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
        content,
        category: category || 'Uncategorized',
        language: language || 'python',
        source: source || 'manual',
        sourceUrl: sourceUrl || null,
        params: params || '[]',
        inputFiles: inputFiles || '[]',
        outputFiles: outputFiles || '[]',
        tags: tags || '[]',
        rating: rating || null,
      },
    });

    return NextResponse.json({ script }, { status: 201 });
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
