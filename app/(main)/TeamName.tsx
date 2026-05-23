'use client'

import { useLanguage } from './LanguageProvider'
import { translateTeam } from '@/lib/i18n'

export function TeamName({ name }: { name: string }) {
  const { lang } = useLanguage()
  return <>{translateTeam(name, lang)}</>
}
