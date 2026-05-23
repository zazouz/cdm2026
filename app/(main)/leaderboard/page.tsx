import { createClient } from '@/lib/supabase-server'
import type { LeaderboardEntry } from '@/lib/types'
import Link from 'next/link'

export const revalidate = 60

export default async function LeaderboardPage() {
  const supabase = await createClient()

  const { data: entries } = await supabase
    .from('leaderboard')
    .select('*')
    .order('total_points', { ascending: false })

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('users')
    .select('username')
    .eq('id', user!.id)
    .single()

  const myUsername = profile?.username ?? ''
  const rows = (entries ?? []) as LeaderboardEntry[]

  const top3 = rows.slice(0, 3)
  const rest = rows.slice(3)

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-4xl mb-4">🏆</p>
        <p className="text-base font-semibold text-gray-300">Aucun point marqué pour l&apos;instant.</p>
        <p className="text-sm text-gray-600 mt-2">Les points apparaissent dès la fin du premier match.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Classement</h1>
        <p className="text-sm text-gray-500 mt-1">Clique sur un joueur pour voir le détail de ses pronostics.</p>
      </div>

      {/* Podium top 3 */}
      {top3.length >= 2 && (
        <div className="grid grid-cols-3 gap-2">
          {/* 2nd — left */}
          {top3[1] ? (
            <Link
              href={`/leaderboard/${top3[1].id}`}
              className="flex flex-col items-center rounded-2xl border border-gray-800 bg-gray-900 p-4 text-center transition-colors hover:border-gray-700"
            >
              <span className="text-2xl mb-1">🥈</span>
              <span className="text-xs font-bold leading-tight text-white">{top3[1].first_name}</span>
              <span className="text-[10px] text-gray-600 font-mono mt-0.5">{top3[1].username}</span>
              <span className="text-base font-extrabold text-white mt-2">{Number(top3[1].total_points).toFixed(2)}</span>
              <span className="text-[9px] text-gray-600 uppercase tracking-wide">pts</span>
            </Link>
          ) : <div />}

          {/* 1st — center, taller */}
          {top3[0] && (
            <Link
              href={`/leaderboard/${top3[0].id}`}
              className="flex flex-col items-center rounded-2xl border border-amber-900/50 bg-gradient-to-b from-amber-950/40 to-gray-900 p-4 text-center transition-colors hover:border-amber-800/60"
            >
              <span className="text-2xl mb-1">🥇</span>
              <span className="text-xs font-bold leading-tight text-white">{top3[0].first_name}</span>
              <span className="text-[10px] text-gray-600 font-mono mt-0.5">{top3[0].username}</span>
              <span className="text-lg font-extrabold text-amber-400 mt-2">{Number(top3[0].total_points).toFixed(2)}</span>
              <span className="text-[9px] text-gray-600 uppercase tracking-wide">pts</span>
            </Link>
          )}

          {/* 3rd — right */}
          {top3[2] ? (
            <Link
              href={`/leaderboard/${top3[2].id}`}
              className="flex flex-col items-center rounded-2xl border border-gray-800 bg-gray-900 p-4 text-center transition-colors hover:border-gray-700"
            >
              <span className="text-2xl mb-1">🥉</span>
              <span className="text-xs font-bold leading-tight text-white">{top3[2].first_name}</span>
              <span className="text-[10px] text-gray-600 font-mono mt-0.5">{top3[2].username}</span>
              <span className="text-base font-extrabold text-white mt-2">{Number(top3[2].total_points).toFixed(2)}</span>
              <span className="text-[9px] text-gray-600 uppercase tracking-wide">pts</span>
            </Link>
          ) : <div />}
        </div>
      )}

      {/* Rest of the list */}
      {rest.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
          {rest.map((entry, i) => {
            const rank = i + 4
            const isMe = entry.username === myUsername
            return (
              <Link
                key={entry.id}
                href={`/leaderboard/${entry.id}`}
                className={`flex items-center gap-3 border-b border-gray-800/60 px-4 py-3.5 transition-colors last:border-0 ${
                  isMe ? 'bg-green-950/20' : 'hover:bg-gray-800/40'
                }`}
              >
                <span className="w-5 text-center text-xs font-bold text-gray-600">{rank}</span>
                <div className="flex-1">
                  <span className={`text-sm font-semibold ${isMe ? 'text-green-400' : 'text-white'}`}>
                    {entry.first_name} {entry.last_name}
                    {isMe && <span className="ml-1.5 rounded-full bg-green-950 px-1.5 py-0.5 text-[9px] text-green-600">toi</span>}
                  </span>
                  <div className="font-mono text-[10px] text-gray-600">{entry.username}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-white">{Number(entry.total_points).toFixed(2)}</div>
                  <div className="text-[10px] text-gray-600">{entry.exact_scores}✓ · {entry.correct_results}≈</div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-600 mb-2">Barème</p>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Score exact</span>
          <span className="text-green-600">3 × côte du résultat prédit</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Bon résultat</span>
          <span className="text-blue-600">1 × côte du résultat prédit</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Mauvais résultat</span>
          <span className="text-gray-600">0 pt</span>
        </div>
      </div>
    </div>
  )
}
