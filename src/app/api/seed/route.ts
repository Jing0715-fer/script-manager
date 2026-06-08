import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSeedData } from '@/lib/demo-data';
import { PPTX_SKILLS } from '@/lib/pptx-skills-data';

const REPO_RAW_BASE = 'https://raw.githubusercontent.com/Jing0715-fer/pptx-template-editor/main';

// GET /api/seed - Seed demo scripts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source') || 'demo';

  try {
    if (source === 'github') {
      const GITHUB_REPO = 'Jing0715-fer/my-py-scripts';
      const RAW_BASE_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main`;

      // List of all script files in my-py-scripts repo
      const scriptFiles = [
        'ANARCI.py', 'H_bond_interface_plan.py', 'add_scalebar.py',
        'auto_color_locres.py', 'cli_runner.py', 'epitope_visualizer.py',
        'epitope_visualizer_pptx.py', 'fab_cdr_to_chimerax_api.py',
        'find_cdr_of_fab.py', 'flip_all_mrc.py', 'highlight_cdr_auto.py',
        'interaction_matrix.py', 'interaction_to_excel.py',
        'interaction_to_xlxs_chimeraX.py', 'interface_residue_ppt.py',
        'interface_visualizer.py', 'lignad_interaction.py', 'locres_query.py',
        'nb.py', 'pi.py', 'ppt_to_images.py',
        'protein_interface_analysis.py', 'rename_chainid.py',
        'rename_chainid2.py', 'rmsd.py', 'rmsd_chimera.py',
        'run_script.py', 'run_segid.py', 'script_runner.py', 'script_ui.py',
        'segID.py', 'segid_runner.py', 'segment_and_isomesh_auto.py',
        'simple_runner.py', 'test.py', 'test_button.py', 'test_cli.py',
        'test_script.py', 'test_segid.py', 'tile.py',
      ];

      let imported = 0;
      let failed = 0;
      for (const file of scriptFiles) {
        try {
          const rawUrl = `${RAW_BASE_URL}/${file}`;
          const contentResponse = await fetch(rawUrl);
          if (contentResponse.ok) {
            const content = await contentResponse.text();
            const filename = file;
            // Generate human-readable name from filename
            const name = file.replace(/\.py$/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            const description = content.split('\n').find((l: string) => l.trim().startsWith('"""') || (l.trim().startsWith('#') && !l.trim().startsWith('#!')))?.replace(/^#+\s*/, '').replace(/^"""\s*/, '').slice(0, 200) || `Script: ${name}`;
            const category = 'Structural Biology';

            await db.script.upsert({
              where: { filename },
              update: { name, description, content, category, language: 'python', source: 'github', sourceUrl: rawUrl },
              create: { name, description, filename, content, category, language: 'python', source: 'github', sourceUrl: rawUrl, params: '[]', inputFiles: '[]', outputFiles: '[]' },
            });
            imported++;
          } else { failed++; }
        } catch { failed++; }
      }
      return NextResponse.json({ imported, failed, total: scriptFiles.length, message: `Imported ${imported} of ${scriptFiles.length} from my-py-scripts (${failed} failed)` });
    }

    if (source === 'pptx-template-editor') {
      let imported = 0;
      let failed = 0;
      for (const skill of PPTX_SKILLS) {
        try {
          const rawUrl = `${REPO_RAW_BASE}/${skill.scriptPath}`;
          const resp = await fetch(rawUrl);
          if (resp.ok) {
            const content = await resp.text();
            await db.script.upsert({
              where: { filename: skill.filename },
              update: { name: skill.name, description: skill.description, content, category: skill.category, language: skill.language, source: 'github', sourceUrl: rawUrl, params: skill.params, inputFiles: skill.inputFiles, outputFiles: skill.outputFiles, tags: skill.tags },
              create: { name: skill.name, description: skill.description, filename: skill.filename, content, category: skill.category, language: skill.language, source: 'github', sourceUrl: rawUrl, params: skill.params, inputFiles: skill.inputFiles, outputFiles: skill.outputFiles, tags: skill.tags },
            });
            imported++;
          } else { failed++; }
        } catch { failed++; }
      }
      return NextResponse.json({ imported, failed, total: PPTX_SKILLS.length, message: `Imported ${imported}/${PPTX_SKILLS.length} from pptx-template-editor` });
    }

    if (source === 'all') {
      let totalImported = 0;

      // 1. Demo scripts
      const DEMO_SCRIPTS = getSeedData();
      for (const script of DEMO_SCRIPTS) {
        try {
          await db.script.upsert({
            where: { filename: script.filename },
            update: { name: script.name, description: script.description, content: script.content, category: script.category, language: script.language, source: script.source, params: script.params, inputFiles: script.inputFiles, outputFiles: script.outputFiles },
            create: { name: script.name, description: script.description, filename: script.filename, content: script.content, category: script.category, language: script.language, source: script.source, params: script.params, inputFiles: script.inputFiles, outputFiles: script.outputFiles },
          });
          totalImported++;
        } catch { /* ignore */ }
      }

      // 2. pptx-template-editor scripts
      for (const skill of PPTX_SKILLS) {
        try {
          const rawUrl = `${REPO_RAW_BASE}/${skill.scriptPath}`;
          const resp = await fetch(rawUrl);
          if (resp.ok) {
            const content = await resp.text();
            await db.script.upsert({
              where: { filename: skill.filename },
              update: { name: skill.name, description: skill.description, content, category: skill.category, language: skill.language, source: 'github', sourceUrl: rawUrl, params: skill.params, inputFiles: skill.inputFiles, outputFiles: skill.outputFiles, tags: skill.tags },
              create: { name: skill.name, description: skill.description, filename: skill.filename, content, category: skill.category, language: skill.language, source: 'github', sourceUrl: rawUrl, params: skill.params, inputFiles: skill.inputFiles, outputFiles: skill.outputFiles, tags: skill.tags },
            });
            totalImported++;
          }
        } catch { /* ignore */ }
      }

      return NextResponse.json({ imported: totalImported, message: `Seeded all: ${DEMO_SCRIPTS.length} demo + ${PPTX_SKILLS.length} pptx-template-editor` });
    }

    // Default: demo scripts
    const DEMO_SCRIPTS = getSeedData();
    let imported = 0;
    for (const script of DEMO_SCRIPTS) {
      try {
        await db.script.upsert({
          where: { filename: script.filename },
          update: { name: script.name, description: script.description, content: script.content, category: script.category, language: script.language, source: script.source, params: script.params, inputFiles: script.inputFiles, outputFiles: script.outputFiles },
          create: { name: script.name, description: script.description, filename: script.filename, content: script.content, category: script.category, language: script.language, source: script.source, params: script.params, inputFiles: script.inputFiles, outputFiles: script.outputFiles },
        });
        imported++;
      } catch { /* ignore */ }
    }
    return NextResponse.json({ imported, total: DEMO_SCRIPTS.length, message: `Imported ${imported} demo scripts` });
  } catch (error) {
    console.error('Error seeding scripts:', error);
    return NextResponse.json({ error: 'Failed to seed scripts' }, { status: 500 });
  }
}
