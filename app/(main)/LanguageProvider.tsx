'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import type { Lang } from '@/lib/i18n'

type LanguageContextType = { lang: Lang; setLang: (l: Lang) => void }

const LanguageContext = createContext<LanguageContextType>({ lang: 'fr', setLang: () => {} })

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr')

  useEffect(() => {
    const stored = localStorage.getItem('prono_lang') as Lang | null
    if (stored === 'fr' || stored === 'en') setLangState(stored)
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('prono_lang', l)
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
