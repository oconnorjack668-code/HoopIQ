import React from 'react';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/Card';
import { BookOpen, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Basketball IQ - HoopIQ' };

export default async function StudyPage() {
  const user = await requireUser();
  const supabase = (await createClient()) as any;

  const [{ data: topics }, { data: completed }] = (await Promise.all([
    supabase
      .from('study_topics')
      .select('id, title, description, study_items(id, quiz_questions)')
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    supabase.from('study_progress').select('item_id').eq('user_id', user.id).not('completed_at', 'is', null),
  ])) as [
    { data: Array<{ id: string; title: string; description: string; study_items: Array<{ id: string; quiz_questions: unknown[] }> }> | null },
    { data: Array<{ item_id: string }> | null },
  ];

  const done = new Set((completed || []).map((c) => c.item_id));
  const totalLessons = (topics || []).reduce((n, t) => n + t.study_items.length, 0);
  const totalQuestions = (topics || []).reduce(
    (n, t) => n + t.study_items.reduce((q, i) => q + (Array.isArray(i.quiz_questions) ? i.quiz_questions.length : 0), 0),
    0
  );

  return (
    <div className="flex-1 overflow-auto p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg">
          <BookOpen className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Basketball IQ</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {topics?.length || 0} sections · {totalLessons} lessons · {totalQuestions} quiz questions ·{' '}
            {done.size} lessons completed
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {topics?.map((topic) => {
          const lessons = topic.study_items.length;
          const finished = topic.study_items.filter((i) => done.has(i.id)).length;
          const percent = lessons > 0 ? Math.round((finished / lessons) * 100) : 0;
          return (
            <Link key={topic.id} href={`/study/${topic.id}`} className="block">
              <Card className="border-zinc-800 bg-zinc-900/70 hover:bg-zinc-900/90 transition-colors cursor-pointer h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-white">{topic.title}</h3>
                    {lessons > 0 && finished === lessons && <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-zinc-400 mt-2">{topic.description}</p>
                  <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                    <span>
                      {finished}/{lessons} lessons
                    </span>
                    <span>{percent}%</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${percent}%` }} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
