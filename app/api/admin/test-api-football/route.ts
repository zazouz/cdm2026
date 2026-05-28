import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  return data?.is_admin ?? false
}

export async function GET(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Interdit' }, { status: 403 })

  const key = process.env.API_FOOTBALL_KEY
  if (!key) return NextResponse.json({ error: 'API_FOOTBALL_KEY manquant' }, { status: 500 })

  const res = await fetch('https://v3.football.api-sports.io/fixtures?league=1&season=2026', {
    headers: { 'x-apisports-key': key },
    next: { revalidate: 0 },
  })

  const quota = {
    remaining: res.headers.get('x-ratelimit-requests-remaining'),
    limit: res.headers.get('x-ratelimit-requests-limit'),
  }

  if (!res.ok) {
    return NextResponse.json({ error: `API-Football ${res.status}`, quota }, { status: 502 })
  }

  const data = await res.json() as { results: number; response: unknown[] }

  return NextResponse.json({
    ok: true,
    fixtures_count: data.results,
    quota,
    sample: data.response?.slice(0, 2), // 2 premiers matchs pour vérifier la structure
  })
}
