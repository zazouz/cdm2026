import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase-server'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  return data?.is_admin ?? false
}

export async function POST(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Interdit' }, { status: 403 })

  const { matchId } = await req.json()
  if (!matchId) return NextResponse.json({ error: 'matchId requis' }, { status: 400 })

  const supabase = await createAdminClient()

  const { error: matchError } = await supabase
    .from('matches')
    .update({
      home_score: null,
      away_score: null,
      status: 'scheduled',
      score_source: null,
      score_confirmed: false,
      score_needs_review: false,
      score_review_reason: null,
      score_period: 'regular_time',
      score_fetched_at: null,
    })
    .eq('id', matchId)

  if (matchError) return NextResponse.json({ error: matchError.message }, { status: 500 })

  const { error: predError } = await supabase
    .from('predictions')
    .update({ points_earned: null, calculated_at: null })
    .eq('match_id', matchId)

  if (predError) return NextResponse.json({ error: predError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
