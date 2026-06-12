import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { getActiveLlmConfig } from '@/lib/get-llm-config';

// POST /api/generate-script - Generate a script that modifies config and can be used with external apps
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scriptId, appId, params, inputFiles } = body;

    if (!scriptId) {
      return NextResponse.json(
        { error: 'scriptId is required' },
        { status: 400 }
      );
    }

    // Find the script
    const script = await db.script.findUnique({
      where: { id: scriptId },
      include: {
        externalApps: {
          include: { app: true },
        },
      },
    });

    if (!script) {
      return NextResponse.json(
        { error: 'Script not found' },
        { status: 404 }
      );
    }

    // Find the external app if specified
    let app = null;
    if (appId) {
      app = await db.externalApp.findUnique({ where: { id: appId } });
    } else if (script.externalApps.length > 0) {
      app = script.externalApps[0].app;
    }

    // Load stored LLM config from database
    const llmConfig = await getActiveLlmConfig();
    if (!llmConfig) {
      return NextResponse.json(
        { error: 'No LLM configuration found. Please configure an LLM in Settings first.' },
        { status: 400 }
      );
    }

    console.log(`[generate-script] Using LLM config: "${llmConfig.name}" (provider=${llmConfig.provider}, model=${llmConfig.model || 'default'})`);

    const zai = await ZAI.create();

    const appInfo = app
      ? `External application: ${app.name} (type: ${app.appType}, path: ${app.appPath}, script extension: ${app.scriptExt}, run command: ${app.runCommand})`
      : 'No specific external application specified';

    const prompt = `Generate a wrapper/launcher script based on the following information:

Original Script: "${script.name}" (${script.filename})
Description: ${script.description}
Language: ${script.language}
${appInfo}

Original script content:
\`\`\`
${script.content}
\`\`\`

User-provided parameters:
${params ? JSON.stringify(params, null, 2) : 'None'}

User-provided input files:
${inputFiles ? JSON.stringify(inputFiles, null, 2) : 'None'}

Requirements:
1. Generate a complete, runnable script that wraps the original script
2. The generated script should accept the provided parameters and input files
3. If an external application is specified, generate the script in the format that application expects
4. The script should handle file paths correctly and produce output files
5. Include proper error handling and logging
6. Add clear comments explaining what the script does
7. If modifying configuration files, include backup of original config
8. Make the script self-contained so it can run independently

Respond with ONLY the script content, no markdown formatting or explanation.`;

    // Build the request with model from config if specified
    const createParams: Record<string, unknown> = {
      messages: [
        {
          role: 'system',
          content:
            'You are an expert script generator. Generate complete, production-ready wrapper scripts that can be run independently or with specified external applications. Output only the script code, no markdown or explanations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      thinking: { type: 'disabled' },
    };

    if (llmConfig.model) {
      createParams.model = llmConfig.model;
    }

    const result = await zai.chat.completions.create(createParams as any);

    let generatedScript = '';
    if (result?.choices?.[0]?.message?.content) {
      generatedScript = result.choices[0].message.content;
      // Remove markdown code blocks if present
      generatedScript = generatedScript
        .replace(/^```(?:\w+)?\s*\n?/m, '')
        .replace(/\n?```\s*$/m, '')
        .trim();
    }

    // If an external app association exists, update the auto script
    if (app) {
      const existingLink = script.externalApps.find((ea: { appId: string }) => ea.appId === app!.id);
      if (existingLink) {
        await db.scriptExternalApp.update({
          where: { id: existingLink.id },
          data: { autoScript: generatedScript },
        });
      } else {
        await db.scriptExternalApp.create({
          data: {
            scriptId: script.id,
            appId: app.id,
            autoScript: generatedScript,
          },
        });
      }
    }

    // Determine the extension
    let ext = script.language === 'python' ? '.py' : script.language === 'bash' || script.language === 'shell' ? '.sh' : app?.scriptExt || '.py';

    return NextResponse.json({
      generatedScript,
      filename: `${script.name.replace(/\s+/g, '_')}_auto_run${ext}`,
      appName: app?.name || null,
      appType: app?.appType || null,
      configName: llmConfig.name,
    });
  } catch (error) {
    console.error('Error generating script:', error);
    return NextResponse.json(
      { error: 'Failed to generate script' },
      { status: 500 }
    );
  }
}
