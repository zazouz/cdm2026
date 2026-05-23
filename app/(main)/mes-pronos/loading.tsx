export default function BetsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 w-32 rounded bg-gray-800" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="h-7 w-8 rounded-sm bg-gray-800" />
              <div className="space-y-1.5">
                <div className="h-4 w-28 rounded bg-gray-800" />
                <div className="h-3 w-20 rounded bg-gray-800" />
              </div>
              <div className="h-7 w-8 rounded-sm bg-gray-800" />
            </div>
            <div className="h-6 w-12 rounded bg-gray-800" />
          </div>
          <div className="px-4 py-3 space-y-2">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between">
                <div className="h-3 w-24 rounded bg-gray-800" />
                <div className="h-4 w-12 rounded bg-gray-800" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
