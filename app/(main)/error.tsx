'use client'

import { useLanguage } from './LanguageProvider'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { lang } = useLanguage()
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <p className="text-3xl">⚠️</p>
      <p className="text-base font-semibold text-gray-300">
        {lang === 'fr' ? 'Une erreur est survenue.' : 'Something went wrong.'}
      </p>
      <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
        {lang === 'fr'
          ? 'Vérifie ta connexion et réessaie.'
          : 'Check your connection and try again.'}
      </p>
      <button
        onClick={reset}
        className="mt-2 rounded-full border border-gray-700 bg-gray-900 px-5 py-2 text-sm font-semibold text-green-400 hover:bg-gray-800 transition-colors"
      >
        {lang === 'fr' ? 'Réessayer' : 'Try again'}
      </button>
    </div>
  )
}
