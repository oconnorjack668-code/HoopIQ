// @ts-nocheck
// src/lib/ai/service.ts
import { createClient } from '@/lib/supabase/server';
import { getAIProvider, CoachingEvidence, CoachingReport, AIProviderConfig } from './provider';

export interface SessionCoachingInput {
  sessionId: string;
  userId: string;
  sessionData: any;
  shootingData?: any[];
}

export class AICoachService {
  private provider = getAIProvider(process.env.AI_PROVIDER || 'openai');

  async generateSessionSummary(input: SessionCoachingInput): Promise<CoachingReport> {
    const config: AIProviderConfig = {
      apiKey: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || '',
      model: process.env.AI_MODEL || 'gpt-4-turbo',
      maxTokens: 1000,
    };

    if (!config.apiKey) {
      throw new Error('AI provider API key not configured');
    }

    // Extract evidence from session data
    const evidence = this.provider.extractSessionEvidence(input.sessionData);

    // Add shooting data if available
    if (input.shootingData && input.shootingData.length > 0) {
      const totalMakes = input.shootingData.reduce((sum, s) => sum + (s.makes || 0), 0);
      const totalAttempts = input.shootingData.reduce((sum, s) => sum + (s.attempts || 0), 0);
      evidence.shootingPercentage = totalAttempts > 0 ? (totalMakes / totalAttempts) * 100 : 0;
    }

    // Generate coaching report
    const report = await this.provider.generateCoachingSummary(evidence, config);
    report.sessionId = input.sessionId;
    report.userId = input.userId;

    // Deduct credits from user subscription
    await this.deductCredits(input.userId, report.creditsUsed);

    // Store report in database
    await this.storeReport(report);

    return report;
  }

  async compareWithPreviousSession(
    userId: string,
    currentSessionId: string,
    previousSessionId?: string
  ): Promise<string | null> {
    const supabase = await createClient();

    // Fetch current report
    const { data: currentReport } = (await supabase
      .from('ai_reports')
      .select('*')
      .eq('session_id', currentSessionId)
      .single()) as unknown as { data: any };

    if (!currentReport) return null;

    if (!previousSessionId) {
      // Get most recent previous session
      const { data: previousReports } = (await supabase
        .from('ai_reports')
        .select('*')
        .eq('user_id', userId)
        .neq('session_id', currentSessionId)
        .order('created_at', { ascending: false })
        .limit(1)) as unknown as { data: any[] };

      if (!previousReports || previousReports.length === 0) {
        return 'This is your first tracked session.';
      }

      previousSessionId = previousReports[0].session_id;
    }

    // Fetch previous report
    const { data: previousReport } = (await supabase
      .from('ai_reports')
      .select('*')
      .eq('session_id', previousSessionId || '')
      .single()) as unknown as { data: any };

    if (!previousReport) return null;

    // Generate comparison
    const comparison = `
Current Session: ${currentReport.summary}
Previous Session: ${previousReport.summary}

Key differences and progress:
- Current insights focus on: ${currentReport.key_insights?.[0] || 'session quality'}
- Previous insights focused on: ${previousReport.key_insights?.[0] || 'session quality'}
    `.trim();

    return comparison;
  }

  async getMonthlyCreditsUsed(userId: string): Promise<number> {
    const supabase = await createClient();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data } = (await supabase
      .from('ai_reports')
      .select('credits_used')
      .eq('user_id', userId)
      .gte('created_at', monthStart.toISOString())) as unknown as { data: any[] };

    return data?.reduce((sum, r) => sum + (r.credits_used || 0), 0) || 0;
  }

  async getRemainingCredits(userId: string): Promise<number> {
    const supabase = await createClient();

    const { data: subscription } = (await supabase
      .from('subscriptions')
      .select('plan_type, ai_credits_remaining')
      .eq('user_id', userId)
      .single()) as unknown as { data: any };

    if (!subscription) return 0;

    if (subscription.plan_type === 'pro' || subscription.plan_type === 'owner') {
      return 999; // Unlimited
    }

    return subscription.ai_credits_remaining || 0;
  }

  // @ts-nocheck
  private async deductCredits(userId: string, credits: number): Promise<void> {
    const supabase = await createClient();

    const remaining = await this.getRemainingCredits(userId);
    if (remaining === 999) return; // Unlimited

    const newRemaining = Math.max(0, remaining - credits);

    const query = supabase
      .from('subscriptions')
      .update({ ai_credits_remaining: newRemaining } as any);

    await query.eq('user_id', userId);
  }

  private async storeReport(report: CoachingReport): Promise<void> {
    const supabase = await createClient();

    const { error } = (await (supabase.from('ai_reports').insert([{
      id: report.id,
      session_id: report.sessionId,
      user_id: report.userId,
      summary: report.summary,
      key_insights: report.keyInsights,
      recommendations: report.recommendations,
      comparison_to_previous: report.comparisonToPrevious,
      created_at: report.createdAt,
      credits_used: report.creditsUsed,
    }] as any))) as unknown as { error: any };

    if (error) {
      console.error('Failed to store AI report:', error);
    }
  }
}

export const aiCoachService = new AICoachService();
