import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import type { Lang } from '@/lib/i18n'
import type { Match } from '@/lib/types'
import { flagUrl } from '@/lib/flags'

export const dynamic = 'force-dynamic'

const T = {
  fr: {
    title: 'Groupes',
    subtitle: 'Classements et résultats de la phase de groupes.',
    group: 'Groupe',
    team: 'Équipe',
    played: 'J', won: 'V', drawn: 'N', lost: 'D', diff: 'DB', points: 'Pts',
    qualify: 'Qualification directe (top 2)',
    scheduled: (d: string) => d,
    empty: 'Aucun match de groupe',
    emptyHint: "Les classements apparaîtront dès que des matchs seront importés.",
  },
  en: {
    title: 'Groups',
    subtitle: 'Standings and results of the group stage.',
    group: 'Group',
    team: 'Team',
    played: 'P', won: 'W', drawn: 'D', lost: 'L', diff: 'GD', points: 'Pts',
    qualify: 'Direct qualification (top 2)',
    scheduled: (d: string) => d,
    empty: 'No group matches',
    emptyHint: 'Standings will appear once matches are imported.',
  },
}

type TeamStats = {
  team: string
  flag: string | null
  gp: number
  w: number
  d: number
  l: number
  gf: number
  ga: number
  pts: number
}

function formatMatchDate(dateStr: string, lang: Lang) {
  return new Date(dateStr).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Paris',
  })
}

function computeStandings(matches: Match[]): Record<string, TeamStats[]> {
  const groups: Record<string, Record<string, TeamStats>> = {}

  for (const m of matches) {
    if (m.stage !== 'group' || !m.group_name) continue
    const g = m.group_name
    if (!groups[g]) groups[g] = {}

    const initTeam = (team: string, flag: string | null) => {
      if (!groups[g][team]) {
        groups[g][team] = { team, flag, gp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }
      }
    }

    initTeam(m.home_team, m.home_flag ?? null)
    initTeam(m.away_team, m.away_flag ?? null)

    if (m.status !== 'finished' || m.home_score === null || m.away_score === null) continue

    const hs = m.home_score
    const awayScore = m.away_score
    const home = groups[g][m.home_team]
    const away = groups[g][m.away_team]

    home.gp++; home.gf += hs; home.ga += awayScore
    away.gp++; away.gf += awayScore; away.ga += hs

    if (hs > awayScore) {
      home.w++; home.pts += 3; away.l++
    } else if (hs < awayScore) {
      away.w++; away.pts += 3; home.l++
    } else {
      home.d++; home.pts++; away.d++; away.pts++
    }
  }

  const result: Record<string, TeamStats[]> = {}
  for (const [g, teams] of Object.entries(groups)) {
    result[g] = Object.values(teams).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts
      const gdA = a.gf - a.ga, gdB = b.gf - b.ga
      if (gdB !== gdA) return gdB - gdA
      if (b.gf !== a.gf) return b.gf - a.gf
      return a.team.localeCompare(b.team)
    })
  }
  return result
}

