'use client'

export const dynamic = 'force-static'

import Link from 'next/link'
import { useState } from 'react'

const T = {
  fr: {
    subtitle: 'Pronostique tous les matchs. Les points se calculent sur les cotes bookmaker.',
    scoring: 'Barème des points',
    exact: 'Score exact',
    exactDesc: 'Bon score ET bon résultat',
    correct: 'Bon résultat',
    correctDesc: 'Victoire ou nul correct, score faux',
    wrong: 'Mauvais résultat',
    wrongDesc: 'Résultat incorrect',
    oddsNote: "La cote utilisée est celle du résultat que tu as prédit, figée au moment du match. Plus la surprise est grande, plus tu gagnes.",
    howTitle: 'Comment ça marche',
    step1: 'Prédit le score de chaque match avant le coup d\'envoi.',
    step2: 'Les pronos se verrouillent 15 min avant le match.',
    step3: 'Une fois le match commencé, consulte les pronos des autres dans "Les Pronos".',
    step4: 'Les points sont calculés automatiquement peu après la fin du match.',
    step5: 'Suis ton score dans le classement.',
    cta: 'Se connecter',
    register: 'Créer un compte',
  },
  en: {
    subtitle: 'Predict every match. Points are based on bookmaker odds.',
    scoring: 'Scoring system',
    exact: 'Exact score',
    exactDesc: 'Correct score AND correct result',
    correct: 'Correct result',
    correctDesc: 'Right winner or draw, wrong score',
    wrong: 'Wrong result',
    wrongDesc: 'Incorrect result',
    oddsNote: 'The odds used are those of the result you predicted, locked at match time. The bigger the surprise, the more you earn.',
    howTitle: 'How it works',
    step1: 'Predict the score of each match before kick-off.',
    step2: 'Predictions lock 15 min before the match.',
    step3: 'Once the match starts, check everyone\'s predictions in "Les Pronos".',
    step4: 'Points are calculated automatically shortly after the final whistle.',
    step5: 'Track your score on the leaderboard.',
    cta: 'Sign in',
    register: 'Create an account',
  },
}

export default function Home() {
  const [lang, setLang] = useState<'fr' | 'en'>('fr')
  const t = T[lang]

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6">

        {/* Lang switcher */}
        <div className="flex justify-end">
          <div className="flex overflow-hidden rounded-full border border-gray-800 text-[10px] font-bold">
            <button
              onClick={() => setLang('fr')}
              className={`flex items-center justify-center min-h-[44px] px-3 transition-colors ${lang === 'fr' ? 'bg-green-700 text-white' : 'bg-gray-900 text-gray-400 hover:text-gray-200'}`}
            >
              FR
            </button>
            <button
              onClick={() => setLang('en')}
              className={`flex items-center justify-center min-h-[44px] px-3 transition-colors ${lang === 'en' ? 'bg-green-700 text-white' : 'bg-gray-900 text-gray-400 hover:text-gray-200'}`}
            >
              EN
            </button>
          </div>
        </div>

        {/* Hero */}
        <div className="text-center space-y-3">
          <img
            src="/logo-fifa-2026.jpg"
            alt="FIFA World Cup 2026"
            width={112} height={112}
            className="h-28 w-auto mx-auto"
            fetchPriority="high"
          />
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            {lang === 'fr' ? 'Coupe du Monde 2026' : 'World Cup 2026'}
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">{t.subtitle}</p>
        </div>

        {/* Barème */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{t.scoring}</p>

          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-950 text-base">⭐</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{t.exact}</p>
              <p className="text-xs text-gray-500">{t.exactDesc}</p>
            </div>
            <span className="text-sm font-extrabold text-green-400 font-mono whitespace-nowrap">3 × {lang === 'fr' ? 'cote' : 'odds'}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-950 text-base">✓</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{t.correct}</p>
              <p className="text-xs text-gray-500">{t.correctDesc}</p>
            </div>
            <span className="text-sm font-extrabold text-blue-400 font-mono whitespace-nowrap">1 × {lang === 'fr' ? 'cote' : 'odds'}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-800 text-sm text-gray-500">✗</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-400">{t.wrong}</p>
              <p className="text-xs text-gray-600">{t.wrongDesc}</p>
            </div>
            <span className="text-sm font-extrabold text-gray-600 font-mono whitespace-nowrap">0 pt</span>
          </div>

          <p className="text-[11px] text-gray-600 leading-relaxed border-t border-gray-800 pt-3">{t.oddsNote}</p>
        </div>

        {/* Règles */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 space-y-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{t.howTitle}</p>
          <div className="flex gap-3 text-sm">
            <span className="text-gray-600 font-mono shrink-0 w-4">1.</span>
            <p className="text-gray-400">{t.step1}</p>
          </div>
          <div className="flex gap-3 text-sm">
            <span className="text-gray-600 font-mono shrink-0 w-4">2.</span>
            <p className="text-gray-400"><strong className="text-white">{lang === 'fr' ? 'Verrouillage 15 min' : '15 min lock'}</strong> — {lang === 'fr' ? 'plus de modification après.' : 'no more changes after that.'}</p>
          </div>
          <div className="flex gap-3 text-sm">
            <span className="text-gray-600 font-mono shrink-0 w-4">3.</span>
            <p className="text-gray-400">{t.step3}</p>
          </div>
          <div className="flex gap-3 text-sm">
            <span className="text-gray-600 font-mono shrink-0 w-4">4.</span>
            <p className="text-gray-400">{t.step4}</p>
          </div>
          <div className="flex gap-3 text-sm">
            <span className="text-gray-600 font-mono shrink-0 w-4">5.</span>
            <p className="text-gray-400">{t.step5}</p>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-3 pb-8">
          <Link
            href="/login"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 py-4 text-base font-bold text-black transition-all hover:bg-green-500 active:scale-[0.98]"
          >
            {t.cta}
          </Link>
          <Link
            href="/register"
            className="flex w-full items-center justify-center rounded-xl border border-gray-700 py-3 text-sm font-semibold text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
          >
            {t.register}
          </Link>
        </div>

      </div>
    </div>
  )
}
