// src/app/(app)/guides/page.tsx
import React from 'react';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { BookHeart, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Guides - HoopIQ' };

const GUIDE_CATEGORIES: Record<string, string> = {
  mental_game: 'Mental Game',
  recovery: 'Recovery',
  nutrition: 'Nutrition',
  injury_prevention: 'Injury Prevention',
  vertical: 'Jump Higher',
  game_prep: 'Game Prep',
};

export default async function GuidesPage() {
  await requireUser();
  const supabase = (await createClient()) as any;
  const { data } = (await supabase
    .from('guides')
    .select('slug, category, title, summary, reading_minutes')
    .order('display_order')) as {
    data: Array<{ slug: string; category: string; title: string; summary: string; reading_minutes: number }> | null;
  };
  const guides = data || [];

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg">
            <BookHeart className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Guides</h1>
            <p className="text-sm text-zinc-400 mt-1">The off-court side of getting better</p>
          </div>
        </div>

        {Object.entries(GUIDE_CATEGORIES).map(([id, label]) => {
          const inCategory = guides.filter((g) => g.category === id);
          if (inCategory.length === 0) return null;
          return (
            <section key={id} className="mb-6">
              <h2 className="text-sm font-bold uppercase text-zinc-400 mb-2">{label}</h2>
              <div className="space-y-2">
                {inCategory.map((g) => (
                  <Link key={g.slug} href={`/guides/${g.slug}`} className="block rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 hover:bg-zinc-900">
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-semibold text-white">{g.title}</div>
                      <span className="flex items-center gap-1 text-xs text-zinc-500 flex-shrink-0">
                        <Clock className="h-3 w-3" /> {g.reading_minutes} min
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400 mt-1">{g.summary}</p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
        {guides.length === 0 && <p className="text-sm text-zinc-500">No guides yet.</p>}
      </div>
    </div>
  );
}
