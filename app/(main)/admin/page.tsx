import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminMatchList, { SyncButton, FetchAllOddsButton } from './AdminMatchList'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/matches')

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .order('match_date', { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Administration</h1>
      </div>

      {/* Actions globales */}
      <div className="bg-gray-900 rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Actions</h2>
        <div className="flex flex-wrap gap-4">
          <SyncButton />
          <FetchAllOddsButton />
        </div>
      </div>

      {/* Liste des matchs */}
      <AdminMatchList matches={matches ?? []} />
    </div>
  )
}

