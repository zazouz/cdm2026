'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from './LanguageProvider'
import { NAV_LABELS } from '@/lib/i18n'

export default function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  const { lang } = useLanguage()

  const tabs = [
    { href: '/matches', icon: '⚽', label: NAV_LABELS.matches[lang] },
    { href: '/mes-pronos', icon: '📋', label: NAV_LABELS.pronos[lang] },
    { href: '/groupes', icon: '📊', label: NAV_LABELS.groupes[lang] },
    { href: '/leaderboard', icon: '🏆', label: NAV_LABELS.leaderboard[lang] },
    ...(isAdmin ? [{ href: '/admin', icon: '⚙️', label: NAV_LABELS.admin[lang] }] : []),
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-gray-800 bg-gray-950/95 backdrop-blur-xl pb-safe">
      {tabs.map(tab => {
        const active = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5"
          >
            <span className={`text-xl leading-none transition-opacity ${active ? 'opacity-100' : 'opacity-40'}`}>
              {tab.icon}
            </span>
            <span className={`text-[10px] font-semibold uppercase tracking-wide transition-colors ${active ? 'text-green-500' : 'text-gray-500'}`}>
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
