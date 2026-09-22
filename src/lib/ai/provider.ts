// src/lib/ai/provider.ts
export interface CoachingEvidence {
  sessionType: string;
  duration: number;
  intensity: number;
  shootingPercentage?: number;
  drillsCompleted?: string[];
  notableMetrics?: Record<string, number | string>;
  playerNotes?: string;
}

export interface CoachingReport {
  id: string;
  sessionId: string;
  userId: string;
  summary: string;
  keyInsights: string[];
  recommendations: string[];
  comparisonToPrevious?: string;
  createdAt: string;
  creditsUsed: number;
}

export interface AIProviderConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
}

export abstract class AIProvider {
  abstract generateCoachingSummary(
    evidence: CoachingEvidence,
    config: AIProviderConfig
  ): Promise<CoachingReport>;

  abstract extractSessionEvidence(sessionData: any): CoachingEvidence;
}

// OpenAI implementation
export class OpenAIProvider extends AIProvider {
  async generateCoachingSummary(
    evidence: CoachingEvidence,
    config: AIProviderConfig
  ): Promise<CoachingReport> {
    const prompt = this.buildPrompt(evidence);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model || 'gpt-4-turbo',
        max_tokens: config.maxTokens || 1000,
        messages: [
          {
            role: 'system',
            content: `You are an expert basketball coach providing detailed, actionable feedback on player development.
Analyze session data and provide:
1. A concise 2-3 sentence summary of the session quality and key takeaway
2. 2-3 specific insights about performance
3. 2-3 actionable recommendations for improvement
Format your response as JSON with keys: summary, keyInsights (array), recommendations (array)`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage: { total_tokens: number };
    };

    const content = data.choices[0]?.message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    let parsed: { summary: string; keyInsights: string[]; recommendations: string[] };
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1] || content);
    } catch {
      parsed = {
        summary: content.split('\n')[0] || 'Session completed',
        keyInsights: [],
        recommendations: [],
      };
    }

    return {
      id: `report_${Date.now()}`,
      sessionId: '',
      userId: '',
      summary: parsed.summary,
      keyInsights: parsed.keyInsights || [],
      recommendations: parsed.recommendations || [],
      createdAt: new Date().toISOString(),
      creditsUsed: Math.ceil((data.usage?.total_tokens || 500) / 100),
    };
  }

  extractSessionEvidence(sessionData: any): CoachingEvidence {
    return {
      sessionType: sessionData.session_type || 'general',
      duration: sessionData.duration_minutes || 0,
      intensity: sessionData.intensity_rpe || 5,
      shootingPercentage: sessionData.shooting_percentage,
      playerNotes: sessionData.notes,
      notableMetrics: {
        quality: sessionData.perceived_quality,
        date: sessionData.session_date,
      },
    };
  }

  private buildPrompt(evidence: CoachingEvidence): string {
    return `
Session Type: ${evidence.sessionType}
Duration: ${evidence.duration} minutes
Intensity (RPE): ${evidence.intensity}/10
Shooting %: ${evidence.shootingPercentage ? evidence.shootingPercentage.toFixed(1) + '%' : 'N/A'}
${evidence.drillsCompleted ? `Drills: ${evidence.drillsCompleted.join(', ')}` : ''}
${evidence.playerNotes ? `Player Notes: ${evidence.playerNotes}` : ''}

Provide coaching feedback based on this session data.
    `.trim();
  }
}

// Anthropic/Claude implementation (placeholder)
export class AnthropicProvider extends AIProvider {
  async generateCoachingSummary(
    evidence: CoachingEvidence,
    config: AIProviderConfig
  ): Promise<CoachingReport> {
    // Placeholder for Claude API integration
    return {
      id: `report_${Date.now()}`,
      sessionId: '',
      userId: '',
      summary: 'Claude integration coming soon',
      keyInsights: [],
      recommendations: [],
      createdAt: new Date().toISOString(),
      creditsUsed: 0,
    };
  }

  extractSessionEvidence(sessionData: any): CoachingEvidence {
    return {
      sessionType: sessionData.session_type || 'general',
      duration: sessionData.duration_minutes || 0,
      intensity: sessionData.intensity_rpe || 5,
      shootingPercentage: sessionData.shooting_percentage,
      playerNotes: sessionData.notes,
    };
  }
}

export function getAIProvider(provider: string): AIProvider {
  switch (provider.toLowerCase()) {
    case 'openai':
      return new OpenAIProvider();
    case 'anthropic':
      return new AnthropicProvider();
    default:
      return new OpenAIProvider();
  }
}
