import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase-server'
import { computePoints } from '@/lib/scoring'
import { getFlag } from '@/lib/flags'
import type { Match, Prediction } from '@/lib/types'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  return data?.is_admin ?? false
}

const STAGE_ORDER = ['group', 'r32', 'r16', 'qf', 'sf', 'final']
const ODDS_AUTO_FETCH_DELAY_HOURS = 12

// Appelé par le cron Vercel (toutes les 2h) ou manuellement par l'admin.
// 1. Récupère les 104 matchs CDM depuis football-data.org, upserte tout.
// 2. Calcule les points pour les matchs qui viennent de se terminer.
// 3. Auto-fetch des côtes : 12h après la fin de chaque phase, si la suivante
//    a des matchs avec équipes réelles mais sans côtes.
export async function POST(req: NextRequest) {
  const secret =
    req.headers.get('x-admin-secret') ??
    req.headers.get('authorization')?.replace('Bearer ', '')
  const isAdminUser = await isAdmin()
  if (!isAdminUser && secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  }

  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'FOOTBALL_DATA_API_KEY manquant' }, { status: 500 })

  const fdRes = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
    headers: { 'X-Auth-Token': apiKey },
    next: { revalidate: 0 },
  })

  if (!fdRes.ok) {
    return NextResponse.json({ error: `football-data.org erreur ${fdRes.status}` }, { status: 502 })
  }

  const fdData = await fdRes.json() as { matches: FDMatch[] }
  const fdMatches = fdData.matches ?? []

  const supabase = await createAdminClient()
  let created = 0
  let updated = 0
  let pointsCalculated = 0

  for (const fdMatch of fdMatches) {
    const homeTeam = fdMatch.homeTeam.name ?? 'TBD'
    const awayTeam = fdMatch.awayTeam.name ?? 'TBD'
    const stage = mapStage(fdMatch.stage)
    const groupName = fdMatch.group ? fdMatch.group.replace('GROUP_', '') : null
    const isFinished = fdMatch.status === 'FINISHED'
    const hasScore =
      fdMatch.score.fullTime.home !== null &&
      fdMatch.score.fullTime.away !== null

    // Cherche si ce match est déjà en DB
    const { data: existing } = await supabase
      .from('matches')
      .select('id, status, home_score, away_score, home_team, away_team, home_flag, away_flag, stage')
      .eq('fd_match_id', fdMatch.id)
      .maybeSingle()

    if (!existing) {
      // Crée le match
      await supabase.from('matches').insert({
        home_team: homeTeam,
        away_team: awayTeam,
        home_flag: getFlag(homeTeam),
        away_flag: getFlag(awayTeam),
        match_date: fdMatch.utcDate,
        stage,
        group_name: groupName,
        status: isFinished && hasScore ? 'finished' : 'scheduled',
        home_score: isFinished ? fdMatch.score.fullTime.home : null,
        away_score: isFinished ? fdMatch.score.fullTime.away : null,
        fd_match_id: fdMatch.id,
      })
      created++
    } else {
      // Met à jour si les équipes ont changé (TBD → nom réel) ou si le match vient de se terminer
      const teamsChanged = existing.home_team !== homeTeam || existing.away_team !== awayTeam
      const justFinished = isFinished && hasScore && existing.status !== 'finished'
      const wrongFlag = existing.home_flag !== getFlag(homeTeam) || existing.away_flag !== getFlag(awayTeam)
      const wrongStage = existing.stage !== stage

      if (teamsChanged || justFinished || wrongFlag || wrongStage) {
        await supabase.from('matches').update({
          home_team: homeTeam,
          away_team: awayTeam,
          home_flag: getFlag(homeTeam),
          away_flag: getFlag(awayTeam),
          stage,
          ...(justFinished && {
            home_score: fdMatch.score.fullTime.home,
            away_score: fdMatch.score.fullTime.away,
            status: 'finished',
          }),
        }).eq('id', existing.id)
        updated++
      }

    }
  }

  // Sweep : calcule les points pour tout match terminé avec côtes mais pronos encore non calculés.
  // Couvre aussi le cas où un match s'est terminé sans côtes et les côtes sont arrivées après.
  const { data: finishedWithOdds } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'finished')
    .not('home_odds', 'is', null)

  for (const matchRow of (finishedWithOdds ?? []) as Match[]) {
    const { data: pending } = await supabase
      .from('predictions')
      .select('*')
      .eq('match_id', matchRow.id)
      .is('calculated_at', null)

    for (const pred of (pending ?? []) as Prediction[]) {
      const points = computePoints(matchRow as Match, pred)
      await supabase.from('predictions').update({
        points_earned: points,
        calculated_at: new Date().toISOString(),
      }).eq('id', pred.id)
      pointsCalculated++
    }
  }

  const oddsAutoFetched = await autoFetchOddsIfNeeded(supabase)

  return NextResponse.json({ ok: true, created, updated, pointsCalculated, oddsAutoFetched })
}

