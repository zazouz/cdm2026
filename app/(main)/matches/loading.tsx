export default function MatchesLoading() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <div className="h-4 w-16 rounded-full bg-gray-800" />
            <div className="h-3 w-24 rounded bg-gray-800" />
          </div>
          <div className="flex items-center px-4 py-3 gap-2">
            <div className="flex flex-1 flex-col items-center gap-2">
              <div className="h-7 w-10 rounded-sm bg-gray-800" />
              <div className="h-3 w-14 rounded bg-gray-800" />
            </div>
            <div className="w-16 flex justify-center">
              <div className="h-4 w-6 rounded bg-gray-800" />
            </div>
            <div className="flex flex-1 flex-col items-center gap-2">
              <div className="h-7 w-10 rounded-sm bg-gray-800" />
              <div className="h-3 w-14 rounded bg-gray-800" />
            </div>
          </div>
          <div className="flex gap-1.5 px-4 pb-3">
            {[1, 2, 3].map(j => (
              <div key={j} className="flex-1 rounded-xl border border-gray-800 bg-gray-800/50 py-3" />
            ))}
          </div>
          <div className="border-t border-gray-800 bg-gray-900/80 px-4 py-4">
            <div className="flex items-center justify-center gap-3">
              <div className="h-11 w-32 rounded-xl bg-gray-800" />
              <div className="h-5 w-4 rounded bg-gray-800" />
              <div className="h-11 w-32 rounded-xl bg-gray-800" />
              <div className="h-11 w-14 rounded-xl bg-gray-800" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
