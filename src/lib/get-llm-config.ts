// @ts-nocheck
import { db } from '@/lib/db';

export interface LlmConfigData {
  id: string;
  name: string;
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  isDefault: boolean;
}

/**
 * Fetches the active LLM config from the database.
 * Returns the default config if one exists, otherwise the first available config.
 * Returns null if no configs exist.
 */
export async function getActiveLlmConfig(): Promise<LlmConfigData | null> {
  try {
    // First try to get the default config
    let config = await db.llmConfig.findFirst({
      where: { isDefault: true },
      orderBy: { updatedAt: 'desc' },
    });

    // If no default, get the most recently updated config
    if (!config) {
      config = await db.llmConfig.findFirst({
        orderBy: { updatedAt: 'desc' },
      });
    }

    return config;
  } catch (error) {
    console.error('Error fetching LLM config:', error);
    return null;
  }
}