// Vérifie s'il faut déclencher un fetch automatique des côtes.
// Conditions : il existe une phase avec des matchs sans côtes + équipes réelles,
// ET la phase précédente est 100% terminée depuis plus de 12h.
// Pour la phase de groupes, les côtes sont disponibles avant le tournoi :
// on les fetche dès que les matchs existent et qu'on est à moins de 14 jours du premier match.
async function autoFetchOddsIfNeeded(supabase: Awaited<ReturnType<typeof createAdminClient>>): Promise<string | null> {
  const oddsApiKey = process.env.ODDS_API_KEY
  if (!oddsApiKey) return null

  // Matchs sans côtes, avec de vraies équipes, pas encore terminés
  const { data: needsOdds } = await supabase
    .from('matches')
    .select('id, stage, match_date, home_team, away_team, home_odds')
    .is('home_odds', null)
    .eq('status', 'scheduled')
    .not('home_team', 'ilike', '%TBD%')
    .not('away_team', 'ilike', '%TBD%')

  if (!needsOdds || needsOdds.length === 0) return null

  const stagesNeedingOdds = [...new Set(needsOdds.map(m => m.stage))]
    .sort((a, b) => STAGE_ORDER.indexOf(a) - STAGE_ORDER.indexOf(b))

  for (const stage of stagesNeedingOdds) {
    const stageIdx = STAGE_ORDER.indexOf(stage)

    if (stageIdx === 0) {
      // Phase de groupes : fetch si on est à moins de 14 jours du premier match
      const firstMatchDate = needsOdds
        .filter(m => m.stage === 'group')
        .map(m => new Date(m.match_date).getTime())
        .sort()[0]
      const daysUntilStart = (firstMatchDate - Date.now()) / (1000 * 60 * 60 * 24)
      if (daysUntilStart <= 14) {
        return await triggerOddsFetch(supabase)
      }
    } else {
      // Phase suivante : fetch si la phase précédente est terminée depuis >12h
      const previousStage = STAGE_ORDER[stageIdx - 1]
      const { data: prevMatches } = await supabase
        .from('matches')
        .select('status, match_date')
        .eq('stage', previousStage)

      if (!prevMatches || prevMatches.length === 0) continue

      const allFinished = prevMatches.every(m => m.status === 'finished')
      if (!allFinished) continue

      const lastMatchTime = Math.max(...prevMatches.map(m => new Date(m.match_date).getTime()))
      const hoursSinceLast = (Date.now() - lastMatchTime) / (1000 * 60 * 60)

      if (hoursSinceLast >= ODDS_AUTO_FETCH_DELAY_HOURS) {
        return await triggerOddsFetch(supabase)
      }
    }
  }

  return null
}

