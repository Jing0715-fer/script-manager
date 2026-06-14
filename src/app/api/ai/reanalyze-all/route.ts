// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hermesChatCompletion } from '@/lib/hermes';

// POST /api/ai/reanalyze-all — Re-analyze all scripts with Hermes LLM
// This is a one-time migration endpoint. Call with POST to start.
export async function POST(request: NextRequest) {
  try {
    // Optional: pass ?limit=N or ?offset=N for batching
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '0') || 0;
    const offset = parseInt(searchParams.get('offset') || '0') || 0;

    const scripts = await db.script.findMany({
      orderBy: { id: 'asc' },
      ...(limit > 0 ? { take: limit } : {}),
      ...(offset > 0 ? { skip: offset } : {}),
    });

    const results = [];
    let success = 0;
    let failed = 0;
    let skipped = 0;

    for (const script of scripts) {
      try {
        // Skip if already has a meaningful description and params
        const str = (v: unknown) => (typeof v === 'string' ? v : '');
        const hasDescription = script.description && script.description.length > 20;
        const hasParams = str(script.params) !== '' && str(script.params) !== '[]';
        const hasInputFiles = str(script.inputFiles) !== '' && str(script.inputFiles) !== '[]';
        const hasOutputFiles = str(script.outputFiles) !== '' && str(script.outputFiles) !== '[]';
        if (hasDescription && hasParams && hasInputFiles && hasOutputFiles) {
          skipped++;
          results.push({ id: script.id, name: script.name, status: 'skipped' });
          continue;
        }

        const prompt = `Analyze the following script file named "${script.filename || script.name}" and extract structured information.

Script content:
\`\`\`
${script.content}
\`\`\`

Please provide a JSON analysis with the following structure (respond with ONLY valid JSON, no markdown):
{
  "description": "A clear 1-2 sentence description of what this script does",
  "parameters": [
    {
      "name": "parameter_name",
      "type": "string|number|boolean|file|path",
      "description": "What this parameter does",
      "required": true,
      "default": "default value if any (omit if no default)"
    }
  ],
  "inputFiles": [
    {
      "name": "input_file_name",
      "description": "What this input file is used for",
      "required": true,
      "format": "pdb|csv|json|txt|fasta|star|mtz|map|cif|py|sh|etc"
    }
  ],
  "outputFiles": [
    {
      "name": "output_file_name",
      "description": "What this output file contains",
      "format": "pdb|csv|json|txt|svg|png|pptx|pdf|log|etc"
    }
  ],
  "dependencies": ["list", "of", "external", "dependencies"],
  "usage": "How to use this script from the command line",
  "summary": "A one-line summary of the script's purpose"
}

Rules:
- Extract command-line arguments and parameters the script accepts
- Mark required parameters with "required": true (no default value)
- For optional parameters with defaults, set "required": false and include the "default" field
- Identify ALL input files the script reads or requires
- For each input file, specify its file type/format
- Identify ALL output files the script generates
- Identify all external dependencies and imports beyond standard library
- If no parameters/files/dependencies found, return empty arrays`;

        const result = await hermesChatCompletion({
          messages: [
            {
              role: 'system',
              content: 'You are a code analysis expert. Analyze scripts and extract structured information. Always respond with valid JSON only, no markdown formatting.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 2048,
          thinking: { type: 'disabled' },
        });

        if (result?.choices?.[0]?.message?.content) {
          let contentStr = result.choices[0].message.content;
          contentStr = contentStr
            .replace(/^```(?:json)?\s*\n?/m, '')
            .replace(/\n?```\s*$/m, '')
            .trim();

          try {
            const analysis = JSON.parse(contentStr);
            const updateData: Record<string, string> = {};

            if (analysis.description && !hasDescription) {
              updateData.description = analysis.description;
            }
            if (analysis.parameters && analysis.parameters.length > 0) {
              updateData.params = JSON.stringify(analysis.parameters);
            }
            if (analysis.inputFiles && analysis.inputFiles.length > 0) {
              updateData.inputFiles = JSON.stringify(analysis.inputFiles);
            }
            if (analysis.outputFiles && analysis.outputFiles.length > 0) {
              updateData.outputFiles = JSON.stringify(analysis.outputFiles);
            }

            if (Object.keys(updateData).length > 0) {
              await db.script.update({
                where: { id: script.id },
                data: updateData,
              });
              success++;
              results.push({ id: script.id, name: script.name, status: 'updated', fields: Object.keys(updateData) });
            } else {
              skipped++;
              results.push({ id: script.id, name: script.name, status: 'skipped' });
            }
          } catch (e) {
            failed++;
            results.push({ id: script.id, name: script.name, status: 'failed', error: 'JSON parse error' });
          }
        } else {
          failed++;
          results.push({ id: script.id, name: script.name, status: 'failed', error: 'No LLM response' });
        }
      } catch (e) {
        failed++;
        results.push({ id: script.id, name: script.name, status: 'failed', error: (e as Error).message });
      }
    }

    return NextResponse.json({
      total: scripts.length,
      success,
      failed,
      skipped,
      results,
    });
  } catch (error) {
    console.error('Error in reanalyze-all:', error);
    return NextResponse.json(
      { error: 'Failed to re-analyze scripts' },
      { status: 500 }
    );
  }
}
