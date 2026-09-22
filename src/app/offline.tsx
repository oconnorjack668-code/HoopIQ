// src/app/offline.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Wifi, RefreshCw } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
      <Card className="border-zinc-800 bg-zinc-900/70 max-w-md w-full">
        <CardContent className="p-8 text-center space-y-6">
          <div className="space-y-2">
            <Wifi className="h-16 w-16 text-zinc-600 mx-auto opacity-50" />
            <h1 className="text-2xl font-black text-white">You're Offline</h1>
            <p className="text-sm text-zinc-400">
              HoopIQ is working offline. Some features may be limited.
            </p>
          </div>

          <div className="space-y-3 text-sm text-zinc-300">
            <div className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>View your dashboard and past data</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>Log new sessions (will sync when online)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-zinc-500">✗</span>
              <span>AI coaching reports</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-zinc-500">✗</span>
              <span>Video uploads</span>
            </div>
          </div>

          <button
            onClick={() => {
              window.location.reload();
            }}
            className="w-full px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Check Connection
          </button>

          <p className="text-xs text-zinc-500">
            Changes will automatically sync when you regain internet connection
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
