import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Sparkles } from 'lucide-react';

export const metadata = { title: 'AI Coach - HoopIQ' };

export default async function AICoachPage() {
  return (
    <div className="flex-1 overflow-auto p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">AI Coach</h1>
          <p className="text-sm text-zinc-400 mt-1">Session summaries, trends, and personalized insights</p>
        </div>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardContent className="p-12 text-center">
          <Sparkles className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-zinc-300 mb-1">Coming Soon</h3>
          <p className="text-sm text-zinc-400">AI-powered coaching reports after you log sessions</p>
        </CardContent>
      </Card>
    </div>
  );
}
