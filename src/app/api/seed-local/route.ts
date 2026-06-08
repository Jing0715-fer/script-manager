import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const LOCAL_SCRIPTS_DIR = '/home/z/my-project/local-scripts';

// Script metadata registry — manually curated for accurate categorization
interface ScriptMeta {
  filename: string;
  name: string;
  description: string;
  category: string;
  language: string; // 'python' | 'chimerax' | 'pymol'
  tags: string[];
  params: string; // JSON
  inputFiles: string; // JSON
  outputFiles: string; // JSON
}

const SCRIPT_REGISTRY: ScriptMeta[] = [
  // ─── PDB Processing ───
  {
    filename: 'rename_chainid2.py',
    name: 'PDB Chain Reorder (Advanced)',
    description: 'Reorder PDB chains by geometric position (CCW angle sort with Z-layer detection), separating protein and DNA chains, then reassign sequential chain IDs (A-Z, a-z, 0-9). Enhanced version with auto-detection of planar vs. multi-layer structures.',
    category: 'PDB Processing',
    language: 'python',
    tags: ['pdb', 'chain', 'reorder', 'geometric'],
    params: JSON.stringify([
      { name: 'input', type: 'file', description: 'Input PDB file', required: true },
      { name: 'output', type: 'string', description: 'Output PDB file', required: true },
      { name: 'n_per_layer_protein', type: 'number', description: 'Protein chains per Z-layer', required: false, default: '0' },
      { name: 'n_per_layer_dna', type: 'number', description: 'DNA chains per Z-layer', required: false, default: '0' },
      { name: 'z_tol', type: 'number', description: 'Z tolerance for layer detection', required: false, default: '10' },
    ]),
    inputFiles: JSON.stringify([{ name: 'pdb_input', description: 'Input PDB file', required: true, format: 'pdb' }]),
    outputFiles: JSON.stringify([{ name: 'pdb_output', description: 'Reordered PDB file', format: 'pdb' }]),
  },
  {
    filename: 'rename_chainid.py',
    name: 'PDB Chain Reorder (Simple)',
    description: 'Earlier/simpler version of PDB chain reorder — reorders chains by Z-layer + CCW angle sort, separating protein and DNA chains. Requires manual specification of chains per layer.',
    category: 'PDB Processing',
    language: 'python',
    tags: ['pdb', 'chain', 'reorder'],
    params: JSON.stringify([
      { name: 'input', type: 'file', description: 'Input PDB file', required: true },
      { name: 'output', type: 'string', description: 'Output PDB file', required: true },
      { name: 'n_per_layer_protein', type: 'number', description: 'Protein chains per Z-layer', required: true },
      { name: 'n_per_layer_dna', type: 'number', description: 'DNA chains per Z-layer', required: true },
    ]),
    inputFiles: JSON.stringify([{ name: 'pdb_input', description: 'Input PDB file', required: true, format: 'pdb' }]),
    outputFiles: JSON.stringify([{ name: 'pdb_output', description: 'Reordered PDB file', format: 'pdb' }]),
  },
  {
    filename: 'segID.py',
    name: 'PDB Segment ID Remover',
    description: 'Removes the segment identifier (columns 73-76) from ATOM/HETATM records in PDB files. Useful for cleaning PDB files before further processing.',
    category: 'PDB Processing',
    language: 'python',
    tags: ['pdb', 'segment', 'clean'],
    params: '[]',
    inputFiles: JSON.stringify([{ name: 'pdb_input', description: 'Input PDB file', required: true, format: 'pdb' }]),
    outputFiles: JSON.stringify([{ name: 'pdb_output', description: 'Cleaned PDB file', format: 'pdb' }]),
  },

  // ─── Antibody Analysis ───
  {
    filename: 'find_cdr_of_fab.py',
    name: 'Fab CDR Finder',
    description: 'Identify Fab antibody CDR regions using ANARCI (IMGT numbering), map CDRs back to original sequence positions, produce colored/tagged FASTA and a Word document with CDR-highlighted sequences.',
    category: 'Antibody Analysis',
    language: 'python',
    tags: ['antibody', 'fab', 'cdr', 'anarci', 'imgt'],
    params: '[]',
    inputFiles: JSON.stringify([{ name: 'fasta_input', description: 'Input FASTA file with antibody sequences', required: true, format: 'fasta' }]),
    outputFiles: JSON.stringify([
      { name: 'colored_fasta', description: 'CDR-colored FASTA file', format: 'fasta' },
      { name: 'tagged_fasta', description: 'CDR-tagged FASTA file', format: 'fasta' },
      { name: 'colored_docx', description: 'CDR-highlighted Word document', format: 'docx' },
    ]),
  },
  {
    filename: 'ANARCI.py',
    name: 'ANARCI Installer',
    description: 'Downloads ANARCI source code from GitHub, extracts it, adds to sys.path, and tests the ANARCI antibody numbering tool. Setup/installer script for the ANARCI package.',
    category: 'Antibody Analysis',
    language: 'python',
    tags: ['anarci', 'antibody', 'installer', 'setup'],
    params: '[]',
    inputFiles: '[]',
    outputFiles: '[]',
  },

  // ─── Image Processing ───
  {
    filename: 'add_scalebar.py',
    name: 'TEM Scale Bar',
    description: 'Adds scale bars to TEM TIFF images based on magnification prefix in filenames. Matches magnification to pixel size configuration and draws labeled scale bars.',
    category: 'Image Processing',
    language: 'python',
    tags: ['tem', 'scalebar', 'microscopy', 'image'],
    params: JSON.stringify([
      { name: 'directory', type: 'string', description: 'Directory of TIFF files', required: true },
      { name: 'pixel', type: 'string', description: 'Pixel size config (e.g. "4.37,2.18,1.09")', required: false },
      { name: 'bar', type: 'string', description: 'Scale bar length in nm (e.g. "50,100,200")', required: false },
      { name: 'label', type: 'string', description: 'Scale bar labels (e.g. "50nm,100nm,200nm")', required: false },
    ]),
    inputFiles: JSON.stringify([{ name: 'tiff_dir', description: 'Directory with TIFF files', required: true, format: 'tiff' }]),
    outputFiles: JSON.stringify([{ name: 'jpg_output', description: 'Scale-barred JPG images', format: 'jpg' }]),
  },
  {
    filename: 'ppt_to_images.py',
    name: 'PPT to Images Converter',
    description: 'Professional PPT-to-images converter with color fidelity — converts PPTX to PDF (LibreOffice) then to PNG/JPG with color management, quality verification, and optional post-processing.',
    category: 'Image Processing',
    language: 'python',
    tags: ['pptx', 'image', 'conversion', 'pdf', 'png'],
    params: JSON.stringify([
      { name: 'pptx', type: 'file', description: 'Input PPTX file', required: true },
      { name: 'output', type: 'string', description: 'Output directory', required: false },
      { name: 'dpi', type: 'number', description: 'Output DPI', required: false, default: '300' },
      { name: 'format', type: 'string', description: 'Output format (png/jpg)', required: false, default: 'png' },
    ]),
    inputFiles: JSON.stringify([{ name: 'pptx_input', description: 'Input PPTX file', required: true, format: 'pptx' }]),
    outputFiles: JSON.stringify([{ name: 'image_output', description: 'Converted images', format: 'png' }]),
  },

  // ─── Visualization ───
  {
    filename: 'epitope_visualizer.py',
    name: 'Epitope Visualizer (PNG+PPTX)',
    description: 'Generates antigen-antibody interaction sequence visualization (E-plot format) — reads FASTA + interaction matrix Excel, creates PNG (matplotlib) and PPTX with square markers for epitope residues. Supports multi-structure with vertical stacking.',
    category: 'Visualization',
    language: 'python',
    tags: ['epitope', 'visualization', 'e-plot', 'pptx', 'png'],
    params: JSON.stringify([
      { name: 'seq', type: 'file', description: 'Input FASTA file', required: true },
      { name: 'matrix', type: 'file', description: 'Interaction matrix Excel file', required: true },
      { name: 'output', type: 'string', description: 'Output prefix', required: false },
      { name: 'labels', type: 'string', description: 'Chain labels', required: false },
      { name: 'colors', type: 'string', description: 'Colors for each structure', required: false },
    ]),
    inputFiles: JSON.stringify([
      { name: 'fasta', description: 'FASTA sequence file', required: true, format: 'fasta' },
      { name: 'matrix', description: 'Interaction matrix Excel', required: true, format: 'xlsx' },
    ]),
    outputFiles: JSON.stringify([
      { name: 'png_output', description: 'E-plot PNG image', format: 'png' },
      { name: 'pptx_output', description: 'E-plot PPTX file', format: 'pptx' },
    ]),
  },
  {
    filename: 'epitope_visualizer_pptx.py',
    name: 'Epitope Visualizer (PPTX variant)',
    description: 'Near-identical variant of Epitope Visualizer with slightly different box sizes for PPTX output. Generates E-plot epitope visualization in PPTX and PNG formats from FASTA + interaction matrix Excel.',
    category: 'Visualization',
    language: 'python',
    tags: ['epitope', 'visualization', 'e-plot', 'pptx'],
    params: JSON.stringify([
      { name: 'seq', type: 'file', description: 'Input FASTA file', required: true },
      { name: 'matrix', type: 'file', description: 'Interaction matrix Excel file', required: true },
      { name: 'output', type: 'string', description: 'Output prefix', required: false },
    ]),
    inputFiles: JSON.stringify([
      { name: 'fasta', description: 'FASTA sequence file', required: true, format: 'fasta' },
      { name: 'matrix', description: 'Interaction matrix Excel', required: true, format: 'xlsx' },
    ]),
    outputFiles: JSON.stringify([
      { name: 'png_output', description: 'E-plot PNG image', format: 'png' },
      { name: 'pptx_output', description: 'E-plot PPTX file', format: 'pptx' },
    ]),
  },

  // ─── Analysis ───
  {
    filename: 'interaction_to_excel.py',
    name: 'Interaction Matrix to Excel',
    description: 'Creates a styled interaction matrix Excel from contact and H-bond data. Generates a professionally formatted Excel file with color fills and borders showing protein-protein interaction pairs.',
    category: 'Analysis',
    language: 'python',
    tags: ['interaction', 'excel', 'matrix', 'h-bond'],
    params: '[]',
    inputFiles: '[]',
    outputFiles: JSON.stringify([{ name: 'excel_output', description: 'Styled interaction matrix Excel', format: 'xlsx' }]),
  },

  // ─── Cryo-EM ───
  {
    filename: '按日期拆分star.py',
    name: 'Split STAR by Date',
    description: 'Splits a RELION .star file by date — extracts dates from micrograph filenames and creates separate .star files for each date. Useful for organizing cryo-EM data by collection date.',
    category: 'Cryo-EM',
    language: 'python',
    tags: ['cryo-em', 'relion', 'star', 'split'],
    params: '[]',
    inputFiles: JSON.stringify([{ name: 'star_input', description: 'Input RELION .star file', required: true, format: 'star' }]),
    outputFiles: JSON.stringify([{ name: 'star_output', description: 'Split .star files by date', format: 'star' }]),
  },

  // ─── ChimeraX Scripts ───
  {
    filename: 'interaction_matrix.py',
    name: 'Interaction Matrix (ChimeraX)',
    description: 'ChimeraX script to analyze protein-protein interactions (contacts, H-bonds, salt bridges) between specified chains and export an interaction matrix to Excel.',
    category: 'ChimeraX',
    language: 'chimerax',
    tags: ['chimerax', 'interaction', 'matrix', 'h-bond', 'salt-bridge'],
    params: '[]',
    inputFiles: '[]',
    outputFiles: JSON.stringify([{ name: 'excel_output', description: 'Interaction matrix Excel file', format: 'xlsx' }]),
  },
  {
    filename: 'auto_color_locres.py',
    name: 'Auto Color by Local Resolution',
    description: 'ChimeraX script to auto-detect EM map and local-resolution map from loaded volumes, set display level, color EM map by local resolution, and configure color key.',
    category: 'ChimeraX',
    language: 'chimerax',
    tags: ['chimerax', 'locres', 'color', 'em-map'],
    params: '[]',
    inputFiles: '[]',
    outputFiles: '[]',
  },
  {
    filename: 'pi.py',
    name: 'π-π Stacking Analysis',
    description: 'ChimeraX script for π-π stacking interaction analysis — finds aromatic residues (PHE, TYR, TRP, HIS), computes ring centroids/normals, identifies π-π interactions by distance and angle, visualizes with distance lines, highlights residues, and saves results to text file.',
    category: 'ChimeraX',
    language: 'chimerax',
    tags: ['chimerax', 'pi-stacking', 'aromatic', 'interaction'],
    params: '[]',
    inputFiles: '[]',
    outputFiles: JSON.stringify([
      { name: 'results_txt', description: 'π-π interaction results text file', format: 'txt' },
    ]),
  },
  {
    filename: 'highlight_cdr_auto.py',
    name: 'Auto CDR Highlighting',
    description: 'ChimeraX script to auto-detect heavy/light chains, read CDR ranges from a JSON file (cdr_ranges.json), color CDR1/2/3 (red/orange/yellow), and show cartoon representation.',
    category: 'ChimeraX',
    language: 'chimerax',
    tags: ['chimerax', 'cdr', 'antibody', 'highlight'],
    params: '[]',
    inputFiles: JSON.stringify([{ name: 'cdr_json', description: 'CDR ranges JSON file (cdr_ranges.json)', required: true, format: 'json' }]),
    outputFiles: '[]',
  },
  {
    filename: 'locres_query.py',
    name: 'Local Resolution Query',
    description: 'ChimeraX script to sample local resolution values at selected atom positions from a locres volume map, and compute mean/std statistics per model and overall.',
    category: 'ChimeraX',
    language: 'chimerax',
    tags: ['chimerax', 'locres', 'query', 'statistics'],
    params: '[]',
    inputFiles: '[]',
    outputFiles: '[]',
  },
  {
    filename: 'rmsd_chimera.py',
    name: 'Multi-Chain RMSD Heatmap (ChimeraX)',
    description: 'ChimeraX script for multi-chain RMSD calculation — aligns structures, auto-matches chains by lowest RMSD, computes per-residue and per-chain RMSD, colors target by RMSD (blue→white→red), and generates log files.',
    category: 'ChimeraX',
    language: 'chimerax',
    tags: ['chimerax', 'rmsd', 'heatmap', 'alignment'],
    params: '[]',
    inputFiles: '[]',
    outputFiles: JSON.stringify([{ name: 'rmsd_log', description: 'RMSD log file', format: 'txt' }]),
  },
  {
    filename: 'interface_visualizer.py',
    name: 'Interface Visualizer (ChimeraX)',
    description: 'ChimeraX script to scan a folder for XML interaction files (hydrogen bonds, salt bridges, interface residues), parse them, visualize in ChimeraX with chain-based coloring, draw H-bond/salt-bridge dashed lines, and show extended secondary structure around interface residues.',
    category: 'ChimeraX',
    language: 'chimerax',
    tags: ['chimerax', 'interface', 'visualization', 'h-bond'],
    params: '[]',
    inputFiles: JSON.stringify([{ name: 'xml_dir', description: 'Directory with XML interaction files', required: true, format: 'xml' }]),
    outputFiles: '[]',
  },
  {
    filename: 'interaction_to_xlxs_chimeraX.py',
    name: 'Interaction Matrix Excel v9 (ChimeraX)',
    description: 'Enhanced ChimeraX script for interaction matrix analysis — analyzes contacts/H-bonds/salt bridges between chain pairs, builds an interaction matrix, exports to styled Excel with color fills and borders.',
    category: 'ChimeraX',
    language: 'chimerax',
    tags: ['chimerax', 'interaction', 'excel', 'matrix'],
    params: '[]',
    inputFiles: '[]',
    outputFiles: JSON.stringify([{ name: 'excel_output', description: 'Styled interaction matrix Excel', format: 'xlsx' }]),
  },
  {
    filename: 'lignad_interaction.py',
    name: 'Ligand Interaction Analysis',
    description: 'ChimeraX script to analyze and print interaction residues (contacts, H-bonds, salt bridges) between a selected chain and protein chains. Outputs formatted summary to console.',
    category: 'ChimeraX',
    language: 'chimerax',
    tags: ['chimerax', 'ligand', 'interaction', 'h-bond'],
    params: '[]',
    inputFiles: '[]',
    outputFiles: '[]',
  },
  {
    filename: 'nb.py',
    name: 'Nanobody CDR Visualization',
    description: 'ChimeraX script for nanobody (single-chain Fab) CDR visualization — reads CDR ranges from JSON, auto-maps chains by length, creates separate models for antigen and each CDR, colors CDRs, and performs contact/H-bond analysis.',
    category: 'ChimeraX',
    language: 'chimerax',
    tags: ['chimerax', 'nanobody', 'cdr', 'visualization'],
    params: '[]',
    inputFiles: JSON.stringify([{ name: 'cdr_json', description: 'CDR data JSON file', required: true, format: 'json' }]),
    outputFiles: '[]',
  },
  {
    filename: 'interface_residue_ppt.py',
    name: 'Interface Residue PPT (ChimeraX)',
    description: 'ChimeraX script to save a PNG snapshot, select interface residues between chains, build chain color maps, and export SVG or PPTX with labeled residues overlaid on the PNG background.',
    category: 'ChimeraX',
    language: 'chimerax',
    tags: ['chimerax', 'interface', 'pptx', 'svg'],
    params: '[]',
    inputFiles: '[]',
    outputFiles: JSON.stringify([
      { name: 'png_output', description: 'ChimeraX snapshot PNG', format: 'png' },
      { name: 'svg_output', description: 'SVG with labeled residues', format: 'svg' },
      { name: 'pptx_output', description: 'PPTX with residue overlay', format: 'pptx' },
    ]),
  },
  {
    filename: 'flip_all_mrc.py',
    name: 'Batch Flip MRC Files',
    description: 'ChimeraX script to batch-flip all .mrc files in a directory — opens each, flips along Z axis, saves as _flip.mrc.',
    category: 'ChimeraX',
    language: 'chimerax',
    tags: ['chimerax', 'mrc', 'flip', 'batch'],
    params: '[]',
    inputFiles: JSON.stringify([{ name: 'mrc_dir', description: 'Directory with .mrc files', required: true, format: 'mrc' }]),
    outputFiles: JSON.stringify([{ name: 'mrc_flip', description: 'Flipped .mrc files', format: 'mrc' }]),
  },
  {
    filename: 'tile.py',
    name: 'Volume Tiling (ChimeraX)',
    description: 'ChimeraX script to auto-set volume display levels, align maps, rotate, and tile them in a grid layout for side-by-side comparison of EM maps.',
    category: 'ChimeraX',
    language: 'chimerax',
    tags: ['chimerax', 'tile', 'volume', 'comparison'],
    params: '[]',
    inputFiles: '[]',
    outputFiles: '[]',
  },
  {
    filename: 'em_map_handness.py',
    name: 'EM Map Handness Determination',
    description: 'ChimeraX script to determine EM map handness (chirality) — creates a flipped version, compares correlation coefficients with a reference map, and keeps the correct-handed version.',
    category: 'ChimeraX',
    language: 'chimerax',
    tags: ['chimerax', 'em-map', 'handness', 'chirality'],
    params: '[]',
    inputFiles: '[]',
    outputFiles: '[]',
  },
  {
    filename: 'protein_interface_analysis.py',
    name: 'Protein Interface Analysis (ChimeraX)',
    description: 'ChimeraX script for protein-protein interface analysis — colors chains, shows surface with transparency, selects interface residues, finds H-bonds and contacts, saves images from multiple angles, saves session.',
    category: 'ChimeraX',
    language: 'chimerax',
    tags: ['chimerax', 'interface', 'analysis', 'visualization'],
    params: '[]',
    inputFiles: '[]',
    outputFiles: JSON.stringify([
      { name: 'png_images', description: 'Multi-angle PNG images', format: 'png' },
      { name: 'interaction_txt', description: 'Interaction text file', format: 'txt' },
      { name: 'session', description: 'ChimeraX session file', format: 'cxs' },
    ]),
  },
  {
    filename: 'H_bond_interface_plan.py',
    name: 'H-Bond Interface Analysis & PPTX',
    description: 'ChimeraX mega-script for comprehensive H-bond/salt-bridge/interface analysis — parses H-bond logs, builds interaction tables and SVGs, creates PPTX with H-bond tables, salt bridge tables, interface residue pages, and interface sequence SVGs with FASTA alignment.',
    category: 'ChimeraX',
    language: 'chimerax',
    tags: ['chimerax', 'h-bond', 'salt-bridge', 'interface', 'pptx', 'svg'],
    params: '[]',
    inputFiles: '[]',
    outputFiles: JSON.stringify([
      { name: 'pptx_output', description: 'Comprehensive analysis PPTX', format: 'pptx' },
      { name: 'svg_files', description: 'Interface sequence SVGs', format: 'svg' },
    ]),
  },
  {
    filename: 'fab_cdr_to_chimerax_api.py',
    name: 'Fab CDR ChimeraX API',
    description: 'Enhanced ChimeraX Fab CDR visualization — reads CDR data from JSON, auto-maps chains by length, supports arbitrary number of CDRs, creates separate models for antigen and each CDR, colors them, and performs contact/H-bond analysis.',
    category: 'ChimeraX',
    language: 'chimerax',
    tags: ['chimerax', 'fab', 'cdr', 'api', 'visualization'],
    params: '[]',
    inputFiles: JSON.stringify([{ name: 'cdr_json', description: 'CDR data JSON file', required: true, format: 'json' }]),
    outputFiles: '[]',
  },

  // ─── PyMOL Scripts ───
  {
    filename: 'segment_and_isomesh_auto.py',
    name: 'Segment & Isomesh (PyMOL)',
    description: 'PyMOL script to segment a protein by secondary structure, display each segment as sticks with isomesh from a density map, and create separate scenes for each segment.',
    category: 'PyMOL',
    language: 'pymol',
    tags: ['pymol', 'segment', 'isomesh', 'density'],
    params: '[]',
    inputFiles: '[]',
    outputFiles: '[]',
  },
  {
    filename: 'rmsd.py',
    name: 'Multi-Chain RMSD Heatmap (PyMOL)',
    description: 'PyMOL script for multi-chain RMSD heatmap analysis — aligns structures with CEalign, auto-matches chains, computes per-residue RMSD, colors by RMSD (blue→white→red gradient), generates log file and color legend.',
    category: 'PyMOL',
    language: 'pymol',
    tags: ['pymol', 'rmsd', 'heatmap', 'alignment'],
    params: '[]',
    inputFiles: '[]',
    outputFiles: JSON.stringify([{ name: 'rmsd_log', description: 'RMSD log file', format: 'txt' }]),
  },
];

