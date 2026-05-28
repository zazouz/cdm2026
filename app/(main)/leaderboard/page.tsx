import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import type { Lang } from '@/lib/i18n'
import type { LeaderboardEntry } from '@/lib/types'
import LeaderboardTable from './LeaderboardTable'

export const dynamic = 'force-dynamic'

const T = {
  fr: {
    title: 'Classement',
    subtitle: 'MJ = matchs joués · SE = score exact · RJ = résultat juste',
    empty: 'Aucun point marqué pour l\'instant.',
    emptyHint: 'Les points apparaissent dès la fin du premier match.',
    scale: 'Barème',
    exact: 'Score exact',
    exactPoints: '3 × cote du résultat prédit',
    correct: 'Bon résultat',
    correctPoints: '1 × cote du résultat prédit',
    wrong: 'Mauvais résultat',
    wrongPoints: '0 pt',
  },
  en: {
    title: 'Standings',
    subtitle: 'GP = games played · ES = exact score · CR = correct result',
    empty: 'No points yet.',
    emptyHint: 'Points appear after the first match ends.',
    scale: 'Scoring',
    exact: 'Exact score',
    exactPoints: '3 × odds of predicted result',
    correct: 'Correct result',
    correctPoints: '1 × odds of predicted result',
    wrong: 'Wrong result',
    wrongPoints: '0 pt',
  },
}

export default async function LeaderboardPage() {
  const cookieStore = await cookies()
  const rawLang = cookieStore.get('prono_lang')?.value
  const lang: Lang = rawLang === 'fr' || rawLang === 'en' ? rawLang : 'fr'
  const t = T[lang]

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
        <p className="text-base font-semibold text-gray-300">{t.empty}</p>
        <p className="text-sm text-gray-500 mt-2">{t.emptyHint}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">{t.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{t.subtitle}</p>
      </div>

      <LeaderboardTable entries={rows} currentUserId={user!.id} lang={lang} />

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-2">{t.scale}</p>
        <div className="flex justify-between text-xs text-gray-500">
          <span>{t.exact}</span>
          <span className="text-green-600">{t.exactPoints}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>{t.correct}</span>
          <span className="text-blue-600">{t.correctPoints}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>{t.wrong}</span>
          <span className="text-gray-500">{t.wrongPoints}</span>
        </div>
      </div>
    </div>
  )
}
