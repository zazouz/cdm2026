import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase-server'
import { computePoints } from '@/lib/scoring'
import { getFlag } from '@/lib/flags'
import { canonicalTeam, normalizeTeam } from '@/lib/teams'
import type { Match, Prediction } from '@/lib/types'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  return data?.is_admin ?? false
}

const STAGE_ORDER = ['group', 'r32', 'r16', 'qf', 'sf', 'third', 'final']
// Délai avant de tenter l'API-Football : 2h15 après le coup d'envoi
const AF_FALLBACK_DELAY_MS = (2 * 60 + 15) * 60 * 1000

// ─────────────────────────────────────────────────────────────────────────────
// Règle métier : le score du jeu est TOUJOURS le score à 90 minutes.
// Prolongations et tirs au but ne comptent jamais.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const secret =
    req.headers.get('x-admin-secret') ??
    req.headers.get('authorization')?.replace('Bearer ', '')
  const isAdminUser = await isAdmin()
  const adminSecret = process.env.ADMIN_SECRET
  if (!isAdminUser && !adminSecret) {
    return NextResponse.json({ error: 'ADMIN_SECRET non configuré' }, { status: 500 })
  }
  if (!isAdminUser && secret !== adminSecret) {
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
  console.log('[CDM2026][sync] start', { fdMatchCount: fdMatches.length, ts: new Date().toISOString() })

  const supabase = await createAdminClient()
  let created = 0, updated = 0, pointsCalculated = 0
  // IDs des matchs en DB qui ont besoin du fallback API-Football
  const needsFallback: number[] = []

  // ─── Phase 1 : calendrier + scores football-data ────────────────────────
  for (const fdMatch of fdMatches) {
    const homeTeam = fdMatch.homeTeam.name ?? 'TBD'
    const awayTeam = fdMatch.awayTeam.name ?? 'TBD'
    const stage = mapStage(fdMatch.stage)
    const groupName = fdMatch.group ? fdMatch.group.replace('GROUP_', '') : null
    const isFinished = fdMatch.status === 'FINISHED'

    const { data: existing } = await supabase
      .from('matches')
      .select('id, status, home_score, away_score, home_team, away_team, home_flag, away_flag, stage, match_date, score_source, score_confirmed, score_needs_review, api_football_fixture_id')
      .eq('fd_match_id', fdMatch.id)
      .maybeSingle()

    if (!existing) {
      const rtScore = isFinished ? extractFDRegularScore(fdMatch) : null
      const canScore = rtScore !== null
      await supabase.from('matches').insert({
        home_team: homeTeam,
        away_team: awayTeam,
        home_flag: getFlag(homeTeam),
        away_flag: getFlag(awayTeam),
        match_date: fdMatch.utcDate,
        stage,
        group_name: groupName,
        fd_match_id: fdMatch.id,
        status: canScore ? 'finished' : 'scheduled',
        ...(canScore && {
          home_score: rtScore!.home,
          away_score: rtScore!.away,
          score_source: 'football_data',
          score_confirmed: true,
          score_needs_review: false,
          score_period: 'regular_time',
          score_fetched_at: new Date().toISOString(),
        }),
      })
      created++
      continue
    }

    const teamsChanged = existing.home_team !== homeTeam || existing.away_team !== awayTeam
    const wrongFlag = existing.home_flag !== getFlag(homeTeam) || existing.away_flag !== getFlag(awayTeam)
    const wrongStage = existing.stage !== stage
    const metaChanged = teamsChanged || wrongFlag || wrongStage
    const metaUpdate = metaChanged ? { home_team: homeTeam, away_team: awayTeam, home_flag: getFlag(homeTeam), away_flag: getFlag(awayTeam), stage } : {}

    // Ne jamais toucher au score si source manuelle
    if (existing.score_source === 'manual') {
      if (metaChanged) {
        await supabase.from('matches').update(metaUpdate).eq('id', existing.id)
        updated++
      }
      continue
    }

    if (isFinished) {
      const rtScore = extractFDRegularScore(fdMatch)

      if (rtScore === null) {
        // football-data FINISHED mais pas de score 90min exploitable
        if (existing.status !== 'finished') {
          const reviewReason = `football-data FINISHED (${fdMatch.score.duration ?? '?'}) sans score regularTime exploitable`
          await supabase.from('matches').update({
            ...metaUpdate,
            score_needs_review: true,
            score_review_reason: reviewReason,
          }).eq('id', existing.id)
          console.warn('[CDM2026][sync] no-regular-score', { matchId: existing.id, duration: fdMatch.score.duration })
          // Ajoute au fallback : API-Football peut avoir le score à 90min
          needsFallback.push(existing.id)
          updated++
        }
        continue
      }

      if (existing.status === 'finished' && existing.score_confirmed) {
        // Déjà confirmé par football-data, juste mise à jour méta si besoin
        if (metaChanged) {
          await supabase.from('matches').update(metaUpdate).eq('id', existing.id)
          updated++
        }
        continue
      }

      if (existing.status === 'finished' && !existing.score_confirmed && existing.score_source === 'api_football') {
        // Confirmation football-data d'un score provisoire api_football
        if (existing.home_score === rtScore.home && existing.away_score === rtScore.away) {
          await supabase.from('matches').update({
            ...metaUpdate,
            score_source: 'football_data',
            score_confirmed: true,
            score_needs_review: false,
            score_review_reason: null,
            score_fetched_at: new Date().toISOString(),
          }).eq('id', existing.id)
          console.log('[CDM2026][sync] confirmed', { matchId: existing.id, score: `${rtScore.home}-${rtScore.away}` })
        } else {
          const reviewReason = `Conflit : football-data ${rtScore.home}-${rtScore.away} vs api_football ${existing.home_score}-${existing.away_score}`
          await supabase.from('matches').update({
            score_needs_review: true,
            score_review_reason: reviewReason,
          }).eq('id', existing.id)
          // Reset les points : le classement ne doit pas conserver un score contesté
          await supabase.from('predictions').update({
            points_earned: null,
            calculated_at: null,
          }).eq('match_id', existing.id)
          console.warn('[CDM2026][sync] CONFLICT — points reset', { matchId: existing.id, reviewReason })
        }
        updated++
        continue
      }

      if (existing.status !== 'finished') {
        // Premier score depuis football-data
        await supabase.from('matches').update({
          ...metaUpdate,
          home_score: rtScore.home,
          away_score: rtScore.away,
          status: 'finished',
          score_source: 'football_data',
          score_confirmed: true,
          score_needs_review: false,
          score_period: 'regular_time',
          score_fetched_at: new Date().toISOString(),
        }).eq('id', existing.id)
        updated++
      }
    } else {
      // Match non terminé — mise à jour méta si besoin
      if (metaChanged) {
        await supabase.from('matches').update(metaUpdate).eq('id', existing.id)
        updated++
      }
    }
  }

  // ─── Phase 2 : collecter les matchs scheduled > 2h15 sans score ─────────
  const cutoff = new Date(Date.now() - AF_FALLBACK_DELAY_MS).toISOString()
  const { data: pendingOld } = await supabase
    .from('matches')
    .select('id')
    .eq('status', 'scheduled')
    .lt('match_date', cutoff)

  for (const m of (pendingOld ?? [])) {
    if (!needsFallback.includes(m.id)) needsFallback.push(m.id)
  }

  // ─── Phase 3 : fallback API-Football si nécessaire ─────────────────────
  let afProcessed = 0
  if (needsFallback.length > 0) {
    afProcessed = await apiFallback(supabase, needsFallback)
  }

  // ─── Phase 4 : calcul des points (sweep global) ─────────────────────────
  const { data: finishedWithOdds } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'finished')
    .not('home_odds', 'is', null)

  for (const matchRow of (finishedWithOdds ?? []) as Match[]) {
    if (matchRow.score_needs_review) continue // ne pas scorer un match en attente de validation
    const { data: pending } = await supabase
      .from('predictions')
      .select('*')
      .eq('match_id', matchRow.id)
      .is('calculated_at', null)

    for (const pred of (pending ?? []) as Prediction[]) {
      const points = computePoints(matchRow, pred)
      await supabase.from('predictions').update({
        points_earned: points,
        calculated_at: new Date().toISOString(),
      }).eq('id', pred.id)
      pointsCalculated++
    }
  }

  // ─── Phase 5 : auto-fetch des cotes si phase suivante débloquée ─────────
  const oddsAutoFetched = await autoFetchOddsIfNeeded(supabase)

  // Matchs/scores/cotes ont pu changer : invalide les données impersonnelles cachées.
  revalidateTag('matches', 'max')
  revalidateTag('scores', 'max')

  console.log('[CDM2026][sync] done', { created, updated, pointsCalculated, afProcessed, oddsAutoFetched })
  return NextResponse.json({ ok: true, created, updated, pointsCalculated, afProcessed, oddsAutoFetched })
}

