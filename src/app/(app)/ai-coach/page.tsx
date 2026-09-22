// src/app/(app)/ai-coach/page.tsx
import React from 'react';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Link as LinkIcon, Zap, TrendingUp, Lightbulb } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'AI Coach - HoopIQ',
};

export default async function AICoachPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Fetch recent AI reports
  const { data: reports } = (await supabase
    .from('ai_reports')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)) as unknown as { data: any[] };

  // Fetch subscription for credit info
  const { data: subscription } = (await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single()) as unknown as { data: any };

  // Calculate this month's usage
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data: monthReports } = (await supabase
    .from('ai_reports')
    .select('credits_used')
    .eq('user_id', user.id)
    .gte('created_at', monthStart.toISOString())) as unknown as { data: any[] };

  const monthlyUsage = monthReports?.reduce((sum, r) => sum + (r.credits_used || 0), 0) || 0;
  const isUnlimited = subscription?.plan_type === 'pro' || subscription?.plan_type === 'owner';
  const remainingCredits = isUnlimited ? '∞' : subscription?.ai_credits_remaining || 0;

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">AI Coach</h1>
              <p className="text-sm text-zinc-400 mt-1">AI-powered feedback on your sessions and progress</p>
            </div>
          </div>
        </div>

        {/* Credit Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardContent className="p-5">
              <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-2">This Month</div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-purple-400">{monthlyUsage}</span>
                <span className="text-xs text-zinc-500">credits used</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardContent className="p-5">
              <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-2">Remaining</div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-cyan-400">{remainingCredits}</span>
                <span className="text-xs text-zinc-500">available</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardContent className="p-5">
              <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-2">Plan</div>
              <div className="flex items-center gap-2">
                <Badge variant={isUnlimited ? 'success' : 'default'} className="text-xs">
                  {subscription?.plan_type || 'free'}
                </Badge>
              </div>
              <div className="text-xs text-zinc-500 mt-2">
                {isUnlimited ? 'Unlimited access' : 'Monthly limit'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Reports */}
        {reports && reports.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-400" />
              Coaching Reports
            </h2>

            {reports.map((report) => (
              <Card key={report.id} className="border-zinc-800 bg-zinc-900/70 hover:bg-zinc-900/90 transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="space-y-1">
                      <h3 className="font-bold text-white">{report.summary}</h3>
                      <p className="text-xs text-zinc-400">
                        {new Date(report.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <Badge variant="purple" className="text-xs">
                      {report.credits_used} cr
                    </Badge>
                  </div>

                  {/* Key Insights */}
                  {report.key_insights && report.key_insights.length > 0 && (
                    <div className="mb-3 space-y-1">
                      <div className="text-xs font-semibold text-zinc-400 uppercase">Key Insights</div>
                      <ul className="text-sm text-zinc-300 space-y-1">
                        {report.key_insights.map((insight: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Lightbulb className="h-3.5 w-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {report.recommendations && report.recommendations.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-zinc-400 uppercase">Recommendations</div>
                      <ul className="text-sm text-zinc-300 space-y-1">
                        {report.recommendations.map((rec: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <LinkIcon className="h-3.5 w-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="p-12 text-center">
              <Zap className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-zinc-300 mb-1">No coaching reports yet</h3>
              <p className="text-sm text-zinc-400 mb-6">
                Log basketball sessions to get AI-powered coaching feedback on your performance.
              </p>
              <Link href="/basketball/new">
                <Button variant="primary" size="lg">
                  Log First Session
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
