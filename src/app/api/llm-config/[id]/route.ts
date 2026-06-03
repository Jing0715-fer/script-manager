import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// PUT /api/llm-config/[id] - Update LLM config by id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.llmConfig.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'LLM config not found' },
        { status: 404 }
      );
    }

    // If setting as default, unset any existing default
    if (body.isDefault) {
      await db.llmConfig.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const config = await db.llmConfig.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.provider !== undefined && { provider: body.provider }),
        ...(body.apiKey !== undefined && { apiKey: body.apiKey }),
        ...(body.baseUrl !== undefined && { baseUrl: body.baseUrl }),
        ...(body.model !== undefined && { model: body.model }),
        ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
      },
    });

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Error updating LLM config:', error);
    return NextResponse.json(
      { error: 'Failed to update LLM config' },
      { status: 500 }
    );
  }
}

// DELETE /api/llm-config/[id] - Delete LLM config by id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.llmConfig.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'LLM config not found' },
        { status: 404 }
      );
    }

    await db.llmConfig.delete({ where: { id } });

    return NextResponse.json({ message: 'LLM config deleted successfully' });
  } catch (error) {
    console.error('Error deleting LLM config:', error);
    return NextResponse.json(
      { error: 'Failed to delete LLM config' },
      { status: 500 }
    );
  }
}
