'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { useLanguage } from './LanguageProvider'
import { NAV_LABELS } from '@/lib/i18n'

export default function NavBar({ username }: { username: string; isAdmin: boolean }) {
  const router = useRouter()
  const { lang, setLang } = useLanguage()

  function handleSetLang(l: 'fr' | 'en') {
    setLang(l)
    router.refresh()
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 flex h-12 items-center justify-between border-b border-gray-800 bg-gray-950/95 px-4">
      <img src="/logo-fifa-2026.jpg" alt="FIFA World Cup 2026" width={32} height={32} className="h-8 w-auto" />
      <div className="flex items-center gap-2">
        <div className="flex overflow-hidden rounded-full border border-gray-800 text-[10px] font-bold">
          <button
            onClick={() => handleSetLang('fr')}
            className={`flex items-center justify-center min-h-[44px] px-2.5 transition-colors ${lang === 'fr' ? 'bg-green-700 text-white' : 'bg-gray-900 text-gray-400 hover:text-gray-200'}`}
          >
            FR
          </button>
          <button
            onClick={() => handleSetLang('en')}
            className={`flex items-center justify-center min-h-[44px] px-2.5 transition-colors ${lang === 'en' ? 'bg-green-700 text-white' : 'bg-gray-900 text-gray-400 hover:text-gray-200'}`}
          >
            EN
          </button>
        </div>
        <span className="rounded-full border border-gray-800 bg-gray-900 px-3 py-1 font-mono text-[11px] text-gray-500">
          {username}
        </span>
        <button
          onClick={handleLogout}
          className="px-2 py-1 text-[11px] text-gray-500 transition-colors hover:text-red-400"
        >
          {NAV_LABELS.logout[lang]}
        </button>
      </div>
    </header>
  )
}
