export default function LeaderboardLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-36 rounded bg-gray-800" />
        <div className="h-4 w-64 rounded bg-gray-800" />
      </div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-3 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-gray-800" />
          <div className="h-16 w-20 rounded-t-lg bg-gray-800" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-gray-800" />
          <div className="h-24 w-20 rounded-t-lg bg-gray-800" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-gray-800" />
          <div className="h-12 w-20 rounded-t-lg bg-gray-800" />
        </div>
      </div>

      {/* Table rows */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden divide-y divide-gray-800">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="h-4 w-5 rounded bg-gray-800" />
            <div className="h-4 w-28 rounded bg-gray-800 flex-1" />
            <div className="h-4 w-12 rounded bg-gray-800" />
            <div className="h-4 w-6 rounded bg-gray-800" />
            <div className="h-4 w-6 rounded bg-gray-800" />
            <div className="h-4 w-6 rounded bg-gray-800" />
          </div>
        ))}
      </div>

      {/* Scoring key */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-2">
        <div className="h-3 w-16 rounded bg-gray-800" />
        {[1, 2, 3].map(i => (
          <div key={i} className="flex justify-between">
            <div className="h-3 w-20 rounded bg-gray-800" />
            <div className="h-3 w-28 rounded bg-gray-800" />
          </div>
        ))}
      </div>
    </div>
  )
}
