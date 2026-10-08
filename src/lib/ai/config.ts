// src/lib/ai/config.ts
// SERVER-ONLY: reads the AI_PROVIDER / AI_API_KEY / AI_MODEL env vars documented in
// .env.example and returns a ready-to-use provider + config, or throws a clear,
// honest "not configured" error. Every AI call site should go through this instead
// of reading process.env directly, so there is exactly one place that decides
// which provider is active and what "not configured" means.
import { getAIProvider, type AIProvider, type AIProviderConfig } from './provider';

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-sonnet-5',
  openai: 'gpt-4o-mini',
};

export class AINotConfiguredError extends Error {
  readonly status = 503;
}

/**
 * Resolves the configured AI provider and its call config.
 * Throws AINotConfiguredError if AI_API_KEY is missing, or if AI_PROVIDER names
 * a provider with no implementation.
 */
export function getConfiguredAI(maxTokens: number): { provider: AIProvider; config: AIProviderConfig } {
  const providerName = (process.env.AI_PROVIDER || 'anthropic').toLowerCase();
  const apiKey = process.env.AI_API_KEY || '';
  if (!apiKey) {
    throw new AINotConfiguredError('AI features are not configured (AI_API_KEY is missing).');
  }

  let provider: AIProvider;
  try {
    provider = getAIProvider(providerName);
  } catch (err) {
    throw new AINotConfiguredError(err instanceof Error ? err.message : 'AI provider is not configured.');
  }

  const model = process.env.AI_MODEL || DEFAULT_MODELS[providerName] || DEFAULT_MODELS.anthropic;
  return { provider, config: { apiKey, model, maxTokens } };
}
