import React from 'react';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/Card';
import { PageHeader } from '@/components/layout/PageHeader';
import { BookOpen, CheckCircle2, Play, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Basketball IQ - HoopIQ' };

export default async function StudyPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: topics }, { data: completed }] = (await Promise.all([
    supabase
      .from('study_topics')
      .select('id, title, description, study_items(id, title, display_order, quiz_questions)')
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    supabase.from('study_progress').select('item_id').eq('user_id', user.id).not('completed_at', 'is', null),
  ])) as [
    {
      data: Array<{
        id: string;
        title: string;
        description: string;
        study_items: Array<{ id: string; title: string; display_order: number; quiz_questions: unknown[] }>;
      }> | null;
    },
    { data: Array<{ item_id: string }> | null },
  ];

  const done = new Set((completed || []).map((c) => c.item_id));
  const sections = topics || [];
  const totalLessons = sections.reduce((n, t) => n + t.study_items.length, 0);
  const totalQuestions = sections.reduce(
    (n, t) => n + t.study_items.reduce((q, i) => q + (Array.isArray(i.quiz_questions) ? i.quiz_questions.length : 0), 0),
    0
  );
  const overallPercent = totalLessons > 0 ? Math.round((done.size / totalLessons) * 100) : 0;

  // First unfinished lesson in display order - the "pick up where you left off"
  // entry point, so returning players do not have to remember where they were.
  let next: { topicId: string; topicTitle: string; lessonTitle: string; index: number } | null = null;
  for (const topic of sections) {
    const ordered = [...topic.study_items].sort((a, b) => a.display_order - b.display_order);
    const idx = ordered.findIndex((i) => !done.has(i.id));
    if (idx !== -1) {
      next = { topicId: topic.id, topicTitle: topic.title, lessonTitle: ordered[idx].title, index: idx + 1 };
      break;
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <PageHeader tone="iq" icon={BookOpen} title="Basketball IQ" subtitle="Lessons and quizzes to read the game" />

        {/* Overall progress */}
        <Card className="border-zinc-800 bg-zinc-900/70 mb-3">
          <CardContent className="p-5 flex items-center gap-5">
            <div className="relative h-20 w-20 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" className="text-zinc-800" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="text-blue-500"
                  strokeDasharray={`${(overallPercent / 100) * 97.4} 97.4`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-white">
                {overallPercent}%
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-lg font-black text-white">
                {done.size} of {totalLessons} lessons done
              </div>
              <div className="text-sm text-zinc-400">
                {sections.length} sections · {totalQuestions} quiz questions
              </div>
              {totalLessons > done.size && (
                <div className="text-sm font-semibold text-blue-400 mt-0.5">
                  {totalLessons - done.size} lesson{totalLessons - done.size === 1 ? '' : 's'} to go
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {next && (
          <Link
            href={`/study/${next.topicId}`}
            className="mb-6 flex items-center gap-3 rounded-2xl border border-blue-600/40 bg-blue-600/10 p-4 hover:bg-blue-600/15"
          >
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-blue-600">
              <Play className="h-5 w-5 text-white" fill="currentColor" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-zinc-400">Continue</span>
              <span className="block font-bold text-white truncate">
                {next.topicTitle} · Lesson {next.index}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 flex-shrink-0 text-zinc-500" />
          </Link>
        )}

        <h2 className="text-lg font-bold text-white mb-3">Sections</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sections.map((topic) => {
            const lessons = topic.study_items.length;
            const finished = topic.study_items.filter((i) => done.has(i.id)).length;
            const percent = lessons > 0 ? Math.round((finished / lessons) * 100) : 0;
            return (
              <Link key={topic.id} href={`/study/${topic.id}`} className="block">
                <Card className="border-zinc-800 bg-zinc-900/70 hover:bg-zinc-900/90 hover:border-blue-500/30 transition-colors cursor-pointer h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold text-white">{topic.title}</h3>
                      {lessons > 0 && finished === lessons ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <span className="text-sm font-bold text-blue-400 flex-shrink-0">{percent}%</span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-2">{topic.description}</p>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="h-1.5 flex-1 rounded-full bg-zinc-800 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${percent}%` }} />
                      </div>
                      <span className="text-xs text-zinc-500 flex-shrink-0">
                        {finished}/{lessons} lessons
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
