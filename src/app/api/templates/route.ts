import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/templates — List script templates.
 *
 * Currently returns static built-in templates. Future: move to DB.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const appType = searchParams.get('appType');

  // Built-in templates — language examples users can start from
  const templates = [
    {
      id: 'tmpl-chimerax-basic',
      name: 'ChimeraX Basic Script',
      description: 'A basic ChimeraX script template with session handling',
      appType: 'chimerax',
      category: 'General',
      code: '# ChimeraX Basic Script Template\n# Usage: open script.cxc in ChimeraX\n\nfrom chimerax.core.commands import run\n\ndef main(session):\n    """Main entry point."""\n    session.logger.info("Script started")\n    # Your code here\n    pass\n',
      params: [],
      icon: '🧬',
      isBuiltin: true,
    },
    {
      id: 'tmpl-pymol-basic',
      name: 'PyMOL Basic Script',
      description: 'A basic PyMOL script template for structure manipulation',
      appType: 'pymol',
      category: 'General',
      code: '# PyMOL Basic Script Template\n# Usage: run script.pml in PyMOL\n\n# Load structure\nfetch 1abc, async=0\n\n# Basic visualization\nhide everything\nshow cartoon, chain A\ncolor skyblue, chain A\n',
      params: [],
      icon: '🔬',
      isBuiltin: true,
    },
    {
      id: 'tmpl-pymol-analysis',
      name: 'PyMOL Structure Analysis',
      description: 'Template for analyzing protein structures with DSSP and angles',
      appType: 'pymol',
      category: 'Structural Biology',
      code: '# PyMOL Structure Analysis Template\n# Analyzes secondary structure and geometry\n\nfetch 1abc, async=0\n\n# Secondary structure assignment\ncmd.dssp()\n\n# Calculate distances\n# dist (chain A and resn 1 and name CA), (chain A and resn 10 and name CA)\n',
      params: [
        {
          name: 'pdb_id',
          type: 'string',
          label: 'PDB ID',
          description: '4-character PDB identifier',
          required: true,
        },
      ],
      icon: '📊',
      isBuiltin: true,
    },
  ].filter((t) => !appType || t.appType === appType);

  return NextResponse.json(templates);
}
