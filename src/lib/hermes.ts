/**
 * Hermes API client — OpenAI-compatible chat completions endpoint.
 * Uses Hermes default model from ~/.hermes/config.yaml.
 *
 * API server: http://localhost:8642
 */

const HERMES_BASE_URL = process.env.HERMES_BASE_URL || 'http://localhost:8642'
const HERMES_API_KEY = process.env.HERMES_API_KEY || 'hermes123'

/**
 * Read current model from Hermes config.yaml.
 * Falls back to 'hermes-agent' if config not found.
 */
async function getHermesModel(): Promise<string> {
  try {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const configPath = join(
      process.env.HOME || '/Users/lijing',
      '.hermes',
      'config.yaml',
    )
    const content = readFileSync(configPath, 'utf-8')
    const lines = content.split('\n')
    let inModel = false
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('model:')) {
        inModel = true
        continue
      }
      if (inModel) {
        if (trimmed.startsWith('default:')) {
          return trimmed.replace('default:', '').trim().replace(/['"]/g, '')
        }
        if (trimmed && !trimmed.startsWith(' ') && !trimmed.startsWith('-')) {
          inModel = false
        }
      }
    }
  } catch {
    // Config not found, use fallback
  }
  return process.env.HERMES_MODEL || 'hermes-agent'
}

let _cachedModel: string | undefined = undefined

export async function getHermesDefaultModel(): Promise<string> {
  if (_cachedModel === undefined) {
    _cachedModel = await getHermesModel()
  }
  return _cachedModel
}

export interface HermesMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface HermesCompletionRequest {
  messages: HermesMessage[]
  model?: string
  temperature?: number
  max_tokens?: number
  thinking?: { type: 'disabled' | 'enabled' }
}

export interface HermesCompletionResponse {
  choices: Array<{
    message: {
      content: string
      role: string
    }
    finish_reason: string
  }>
  model: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Call Hermes chat completions API.
 * Model is read from Hermes config.yaml.
 */
export async function hermesChatCompletion(
  req: HermesCompletionRequest,
): Promise<HermesCompletionResponse> {
  const url = `${HERMES_BASE_URL}/v1/chat/completions`

  const body = {
    messages: req.messages,
    model: req.model || (await getHermesDefaultModel()),
    temperature: req.temperature ?? 0.7,
    max_tokens: req.max_tokens ?? 1024,
    ...(req.thinking ? { thinking: req.thinking } : {}),
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${HERMES_API_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Hermes API error ${res.status}: ${text}`)
  }

  return res.json() as Promise<HermesCompletionResponse>
}

/**
 * Convenience: single-prompt completion (system + user).
 */
export async function hermesPrompt(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; max_tokens?: number; model?: string },
): Promise<string> {
  const resp = await hermesChatCompletion({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.max_tokens ?? 1024,
    model: options?.model,
  })
  return resp.choices[0]?.message?.content || ''
}
