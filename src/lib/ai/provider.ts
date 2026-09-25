// src/lib/ai/provider.ts
export interface CoachingEvidence {
  sessionType: string;
  sessionDate: string;
  duration: number;
  intensity: number;
  perceivedQuality?: number;
  shootingPercentage?: number;
  totalMakes?: number;
  totalAttempts?: number;
  zoneBreakdown?: Array<{ zone: string; makes: number; attempts: number }>;
  drillsCompleted?: string[];
  playerNotes?: string;
  previousFeedbackSummary?: string;
}

export interface CoachingOutput {
  summary: string;
  keyInsights: string[];
  recommendations: string[];
  comparisonToPrevious?: string;
}

export interface AIProviderConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
}

export abstract class AIProvider {
  abstract readonly name: string;

  abstract generateCoachingSummary(
    evidence: CoachingEvidence,
    config: AIProviderConfig
  ): Promise<CoachingOutput>;
}

const SYSTEM_PROMPT = `You are an expert basketball coach giving a player specific, actionable feedback on one training session.
Only use the numbers provided; never invent stats. Speak directly to the player.
Respond with a JSON object with these keys:
- "summary": 2-3 sentences on session quality and the key takeaway
- "keyInsights": array of 2-3 specific observations from the data
- "recommendations": array of 2-3 concrete things to do next session
- "comparisonToPrevious": one sentence comparing to the previous feedback if it is provided, otherwise omit`;

function buildPrompt(evidence: CoachingEvidence): string {
  const lines = [
    `Session date: ${evidence.sessionDate}`,
    `Session type: ${evidence.sessionType}`,
    `Duration: ${evidence.duration} minutes`,
    `Intensity (RPE): ${evidence.intensity}/10`,
  ];
  if (evidence.perceivedQuality) lines.push(`Player-rated quality: ${evidence.perceivedQuality}/5`);
  if (evidence.totalAttempts) {
    lines.push(
      `Shooting: ${evidence.totalMakes}/${evidence.totalAttempts} (${evidence.shootingPercentage?.toFixed(1)}%)`
    );
  }
  if (evidence.zoneBreakdown?.length) {
    lines.push(
      `By zone: ${evidence.zoneBreakdown
        .map((z) => `${z.zone} ${z.makes}/${z.attempts}`)
        .join(', ')}`
    );
  }
  if (evidence.drillsCompleted?.length) lines.push(`Drills: ${evidence.drillsCompleted.join(', ')}`);
  if (evidence.playerNotes) lines.push(`Player notes: ${evidence.playerNotes}`);
  if (evidence.previousFeedbackSummary) {
    lines.push(`Previous session feedback: ${evidence.previousFeedbackSummary}`);
  }
  return lines.join('\n');
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

// OpenAI implementation
export class OpenAIProvider extends AIProvider {
  readonly name = 'openai';

  async generateCoachingSummary(
    evidence: CoachingEvidence,
    config: AIProviderConfig
  ): Promise<CoachingOutput> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildPrompt(evidence) },
        ],
      }),
    });

    if (!response.ok) {
      // OpenAI puts the useful reason (bad key, unknown model, no quota) in the body
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      throw new Error(`OpenAI API error (${response.status}): ${body?.error?.message || response.statusText}`);
    }

    const data = (await response.json()) as { choices: Array<{ message: { content: string | null } }> };
    const content = data.choices[0]?.message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error('OpenAI returned feedback in an unexpected format');
    }

    if (typeof parsed.summary !== 'string' || !parsed.summary.trim()) {
      throw new Error('OpenAI returned feedback without a summary');
    }

    return {
      summary: parsed.summary,
      keyInsights: asStringArray(parsed.keyInsights),
      recommendations: asStringArray(parsed.recommendations),
      comparisonToPrevious:
        typeof parsed.comparisonToPrevious === 'string' ? parsed.comparisonToPrevious : undefined,
    };
  }
}

/** Sends one system + user prompt to OpenAI in JSON mode and returns the parsed object. */
export async function openAIJson(system: string, user: string, config: AIProviderConfig): Promise<Record<string, unknown>> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(`OpenAI API error (${response.status}): ${body?.error?.message || response.statusText}`);
  }
  const data = (await response.json()) as { choices: Array<{ message: { content: string | null } }> };
  const content = data.choices[0]?.message.content;
  if (!content) throw new Error('No response from OpenAI');
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new Error('OpenAI returned a response in an unexpected format');
  }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Plain-text chat completion (AI Coach chat). */
export async function openAIChat(messages: ChatMessage[], config: AIProviderConfig): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.model, max_tokens: config.maxTokens, temperature: 0.6, messages }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(`OpenAI API error (${response.status}): ${body?.error?.message || response.statusText}`);
  }
  const data = (await response.json()) as { choices: Array<{ message: { content: string | null } }> };
  const content = data.choices[0]?.message.content?.trim();
  if (!content) throw new Error('No response from OpenAI');
  return content;
}

export function getAIProvider(provider: string): AIProvider {
  switch (provider.toLowerCase()) {
    case 'openai':
      return new OpenAIProvider();
    default:
      throw new Error(`AI provider "${provider}" is not supported. Set AI_PROVIDER=openai.`);
  }
}