async function triggerOddsFetch(supabase: Awaited<ReturnType<typeof createAdminClient>>): Promise<string> {
  const apiKey = process.env.ODDS_API_KEY!
  const base = `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds?apiKey=${apiKey}&markets=h2h&oddsFormat=decimal`
  let events: OddsApiEvent[] = []

  const winamax = await fetch(`${base}&bookmakers=winamax_fr`, { next: { revalidate: 0 } })
  if (winamax.ok) events = await winamax.json()

  if (events.length === 0) {
    const eu = await fetch(`${base}&regions=eu`, { next: { revalidate: 0 } })
    if (eu.ok) events = await eu.json()
  }

  if (events.length === 0) return 'no_odds_available'

  const { data: matchesWithoutOdds } = await supabase
    .from('matches')
    .select('id, home_team, away_team, match_date')
    .is('home_odds', null)
    .eq('status', 'scheduled')
    .not('home_team', 'ilike', '%TBD%')
    .not('away_team', 'ilike', '%TBD%')

  if (!matchesWithoutOdds) return 'no_matches'

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
  const TEAM_ALIAS: Record<string, string> = {
    'usa': 'unitedstates', 'unitedstates': 'unitedstates',
    'irian': 'iran', 'korearep': 'southkorea', 'republicofkorea': 'southkorea',
    'dprkorea': 'northkorea', 'chinapr': 'china',
    'trinidadandtobago': 'trinidadtobago', 'trinidadtobago': 'trinidadtobago',
    'nz': 'newzealand', 'newzealand': 'newzealand',
  }
  const canon = (s: string) => { const n = normalize(s); return TEAM_ALIAS[n] ?? n }
  const DAY_MS = 24 * 60 * 60 * 1000
  let updated = 0

  for (const match of matchesWithoutOdds) {
    const homeNorm = canon(match.home_team)
    const awayNorm = canon(match.away_team)
    const dateMsTarget = new Date(match.match_date).getTime()

    const event = events.find(e => {
      const dateClose = Math.abs(new Date(e.commence_time).getTime() - dateMsTarget) < DAY_MS
      const h = canon(e.home_team)
      const a = canon(e.away_team)
      return dateClose &&
        (h.includes(homeNorm.slice(0, 4)) || homeNorm.includes(h.slice(0, 4))) &&
        (a.includes(awayNorm.slice(0, 4)) || awayNorm.includes(a.slice(0, 4)))
    })

    if (!event) continue
    const bookmaker = event.bookmakers[0]
    if (!bookmaker) continue
    const h2h = bookmaker.markets.find(m => m.key === 'h2h')
    if (!h2h) continue

    const homeOdds = h2h.outcomes.find(o => normalize(o.name) === normalize(event.home_team))?.price
    const awayOdds = h2h.outcomes.find(o => normalize(o.name) === normalize(event.away_team))?.price
    const drawOdds = h2h.outcomes.find(o => o.name === 'Draw')?.price
    if (!homeOdds || !awayOdds || !drawOdds) continue

    await supabase.from('matches').update({
      home_odds: Math.round(homeOdds * 100) / 100,
      draw_odds: Math.round(drawOdds * 100) / 100,
      away_odds: Math.round(awayOdds * 100) / 100,
      odds_fetched_at: new Date().toISOString(),
    }).eq('id', match.id)
    updated++
  }

  return `fetched_${updated}_odds`
}

type OddsApiEvent = {
  id: string
  home_team: string
  away_team: string
  commence_time: string
  bookmakers: Array<{
    key: string
    markets: Array<{
      key: string
      outcomes: Array<{ name: string; price: number }>
    }>
  }>
}

function mapStage(fdStage: string): string {
  const map: Record<string, string> = {
    GROUP_STAGE: 'group',
    ROUND_OF_32: 'r32',
    LAST_32: 'r32',
    ROUND_OF_16: 'r16',
    LAST_16: 'r16',
    QUARTER_FINAL: 'qf',
    QUARTER_FINALS: 'qf',
    SEMI_FINAL: 'sf',
    SEMI_FINALS: 'sf',
    THIRD_PLACE: 'final',
    FINAL: 'final',
  }
  return map[fdStage] ?? 'group'
}

type FDMatch = {
  id: number
  utcDate: string
  status: string
  stage: string
  group: string | null
  homeTeam: { id: number; name: string | null }
  awayTeam: { id: number; name: string | null }
  score: { fullTime: { home: number | null; away: number | null } }
}
