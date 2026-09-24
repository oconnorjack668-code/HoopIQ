import React from 'react';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { BookOpen } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Basketball IQ - HoopIQ' };

export default async function StudyPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: topics } = await supabase
    .from('study_topics')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .returns<Array<{
      id: string;
      title: string;
      description: string;
    }>>();

  return (
    <div className="flex-1 overflow-auto p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg">
          <BookOpen className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Basketball IQ</h1>
          <p className="text-sm text-zinc-400 mt-1">Learn advanced concepts, watch film, reflect, and quiz yourself</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {topics?.map((topic) => (
          <Link key={topic.id} href={`/study/${topic.id}`} className="block">
            <Card className="border-zinc-800 bg-zinc-900/70 hover:bg-zinc-900/90 transition-colors cursor-pointer h-full">
              <CardContent className="p-5">
                <h3 className="font-bold text-white">{topic.title}</h3>
                <p className="text-xs text-zinc-400 mt-2">{topic.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
