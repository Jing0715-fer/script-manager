import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/scripts/clean-descriptions
 *
 * Batch-clean garbage data from script description fields.
 * Detects: PDB data (ATOM, HETATM, HEADER, REMARK, etc.), regex patterns,
 * multi-line garbage, and excessively long descriptions.
 *
 * Returns a report of what was cleaned.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun !== false; // default: dry run

    const scripts = await db.script.findMany({
      select: { id: true, name: true, description: true },
    });

    // Patterns that indicate garbage data in description
    const isGarbage = (desc: string): boolean => {
      if (!desc || desc.trim().length === 0) return false; // empty is fine
      if (desc.length > 300) return true; // too long for a description
      if (desc.split('\n').length > 5) return true; // multi-line garbage
      // PDB data markers
      if (/\bATOM\s+\d+/.test(desc)) return true;
      if (/\bHETATM/.test(desc)) return true;
      if (/\bREMARK\s+\d+/.test(desc)) return true;
      if (/\bHEADER/.test(desc)) return true;
      if (/\bSEQRES/.test(desc)) return true;
      if (/\bHELIX\s+\d+/.test(desc)) return true;
      if (/\bSHEET\s+\d+/.test(desc)) return true;
      if (/\bCRYST1/.test(desc)) return true;
      if (/\bORIGX[123]/.test(desc)) return true;
      if (/\bSCALE[123]/.test(desc)) return true;
      if (/\bMASTER\s+\d+/.test(desc)) return true;
      if (/\bEND\b/.test(desc) && desc.length > 50) return true;
      // Starts with PDB-like uppercase block
      if (/^(ATOM|HETATM|REMARK|HEADER|SEQRES|HELIX|SHEET|CRYST1|END|MASTER)\b/.test(desc)) return true;
      return false;
    };

    const toClean = scripts.filter((s) => isGarbage(s.description || ''));

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        total: scripts.length,
        toClean: toClean.length,
        samples: toClean.slice(0, 10).map((s) => ({
          id: s.id,
          name: s.name,
          descriptionPreview: s.description?.substring(0, 120),
        })),
      });
    }

    // Clean: set garbage descriptions to empty string
    let cleaned = 0;
    for (const s of toClean) {
      await db.script.update({
        where: { id: s.id },
        data: { description: '' },
      });
      cleaned++;
    }

    return NextResponse.json({
      dryRun: false,
      total: scripts.length,
      cleaned,
    });
  } catch (error) {
    console.error('Error cleaning descriptions:', error);
    return NextResponse.json(
      { error: 'Failed to clean descriptions' },
      { status: 500 },
    );
  }
}
