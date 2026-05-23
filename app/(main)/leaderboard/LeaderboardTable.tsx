'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { LeaderboardEntry } from '@/lib/types'

type SortKey = 'total_points' | 'exact_scores' | 'correct_results'

export default function LeaderboardTable({
  entries,
  currentUserId,
}: {
  entries: LeaderboardEntry[]
  currentUserId: string
}) {
  const [sortKey, setSortKey] = useState<SortKey>('total_points')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...entries].sort((a, b) => {
    const diff = Number(b[sortKey]) - Number(a[sortKey])
    return sortDir === 'desc' ? diff : -diff
  })

  function ColHeader({ label, col }: { label: string; col: SortKey }) {
    const active = sortKey === col
    const arrow = active ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''
    return (
      <button
        onClick={() => toggleSort(col)}
        className={`w-9 text-right text-[10px] font-bold uppercase tracking-wider transition-colors select-none ${
          active ? 'text-white' : 'text-gray-600 hover:text-gray-400'
        }`}
      >
        {label}{arrow}
      </button>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-800 px-4 py-2.5">
        <span className="w-5 shrink-0 text-center text-[10px] font-bold uppercase tracking-wider text-gray-600">#</span>
        <span className="flex-1 text-[10px] font-bold uppercase tracking-wider text-gray-600">Joueur</span>
        <span className="w-9 text-right text-[10px] font-bold uppercase tracking-wider text-gray-600">MJ</span>
        <ColHeader label="SE" col="exact_scores" />
        <ColHeader label="RJ" col="correct_results" />
        <ColHeader label="Pts" col="total_points" />
      </div>

      {/* Rows */}
      {sorted.map((entry, i) => {
        const isMe = entry.id === currentUserId
        return (
          <Link
            key={entry.id}
            href={`/leaderboard/${entry.id}`}
            className={`flex items-center gap-2 border-b border-gray-800/50 px-4 py-3 last:border-0 transition-colors ${
              isMe ? 'bg-green-950/20 hover:bg-green-950/30' : 'hover:bg-gray-800/40'
            }`}
          >
            <span className="w-5 shrink-0 text-center text-xs font-bold text-gray-500">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate ${isMe ? 'text-green-400' : 'text-white'}`}>
                {entry.first_name} {entry.last_name}
                {isMe && (
                  <span className="ml-1.5 rounded-full bg-green-950 px-1.5 py-0.5 text-[9px] text-green-600">toi</span>
                )}
              </p>
              <p className="font-mono text-[10px] text-gray-600 truncate">{entry.username}</p>
            </div>
            <span className="w-9 text-right text-xs text-gray-500 tabular-nums">{entry.predictions_scored}</span>
            <span className={`w-9 text-right text-xs font-semibold tabular-nums ${
              sortKey === 'exact_scores' ? 'text-green-400' : 'text-gray-400'
            }`}>
              {entry.exact_scores}
            </span>
            <span className={`w-9 text-right text-xs font-semibold tabular-nums ${
              sortKey === 'correct_results' ? 'text-blue-400' : 'text-gray-400'
            }`}>
              {entry.correct_results}
            </span>
            <span className={`w-9 text-right text-sm font-bold tabular-nums ${
              sortKey === 'total_points' ? 'text-amber-400' : 'text-white'
            }`}>
              {Number(entry.total_points).toFixed(2)}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