export default async function GroupesPage() {
  const cookieStore = await cookies()
  const rawLang = cookieStore.get('prono_lang')?.value
  const lang: Lang = rawLang === 'fr' || rawLang === 'en' ? rawLang : 'fr'
  const t = T[lang]

  const supabase = await createClient()

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('stage', 'group')
    .order('match_date', { ascending: true })

  const allMatches = (matches ?? []) as Match[]

  if (allMatches.length === 0) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <p className="text-4xl mb-4">📊</p>
        <p className="text-base font-semibold text-gray-300">{t.empty}</p>
        <p className="text-sm text-gray-600 mt-2">{t.emptyHint}</p>
      </div>
    )
  }

  const standings = computeStandings(allMatches)
  const sortedGroups = Object.keys(standings).sort()

  const matchesByGroup: Record<string, Match[]> = {}
  for (const m of allMatches) {
    const g = m.group_name ?? ''
    if (!matchesByGroup[g]) matchesByGroup[g] = []
    matchesByGroup[g].push(m)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">{t.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{t.subtitle}</p>
      </div>

      {sortedGroups.map(groupName => {
        const rows = standings[groupName]
        const groupMatches = matchesByGroup[groupName] ?? []
        const finishedMatches = groupMatches.filter(m => m.status === 'finished')
        const scheduledMatches = groupMatches.filter(m => m.status !== 'finished')

        return (
          <section key={groupName} className="space-y-2">

            {/* Group header */}
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gray-800" />
              <span className="text-xs font-extrabold uppercase tracking-widest text-gray-400 px-2">
                {t.group} {groupName}
              </span>
              <div className="h-px flex-1 bg-gray-800" />
            </div>

            {/* Standings table */}
            <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">

              {/* Column headers */}
              <div className="flex items-center gap-1 border-b border-gray-800 px-3 py-2">
                <div className="w-5 text-center text-[9px] font-bold uppercase tracking-wide text-gray-600">#</div>
                <div className="flex-1 pl-8 text-[9px] font-bold uppercase tracking-wide text-gray-600">{t.team}</div>
                <div className="w-6 text-center text-[9px] font-bold uppercase tracking-wide text-gray-600">{t.played}</div>
                <div className="w-6 text-center text-[9px] font-bold uppercase tracking-wide text-gray-600">{t.won}</div>
                <div className="w-6 text-center text-[9px] font-bold uppercase tracking-wide text-gray-600">{t.drawn}</div>
                <div className="w-6 text-center text-[9px] font-bold uppercase tracking-wide text-gray-600">{t.lost}</div>
                <div className="w-8 text-center text-[9px] font-bold uppercase tracking-wide text-gray-600">{t.diff}</div>
                <div className="w-8 text-center text-[9px] font-bold uppercase tracking-wide text-gray-600">{t.points}</div>
              </div>

              {/* Team rows */}
              {rows.map((team, idx) => {
                const qualifies = idx < 2
                const gd = team.gf - team.ga
                const flagCode = team.flag ?? ''
                return (
                  <div
                    key={team.team}
                    className={`flex items-center gap-1 px-3 py-2.5 border-b border-gray-800/50 last:border-0 ${
                      qualifies ? 'bg-green-950/10' : ''
                    }`}
                  >
                    <div className={`w-5 text-center text-xs font-bold ${qualifies ? 'text-green-500' : 'text-gray-600'}`}>
                      {idx + 1}
                    </div>
                    <div className="flex flex-1 items-center gap-1.5 pl-1 min-w-0">
                      {flagCode
                        ? <img src={flagUrl(flagCode)} alt={team.team} className="h-4 w-6 rounded-sm object-cover shrink-0" />
                        : <div className="h-4 w-6 rounded-sm bg-gray-800 shrink-0" />}
                      <span className="text-xs font-semibold text-white truncate">{team.team}</span>
                    </div>
                    <div className="w-6 text-center text-xs text-gray-400">{team.gp}</div>
                    <div className="w-6 text-center text-xs text-gray-400">{team.w}</div>
                    <div className="w-6 text-center text-xs text-gray-400">{team.d}</div>
                    <div className="w-6 text-center text-xs text-gray-400">{team.l}</div>
                    <div className={`w-8 text-center text-xs font-semibold ${
                      gd > 0 ? 'text-green-400' : gd < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {gd > 0 ? `+${gd}` : gd}
                    </div>
                    <div className={`w-8 text-center text-sm font-extrabold ${qualifies ? 'text-white' : 'text-gray-300'}`}>
                      {team.pts}
                    </div>
                  </div>
                )
              })}

              {/* Legend */}
              <div className="flex items-center gap-1.5 border-t border-gray-800/50 px-3 py-2">
                <div className="h-2 w-2 rounded-sm bg-green-900/60" />
                <span className="text-[9px] text-gray-600">{t.qualify}</span>
              </div>
            </div>

            {/* Finished matches */}
            {finishedMatches.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
                {finishedMatches.map((m, i) => (
                  <div
                    key={m.id}
                    className={`flex items-center gap-2 px-3 py-2.5 ${
                      i < finishedMatches.length - 1 ? 'border-b border-gray-800/50' : ''
                    }`}
                  >
                    {m.home_flag
                      ? <img src={flagUrl(m.home_flag)} alt={m.home_team} className="h-4 w-6 rounded-sm object-cover shrink-0" />
                      : <div className="h-4 w-6 rounded-sm bg-gray-800 shrink-0" />}
                    <span className="flex-1 truncate text-xs font-semibold text-white">{m.home_team}</span>
                    <span className="shrink-0 font-mono text-sm font-extrabold text-white px-3">
                      {m.home_score} – {m.away_score}
                    </span>
                    <span className="flex-1 truncate text-right text-xs font-semibold text-white">{m.away_team}</span>
                    {m.away_flag
                      ? <img src={flagUrl(m.away_flag)} alt={m.away_team} className="h-4 w-6 rounded-sm object-cover shrink-0" />
                      : <div className="h-4 w-6 rounded-sm bg-gray-800 shrink-0" />}
                  </div>
                ))}
              </div>
            )}

            {/* Scheduled matches */}
            {scheduledMatches.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-gray-800/40 bg-gray-900/40">
                {scheduledMatches.map((m, i) => (
                  <div
                    key={m.id}
                    className={`flex items-center gap-2 px-3 py-2.5 ${
                      i < scheduledMatches.length - 1 ? 'border-b border-gray-800/30' : ''
                    }`}
                  >
                    {m.home_flag
                      ? <img src={flagUrl(m.home_flag)} alt={m.home_team} className="h-4 w-6 rounded-sm object-cover shrink-0 opacity-50" />
                      : <div className="h-4 w-6 rounded-sm bg-gray-800 shrink-0 opacity-50" />}
                    <span className="flex-1 truncate text-xs text-gray-500">{m.home_team}</span>
                    <span className="shrink-0 text-[10px] text-gray-600 px-2">{formatMatchDate(m.match_date, lang)}</span>
                    <span className="flex-1 truncate text-right text-xs text-gray-500">{m.away_team}</span>
                    {m.away_flag
                      ? <img src={flagUrl(m.away_flag)} alt={m.away_team} className="h-4 w-6 rounded-sm object-cover shrink-0 opacity-50" />
                      : <div className="h-4 w-6 rounded-sm bg-gray-800 shrink-0 opacity-50" />}
                  </div>
                ))}
              </div>
            )}

          </section>
        )
      })}
    </div>
  )
}
