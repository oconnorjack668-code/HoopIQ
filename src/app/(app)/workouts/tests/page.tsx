// src/app/(app)/workouts/tests/page.tsx
import React from 'react';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import { Plus, TrendingUp, Award, Zap } from 'lucide-react';

export const metadata = {
  title: 'Performance Tests - HoopIQ',
};

const TEST_TYPES = [
  { id: 'standing_vertical', label: 'Standing Vertical', unit: 'inches', icon: '📈' },
  { id: 'approach_vertical', label: 'Approach Vertical', unit: 'inches', icon: '🚀' },
  { id: 'sprint_three_quarter', label: '3/4 Court Sprint', unit: 'seconds', icon: '⚡' },
  { id: 'sprint_40yd', label: '40 Yard Dash', unit: 'seconds', icon: '💨' },
  { id: 'lane_agility', label: 'Lane Agility', unit: 'seconds', icon: '🔄' },
  { id: 'pro_agility_5_10_5', label: 'Pro Agility (5-10-5)', unit: 'seconds', icon: '↔️' },
  { id: 'standing_broad_jump', label: 'Standing Broad Jump', unit: 'inches', icon: '🦘' },
];

export default async function PerformanceTestsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Fetch all performance tests grouped by type
  const { data: tests } = await supabase
    .from('performance_tests')
    .select('*')
    .eq('user_id', user.id)
    .order('test_date', { ascending: false });

  // Group tests by type and find PRs
  const testsByType = (tests || []).reduce(
    (acc, test) => {
      if (!acc[test.test_type]) {
        acc[test.test_type] = [];
      }
      acc[test.test_type].push(test);
      return acc;
    },
    {} as Record<string, typeof tests>
  );

  // Calculate best (PR) and trend for each test type
  const getMetrics = (type: string) => {
    const typeTests = testsByType[type] || [];
    if (typeTests.length === 0) return null;

    const testDef = TEST_TYPES.find((t) => t.id === type);
    if (!testDef) return null;

    // For time-based tests, lower is better; for distance, higher is better
    const isTime = ['sprint_three_quarter', 'sprint_40yd', 'lane_agility', 'pro_agility_5_10_5'].includes(type);
    const best = isTime
      ? typeTests.reduce((min, t) => (t.value < min.value ? t : min))
      : typeTests.reduce((max, t) => (t.value > max.value ? t : max));

    const recent = typeTests[0];
    const improved = isTime
      ? recent.value < best.value
      : recent.value > best.value;

    return { best, recent, improved, isTime, testDef };
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-red-600 to-orange-500 flex items-center justify-center shadow-lg">
              <Award className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">Performance Tests</h1>
              <p className="text-sm text-zinc-400 mt-1">Vertical, sprint, agility, and custom tests</p>
            </div>
          </div>
          <Link href="/workouts/tests/new">
            <Button variant="primary" size="lg" className="gap-2">
              <Plus className="h-4 w-4" /> Log Test
            </Button>
          </Link>
        </div>

        {/* Test Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {TEST_TYPES.map((testType) => {
            const metrics = getMetrics(testType.id);

            return (
              <Card key={testType.id} className="border-zinc-800 bg-zinc-900/70 hover:bg-zinc-900/90 transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="space-y-1">
                      <h3 className="font-bold text-white">{testType.label}</h3>
                      <p className="text-xs text-zinc-400">Measured in {testType.unit}</p>
                    </div>
                    <span className="text-2xl">{testType.icon}</span>
                  </div>

                  {metrics ? (
                    <div className="space-y-2 pt-3 border-t border-zinc-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400">Personal Best</span>
                        <span className="font-bold text-emerald-400">
                          {metrics.best.value} {testType.unit}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400">Latest</span>
                        <span className={`font-bold ${metrics.improved ? 'text-orange-400' : 'text-zinc-300'}`}>
                          {metrics.recent.value} {testType.unit}
                        </span>
                      </div>
                      {metrics.improved && (
                        <Badge variant="success" className="w-full justify-center text-center mt-2">
                          <Zap className="h-3 w-3 mr-1" /> Improved
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <div className="pt-3 border-t border-zinc-800">
                      <p className="text-xs text-zinc-500 italic">No tests logged yet</p>
                      <Link href="/workouts/tests/new" className="mt-2 block">
                        <Button variant="outline" size="sm" className="w-full">
                          Log First Test
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Tests Timeline */}
        {tests && tests.length > 0 && (
          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-400" />
                Recent Test Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tests.slice(0, 10).map((test) => {
                  const testDef = TEST_TYPES.find((t) => t.id === test.test_type);
                  const isPR = test.is_personal_record;

                  return (
                    <div
                      key={test.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/50 border border-zinc-800/60 hover:border-orange-500/30 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-white">{testDef?.label}</h4>
                          {isPR && (
                            <Badge variant="orange" className="text-xs">
                              <Award className="h-2.5 w-2.5 mr-1" />
                              PR
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400">
                          {new Date(test.test_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-orange-400">
                          {test.value} {testDef?.unit}
                        </span>
                        {test.notes && (
                          <p className="text-xs text-zinc-500 mt-0.5">{test.notes}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
