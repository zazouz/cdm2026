'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()

  const tabs = [
    { href: '/matches', icon: '⚽', label: 'Matchs' },
    { href: '/mes-pronos', icon: '📋', label: 'Mes Pronos' },
    { href: '/leaderboard', icon: '🏆', label: 'Classement' },
    ...(isAdmin ? [{ href: '/admin', icon: '⚙️', label: 'Admin' }] : []),
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
