import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import NavBar from './NavBar'
import BottomNav from './BottomNav'
import { LanguageProvider } from './LanguageProvider'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('username, is_admin')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.is_admin ?? false

  return (
    <LanguageProvider>
      <div className="relative min-h-screen flex flex-col bg-gray-950">
        <div className="relative z-10 flex flex-col flex-1">
          <NavBar username={profile?.username ?? ''} isAdmin={isAdmin} />
          <main className="flex-1 mx-auto w-full max-w-lg px-4 py-5 pb-24">
            {children}
          </main>
          <BottomNav isAdmin={isAdmin} />
        </div>
      </div>
    </LanguageProvider>
  )
}
