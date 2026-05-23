export default function UserDetailLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-4 w-4 rounded bg-gray-800" />
        <div className="h-5 w-32 rounded bg-gray-800" />
      </div>
      <div className="flex gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex-1 rounded-xl border border-gray-800 bg-gray-900 p-3 space-y-1">
            <div className="h-6 w-12 rounded bg-gray-800" />
            <div className="h-3 w-10 rounded bg-gray-800" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-4 w-36 rounded bg-gray-800" />
              <div className="h-3 w-20 rounded bg-gray-800" />
            </div>
            <div className="text-right space-y-1">
              <div className="h-5 w-12 rounded bg-gray-800" />
              <div className="h-3 w-10 rounded bg-gray-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
