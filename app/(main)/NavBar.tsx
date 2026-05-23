'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { useLanguage } from './LanguageProvider'

export default function NavBar({ username }: { username: string; isAdmin: boolean }) {
  const router = useRouter()
  const { lang, setLang } = useLanguage()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 flex h-12 items-center justify-between border-b border-gray-800 bg-gray-950/90 px-4 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-sm font-extrabold tracking-tight text-white">
        <span className="text-lg leading-none">⚽</span>
        CDM 2026
      </div>
      <div className="flex items-center gap-2">
        <div className="flex overflow-hidden rounded-full border border-gray-800 text-[10px] font-bold">
          <button
            onClick={() => setLang('fr')}
            className={`px-2.5 py-1 transition-colors ${lang === 'fr' ? 'bg-green-700 text-white' : 'bg-gray-900 text-gray-500 hover:text-gray-300'}`}
          >
            FR
          </button>
          <button
            onClick={() => setLang('en')}
            className={`px-2.5 py-1 transition-colors ${lang === 'en' ? 'bg-green-700 text-white' : 'bg-gray-900 text-gray-500 hover:text-gray-300'}`}
          >
            EN
          </button>
        </div>
        <span className="rounded-full border border-gray-800 bg-gray-900 px-3 py-1 font-mono text-[11px] text-gray-500">
          {username}
        </span>
        <button
          onClick={handleLogout}
          className="px-2 py-1 text-[11px] text-gray-600 transition-colors hover:text-red-400"
        >
          Déco
        </button>
      </div>
    </header>
  )
}
