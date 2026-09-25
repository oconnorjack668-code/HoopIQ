// src/app/(app)/loading.tsx
// Shown instantly while a page's data loads, so taps on the nav feel immediate.
export default function Loading() {
  return (
    <div className="flex-1 overflow-hidden">
      <div className="p-4 md:p-8 max-w-7xl mx-auto animate-pulse" aria-busy="true" aria-label="Loading">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-zinc-800" />
          <div className="space-y-2">
            <div className="h-6 w-48 rounded bg-zinc-800" />
            <div className="h-3 w-64 rounded bg-zinc-900" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 rounded-2xl border border-zinc-800 bg-zinc-900/70" />
          ))}
        </div>
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-2xl border border-zinc-800 bg-zinc-900/50" />
          ))}
        </div>
      </div>
    </div>
  );
}
