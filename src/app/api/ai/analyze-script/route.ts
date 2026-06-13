// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { hermesChatCompletion, getHermesDefaultModel } from '@/lib/hermes';

interface AnalysisResult {
  description: string;
  parameters: Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
    default?: string;
  }>;
  inputFiles: Array<{
    name: string;
    description: string;
    required: boolean;
    format: string;
  }>;
  outputFiles: Array<{
    name: string;
    description: string;
    format: string;
  }>;
  dependencies: string[];
  usage: string;
  summary: string;
}

// POST /api/ai/analyze-script - Analyze a script using Hermes LLM
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, filename } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Script content is required' },
        { status: 400 }
      );
    }

    const model = await getHermesDefaultModel();
    console.log(`[analyze-script] Using Hermes model: "${model}"`);

    const prompt = `Analyze the following script file named "${filename || 'unknown'}" and extract structured information.

Script content:
\`\`\`
${content}
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
- Identify ALL input files the script reads or requires (PDB, CSV, config, FASTA, etc.)
- For each input file, specify its file type/format (e.g., pdb, csv, fasta, star, mtz, map, cif, txt, py, sh)
- Identify ALL output files the script generates (tables, images, PPT, SVG, PNG, etc.)
- Identify all external dependencies and imports beyond standard library
- Provide accurate usage instructions
- If no parameters are found, return an empty array
- If no input/output files are found, return empty arrays
- If no dependencies beyond standard library, return an empty array
- Pay special attention to file paths, open() calls, and argparse arguments that represent files`;

    const result = await hermesChatCompletion({
      messages: [
        {
          role: 'system',
          content:
            'You are a code analysis expert. Analyze scripts and extract structured information about their inputs, outputs, parameters, and dependencies. Always respond with valid JSON only, no markdown formatting.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 2048,
      thinking: { type: 'disabled' },
    });

    let analysis: AnalysisResult;

    if (result?.choices?.[0]?.message?.content) {
      let contentStr = result.choices[0].message.content;

      // Remove markdown code blocks if present
      contentStr = contentStr
        .replace(/^```(?:json)?\s*\n?/m, '')
        .replace(/\n?```\s*$/m, '')
        .trim();

      try {
        analysis = JSON.parse(contentStr);
        // Ensure arrays exist
        analysis.parameters = analysis.parameters || [];
        analysis.inputFiles = analysis.inputFiles || [];
        analysis.outputFiles = analysis.outputFiles || [];
        analysis.dependencies = analysis.dependencies || [];
      } catch {
        analysis = {
          description: contentStr,
          parameters: [],
          inputFiles: [],
          outputFiles: [],
          dependencies: [],
          usage: '',
          summary: contentStr.substring(0, 200),
        };
      }
    } else {
      return NextResponse.json(
        { error: 'No response from AI service' },
        { status: 502 }
      );
    }

    return NextResponse.json({ analysis, model });
  } catch (error) {
    console.error('Error analyzing script:', error);
    return NextResponse.json(
      { error: 'Failed to analyze script with AI' },
      { status: 500 }
    );
  }
}
