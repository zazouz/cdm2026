import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { matchId, predictedHome, predictedAway } = await req.json()
  if (typeof predictedHome !== 'number' || typeof predictedAway !== 'number') {
    return NextResponse.json({ error: 'Scores invalides' }, { status: 400 })
  }
  if (
    !Number.isInteger(matchId) ||
    !Number.isInteger(predictedHome) ||
    !Number.isInteger(predictedAway) ||
    predictedHome < 0 ||
    predictedAway < 0 ||
    predictedHome > 20 ||
    predictedAway > 20
  ) {
    return NextResponse.json({ error: 'Scores invalides' }, { status: 400 })
  }

  // Vérifie que le match existe et n'a pas commencé
  const { data: match } = await supabase
    .from('matches')
    .select('id, match_date, status')
    .eq('id', matchId)
    .single()

  if (!match) return NextResponse.json({ error: 'Match introuvable' }, { status: 404 })
  if (match.status === 'finished' || new Date(match.match_date).getTime() - 15 * 60 * 1000 <= Date.now()) {
    return NextResponse.json({ error: 'Pronostic fermé' }, { status: 403 })
  }

  const { error } = await supabase.from('predictions').upsert({
    user_id: user.id,
    match_id: matchId,
    predicted_home: predictedHome,
    predicted_away: predictedAway,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,match_id' })

  if (error) {
    console.error('[CDM2026][prediction] upsert failed', { userId: user.id, matchId, error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  console.log('[CDM2026][prediction] saved', { userId: user.id, matchId, predictedHome, predictedAway })
  return NextResponse.json({ ok: true })
}
