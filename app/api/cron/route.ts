import { NextRequest, NextResponse } from 'next/server'

// Vercel Cron Job - toutes les 2 heures
// vercel.json configure la fréquence et l'URL
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET non configuré' }, { status: 500 })
  }

  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) {
    return NextResponse.json({ error: 'ADMIN_SECRET non configuré' }, { status: 500 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Interdit' }, { status: 401 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!baseUrl) return NextResponse.json({ error: 'APP_URL manquant' }, { status: 500 })

  const res = await fetch(`${baseUrl}/api/admin/sync-matches`, {
    method: 'POST',
    headers: { 'x-admin-secret': adminSecret },
  })

  const data = await res.json()
  return NextResponse.json(data)
}
