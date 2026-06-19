import { redirect } from 'next/navigation'
import { getAuthUser, getProfile } from '@/lib/queries'
import NavBar from './NavBar'
import BottomNav from './BottomNav'
import { LanguageProvider } from './LanguageProvider'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const profile = await getProfile()
  const isAdmin = profile?.is_admin ?? false

  return (
    <LanguageProvider>
      <div className="relative min-h-screen flex flex-col">
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
