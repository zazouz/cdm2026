import { cookies } from 'next/headers'
import type { Lang } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

const T = {
  fr: {
    title: 'Comment ça marche',
    steps: [
      'Pronostique le score de tous les matchs et valide-les avant le coup d\'envoi.',
      'Les pronostics sont verrouillés 15 minutes avant le début du match : aucune modification n\'est possible après ce délai.',
      'Une fois le match commencé, suis tes pronostics et ceux des autres joueurs dans l\'onglet "Résultats".',
      'Suis ton évolution dans l\'onglet Classement tout au long de la compétition.',
      'Les points sont calculés automatiquement peu après la fin du match selon le barème ci-dessous.',
    ],
    scaleTitle: 'Barème des points',
    exact: 'Score exact',
    exactDesc: 'Bon vainqueur (ou nul) ET bon score',
    exactPts: '3 × cote',
    correct: 'Bon résultat',
    correctDesc: 'Bon vainqueur (ou nul), mauvais score',
    correctPts: '1 × cote',
    wrong: 'Mauvais résultat',
    wrongDesc: 'Mauvais vainqueur',
    wrongPts: '0 pt',
    note: 'La cote prise en compte est celle de Betclic.fr au moment où elle a été récupérée — elle est figée et ne change plus ensuite.',
    timeNote: 'Seul le score à la fin du temps réglementaire (90 min) est pris en compte. Les prolongations et les tirs au but ne comptent pas.',
  },
  en: {
    title: 'How it works',
    steps: [
      'Predict the score of every match and confirm before kick-off.',
      'Predictions lock 15 minutes before kick-off — no changes allowed after that.',
      'Once the match starts, follow your predictions and everyone else\'s in the "Results" tab.',
      'Track your ranking in the Standings tab throughout the tournament.',
      'Points are calculated automatically shortly after each match ends, based on the scale below.',
    ],
    scaleTitle: 'Scoring system',
    exact: 'Exact score',
    exactDesc: 'Right winner (or draw) AND right score',
    exactPts: '3 × odds',
    correct: 'Correct result',
    correctDesc: 'Right winner (or draw), wrong score',
    correctPts: '1 × odds',
    wrong: 'Wrong result',
    wrongDesc: 'Wrong winner',
    wrongPts: '0 pt',
    note: 'The odds used are those from Betclic.fr at the time they were fetched — they are locked in and never updated afterwards.',
    timeNote: 'Only the score at the end of regular time (90 min) counts. Extra time and penalty shootouts are not included.',
  },
}

export default async function HowItWorksPage() {
  const cookieStore = await cookies()
  const rawLang = cookieStore.get('prono_lang')?.value
  const lang: Lang = rawLang === 'fr' || rawLang === 'en' ? rawLang : 'fr'
  const t = T[lang]

  return (
    <div className="space-y-6 pb-4">
      <h1 className="text-xl font-bold text-white">{t.title}</h1>

      <ol className="space-y-4">
        {t.steps.map((step, i) => (
          <li key={i} className="flex gap-4 rounded-2xl border border-gray-800 bg-gray-900 p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white">
              {i + 1}
            </span>
            <p className="text-sm leading-relaxed text-gray-300">{step}</p>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">{t.scaleTitle}</h2>
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">{t.exact}</p>
              <p className="text-xs text-gray-500">{t.exactDesc}</p>
            </div>
            <span className="shrink-0 rounded-xl bg-green-600/20 px-3 py-1 text-sm font-bold text-green-400">
              {t.exactPts}
            </span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">{t.correct}</p>
              <p className="text-xs text-gray-500">{t.correctDesc}</p>
            </div>
            <span className="shrink-0 rounded-xl bg-yellow-600/20 px-3 py-1 text-sm font-bold text-yellow-400">
              {t.correctPts}
            </span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">{t.wrong}</p>
              <p className="text-xs text-gray-500">{t.wrongDesc}</p>
            </div>
            <span className="shrink-0 rounded-xl bg-gray-800 px-3 py-1 text-sm font-bold text-gray-500">
              {t.wrongPts}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-600 border-t border-gray-800 pt-3">{t.timeNote}</p>
        <p className="text-xs text-gray-600">{t.note}</p>
      </div>
    </div>
  )
}