// ─────────────────────────────────────────────────────────────────────────────
// Extraction du score à 90 minutes depuis football-data
// Priorité : regularTime → fullTime si duration === REGULAR
// ─────────────────────────────────────────────────────────────────────────────
function extractFDRegularScore(fdMatch: FDMatch): { home: number; away: number } | null {
  const rt = fdMatch.score.regularTime
  if (rt) {
    // La doc montre deux variantes historiques des noms de champs
    const home = rt.home ?? (rt as Record<string, unknown>).homeTeam
    const away = rt.away ?? (rt as Record<string, unknown>).awayTeam
    if (typeof home === 'number' && typeof away === 'number') return { home, away }
  }
  // Si durée = REGULAR, fullTime === score 90min
  if (fdMatch.score.duration === 'REGULAR') {
    const { home, away } = fdMatch.score.fullTime
    if (typeof home === 'number' && typeof away === 'number') return { home, away }
  }
  // EXTRA_TIME ou PENALTY_SHOOTOUT sans regularTime : on ne peut pas scorer en sécurité
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback API-Football
// ─────────────────────────────────────────────────────────────────────────────
async function apiFallback(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  matchIds: number[]
): Promise<number> {
  const afKey = process.env.API_FOOTBALL_KEY
  if (!afKey) return 0

  // Un seul appel batch pour tous les matchs WC 2026
  const res = await fetch('https://v3.football.api-sports.io/fixtures?league=1&season=2026', {
    headers: { 'x-apisports-key': afKey },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    console.warn('[CDM2026][sync] api-football erreur', res.status)
    return 0
  }

  const data = await res.json() as { response: AFFixture[] }
  const afFixtures = data.response ?? []

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .in('id', matchIds)

  let processed = 0

  for (const match of (matches ?? []) as Match[]) {
    if (match.score_source === 'manual') continue

    const afFixture = match.api_football_fixture_id
      ? afFixtures.find(f => f.fixture.id === match.api_football_fixture_id)
      : findAFMatch(afFixtures, match.home_team, match.away_team, match.match_date)

    if (!afFixture) continue

    const score = extractAFRegularScore(afFixture)
    if (!score) continue

    // Déjà scoré via api_football avec le même score → ne rien faire
    if (match.score_source === 'api_football' && match.home_score === score.home && match.away_score === score.away) continue

    await supabase.from('matches').update({
      home_score: score.home,
      away_score: score.away,
      status: 'finished',
      score_source: 'api_football',
      score_confirmed: false,
      score_needs_review: false,
      score_period: 'regular_time',
      score_fetched_at: new Date().toISOString(),
      api_football_fixture_id: afFixture.fixture.id,
    }).eq('id', match.id)

    console.log('[CDM2026][sync] af-fallback saved', {
      matchId: match.id, score: `${score.home}-${score.away}`, afStatus: afFixture.fixture.status.short,
    })
    processed++
  }

  return processed
}

// ─────────────────────────────────────────────────────────────────────────────
// Extraction score 90min depuis API-Football
// On utilise score.fulltime pour FT, AET, PEN, ET, BT, P
// On n'utilise jamais extratime, penalty ni goals
// ─────────────────────────────────────────────────────────────────────────────
function extractAFRegularScore(fixture: AFFixture): { home: number; away: number } | null {
  const status = fixture.fixture.status.short
  if (!['FT', 'AET', 'PEN', 'ET', 'BT', 'P'].includes(status)) return null
  const { home, away } = fixture.score.fulltime
  if (typeof home === 'number' && typeof away === 'number') return { home, away }
  return null
}

function findAFMatch(fixtures: AFFixture[], homeTeam: string, awayTeam: string, matchDate: string): AFFixture | undefined {
  const canon = canonicalTeam
  const homeNorm = canon(homeTeam)
  const awayNorm = canon(awayTeam)
  const matchDateMs = new Date(matchDate).getTime()
  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000

  return fixtures.find(f => {
    const h = canon(f.teams.home.name)
    const a = canon(f.teams.away.name)
    const nameMatch =
      (h.includes(homeNorm.slice(0, 4)) || homeNorm.includes(h.slice(0, 4))) &&
      (a.includes(awayNorm.slice(0, 4)) || awayNorm.includes(a.slice(0, 4)))
    return nameMatch && Math.abs(new Date(f.fixture.date).getTime() - matchDateMs) < TWO_DAYS_MS
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Auto-fetch des cotes : au plus une fois toutes les 4h (quota 500/mois)
// Le sync tourne toutes les 30min — on n'appelle The Odds API que lors des
// syncs tombant dans la première demi-heure d'un bloc de 4h UTC (0h,4h,8h…)
// → max 6 appels/jour × 30 jours = 180 crédits sur les tours à élimination.
// ─────────────────────────────────────────────────────────────────────────────
async function autoFetchOddsIfNeeded(supabase: Awaited<ReturnType<typeof createAdminClient>>): Promise<string | null> {
  const oddsApiKey = process.env.ODDS_API_KEY
  if (!oddsApiKey) return null

  const { data: needsOdds } = await supabase
    .from('matches')
    .select('id, stage, match_date, home_team, away_team')
    .is('home_odds', null)
    .eq('status', 'scheduled')
    .not('home_team', 'ilike', '%TBD%')
    .not('away_team', 'ilike', '%TBD%')

  if (!needsOdds || needsOdds.length === 0) return null

  const stagesNeedingOdds = [...new Set(needsOdds.map(m => m.stage))]
    .sort((a, b) => STAGE_ORDER.indexOf(a) - STAGE_ORDER.indexOf(b))

  // Hors phase de groupes : dès qu'un match a des équipes connues sans côtes, on tente le fetch.
  // L'API retourne ce qui est dispo ; si rien n'est encore publié elle répond vide.
  if (stagesNeedingOdds.some(s => s !== 'group')) {
    // Throttle : uniquement dans la première demi-heure d'un bloc de 4h UTC
    const now = new Date()
    const inFetchWindow = now.getUTCHours() % 4 === 0 && now.getUTCMinutes() < 30
    if (!inFetchWindow) return 'odds_throttled'
    return await triggerOddsFetch(supabase)
  }

  // Groupes : fetch si on est à moins de 14 jours du premier match
  const firstMatchDate = needsOdds
    .filter(m => m.stage === 'group')
    .map(m => new Date(m.match_date).getTime())
    .sort()[0]
  if ((firstMatchDate - Date.now()) / (1000 * 60 * 60 * 24) <= 14) {
    return await triggerOddsFetch(supabase)
  }

  return null
}

async function triggerOddsFetch(supabase: Awaited<ReturnType<typeof createAdminClient>>): Promise<string> {
  const apiKey = process.env.ODDS_API_KEY!
  const base = `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds?apiKey=${apiKey}&markets=h2h&oddsFormat=decimal`

  const eu = await fetch(`${base}&regions=eu`, { next: { revalidate: 0 } })
  if (!eu.ok) return 'odds_api_error'

  const events = await eu.json() as OddsApiEvent[]
  if (!events.some(e => e.bookmakers.length > 0)) return 'no_odds_available'

  const canon = canonicalTeam
  const normalize = normalizeTeam
  const DAY_MS = 2 * 24 * 60 * 60 * 1000
  let updatedOdds = 0

  // ── Matchs TBD : correspondance par horaire exact ───────────────────────
  // Football-data est parfois en retard sur les noms d'équipes à élimination
  // directe. On récupère équipes + côtes depuis The Odds API en matchant sur
  // l'heure FIFA exacte (±1h) déjà connue en base.
  const { data: tbdMatches } = await supabase
    .from('matches')
    .select('id, match_date')
    .eq('home_team', 'TBD')
    .eq('status', 'scheduled')

  const ONE_HOUR_MS = 60 * 60 * 1000
  for (const tbd of (tbdMatches ?? [])) {
    const tbdTime = new Date(tbd.match_date).getTime()
    const event = events.find(e => Math.abs(new Date(e.commence_time).getTime() - tbdTime) < ONE_HOUR_MS)
    if (!event) continue
    const bookmaker =
      event.bookmakers.find((b: BookmakerEntry) => b.key === 'betclic_fr' && b.markets.some(m => m.key === 'h2h'))
      ?? event.bookmakers.find((b: BookmakerEntry) => b.markets.some(m => m.key === 'h2h'))
    if (!bookmaker) continue
    const h2h = bookmaker.markets.find(m => m.key === 'h2h')
    if (!h2h) continue
    const homeOdds = h2h.outcomes.find(o => normalize(o.name) === normalize(event.home_team))?.price
    const awayOdds = h2h.outcomes.find(o => normalize(o.name) === normalize(event.away_team))?.price
    const drawOdds = h2h.outcomes.find(o => o.name === 'Draw')?.price
    if (!homeOdds || !awayOdds || !drawOdds) continue
    await supabase.from('matches').update({
      home_team: event.home_team,
      away_team: event.away_team,
      home_flag: getFlag(event.home_team),
      away_flag: getFlag(event.away_team),
      home_odds: Math.round(homeOdds * 100) / 100,
      draw_odds: Math.round(drawOdds * 100) / 100,
      away_odds: Math.round(awayOdds * 100) / 100,
      odds_fetched_at: new Date().toISOString(),
      odds_bookmaker: bookmaker.key,
    }).eq('id', tbd.id)
    updatedOdds++
  }

  const { data: matchesWithoutOdds } = await supabase
    .from('matches')
    .select('id, home_team, away_team, match_date')
    .is('home_odds', null)
    .eq('status', 'scheduled')
    .not('home_team', 'ilike', '%TBD%')
    .not('away_team', 'ilike', '%TBD%')

  if (!matchesWithoutOdds) return `fetched_${updatedOdds}_odds`

  for (const match of matchesWithoutOdds) {
    const homeNorm = canon(match.home_team)
    const awayNorm = canon(match.away_team)
    const matchDateMs = new Date(match.match_date).getTime()

    const event = events.find(e => {
      const h = canon(e.home_team)
      const a = canon(e.away_team)
      const nameMatch =
        (h.includes(homeNorm.slice(0, 4)) || homeNorm.includes(h.slice(0, 4))) &&
        (a.includes(awayNorm.slice(0, 4)) || awayNorm.includes(a.slice(0, 4)))
      return nameMatch && Math.abs(new Date(e.commence_time).getTime() - matchDateMs) < DAY_MS
    })

    if (!event) continue
    const bookmaker =
      event.bookmakers.find((b: BookmakerEntry) => b.key === 'betclic_fr' && b.markets.some(m => m.key === 'h2h'))
      ?? event.bookmakers.find((b: BookmakerEntry) => b.markets.some(m => m.key === 'h2h'))
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
      odds_bookmaker: bookmaker.key,
    }).eq('id', match.id)
    updatedOdds++
  }

  return `fetched_${updatedOdds}_odds`
}

function mapStage(fdStage: string): string {
  const map: Record<string, string> = {
    GROUP_STAGE: 'group', ROUND_OF_32: 'r32', LAST_32: 'r32',
    ROUND_OF_16: 'r16', LAST_16: 'r16',
    QUARTER_FINAL: 'qf', QUARTER_FINALS: 'qf',
    SEMI_FINAL: 'sf', SEMI_FINALS: 'sf',
    THIRD_PLACE: 'third', FINAL: 'final',
  }
  return map[fdStage] ?? 'group'
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type FDMatch = {
  id: number
  utcDate: string
  status: string
  stage: string
  group: string | null
  homeTeam: { id: number; name: string | null }
  awayTeam: { id: number; name: string | null }
  score: {
    duration: 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT' | null
    fullTime: { home: number | null; away: number | null }
    regularTime?: { home?: number | null; away?: number | null }
    extraTime?: { home: number | null; away: number | null }
    penalties?: { home: number | null; away: number | null }
  }
}

type AFFixture = {
  fixture: {
    id: number
    date: string
    status: { short: string; elapsed: number | null }
  }
  teams: {
    home: { id: number; name: string }
    away: { id: number; name: string }
  }
  score: {
    fulltime: { home: number | null; away: number | null }
    extratime: { home: number | null; away: number | null }
    penalty: { home: number | null; away: number | null }
  }
}

type OddsApiEvent = {
  id: string
  home_team: string
  away_team: string
  commence_time: string
  bookmakers: BookmakerEntry[]
}

type BookmakerEntry = {
  key: string
  markets: Array<{ key: string; outcomes: Array<{ name: string; price: number }> }>
}
