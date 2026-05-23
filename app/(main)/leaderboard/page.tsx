import { createClient } from '@/lib/supabase-server'
import type { LeaderboardEntry } from '@/lib/types'
import LeaderboardTable from './LeaderboardTable'

export const revalidate = 60

export default async function LeaderboardPage() {
  const supabase = await createClient()

  const [{ data: entries }, { data: { user } }] = await Promise.all([
    supabase.from('leaderboard').select('*').order('total_points', { ascending: false }),
    supabase.auth.getUser(),
  ])

  const rows = (entries ?? []) as LeaderboardEntry[]

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
        <p className="text-sm text-gray-500 mt-1">
          MJ = matchs joués · SE = score exact · RJ = résultat juste
        </p>
      </div>

      <LeaderboardTable entries={rows} currentUserId={user!.id} />

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
