import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractParams, extractDescription } from '@/lib/script-analyzer';

// POST /api/scripts/migrate
// One-shot migration: re-derive description + params from code for all scripts
// that have empty description or empty params. Useful after adding the
// analyzer utility.
export async function POST(_req: NextRequest) {
  try {
    const all = await db.script.findMany({
      select: { id: true, name: true, filename: true, language: true, content: true, description: true, params: true },
    });
    let updated = 0;
    const summary: Array<{ id: string; name: string; changed: string[]; params: number; description: string }> = [];
    for (const s of all) {
      const desc = (s.description || '').trim();
      let paramsArr: any[] = [];
      try { paramsArr = JSON.parse(s.params || '[]'); } catch { paramsArr = []; }

      const newDesc = desc || extractDescription(s.content, s.language, s.name, s.filename);
      const newParams = (paramsArr.length === 0) ? extractParams(s.content, s.language) : paramsArr;
      const changed: string[] = [];
      if (newDesc && newDesc !== s.description) changed.push('description');
      if (newParams.length !== paramsArr.length || (newParams.length && paramsArr.length === 0)) {
        changed.push(`params (${paramsArr.length} → ${newParams.length})`);
      }
      if (changed.length) {
        await db.script.update({
          where: { id: s.id },
          data: {
            description: newDesc || s.description,
            params: JSON.stringify(newParams),
          },
        });
        updated++;
      }
      summary.push({
        id: s.id,
        name: s.name,
        changed,
        params: newParams.length,
        description: newDesc || s.description,
      });
    }
    return NextResponse.json({ ok: true, updated, total: all.length, summary });
  } catch (err: any) {
    console.error('migrate error:', err);
    return NextResponse.json({ error: err?.message || 'migrate failed' }, { status: 500 });
  }
}