// GET /api/seed-local - Import local scripts into the database
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clearExisting = searchParams.get('clear') === 'true';

  try {
    // Optionally clear existing demo scripts
    if (clearExisting) {
      await db.executionLog.deleteMany({});
      await db.scriptExternalApp.deleteMany({});
      await db.script.deleteMany({});
    }

    if (!existsSync(LOCAL_SCRIPTS_DIR)) {
      return NextResponse.json(
        { error: `Local scripts directory not found: ${LOCAL_SCRIPTS_DIR}` },
        { status: 500 }
      );
    }

    let imported = 0;
    let skipped = 0;
    let errors: string[] = [];

    for (const meta of SCRIPT_REGISTRY) {
      try {
        const filePath = join(LOCAL_SCRIPTS_DIR, meta.filename);
        if (!existsSync(filePath)) {
          errors.push(`File not found: ${meta.filename}`);
          skipped++;
          continue;
        }

        const content = readFileSync(filePath, 'utf-8');

        await db.script.upsert({
          where: { filename: meta.filename },
          update: {
            name: meta.name,
            description: meta.description,
            content,
            category: meta.category,
            language: meta.language,
            source: 'local',
            sourceUrl: `https://github.com/Jing0715-fer/my-py-scripts/blob/main/${meta.filename}`,
            params: meta.params,
            inputFiles: meta.inputFiles,
            outputFiles: meta.outputFiles,
            tags: JSON.stringify(meta.tags),
          },
          create: {
            name: meta.name,
            description: meta.description,
            filename: meta.filename,
            content,
            category: meta.category,
            language: meta.language,
            source: 'local',
            sourceUrl: `https://github.com/Jing0715-fer/my-py-scripts/blob/main/${meta.filename}`,
            params: meta.params,
            inputFiles: meta.inputFiles,
            outputFiles: meta.outputFiles,
            tags: JSON.stringify(meta.tags),
          },
        });
        imported++;
      } catch (err: any) {
        errors.push(`${meta.filename}: ${err.message}`);
        skipped++;
      }
    }

    return NextResponse.json({
      imported,
      skipped,
      total: SCRIPT_REGISTRY.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully imported ${imported} of ${SCRIPT_REGISTRY.length} local scripts${skipped > 0 ? ` (${skipped} skipped)` : ''}`,
    });
  } catch (error: any) {
    console.error('Error importing local scripts:', error);
    return NextResponse.json(
      { error: 'Failed to import local scripts', details: error.message },
      { status: 500 }
    );
  }
}
