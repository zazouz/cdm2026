import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Comment ça marche — CDM 2026',
}

export default function HowItWorksPage() {
  return (
    <div className="space-y-6 pb-4">
      <h1 className="text-xl font-bold text-white">Comment ça marche</h1>

      <ol className="space-y-4">
        {STEPS.map((step, i) => (
          <li key={i} className="flex gap-4 rounded-2xl border border-gray-800 bg-gray-900 p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white">
              {i + 1}
            </span>
            <p className="text-sm leading-relaxed text-gray-300">{step}</p>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Barème des points</h2>
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Score exact</p>
              <p className="text-xs text-gray-500">Bon vainqueur (ou nul) ET bon score</p>
            </div>
            <span className="shrink-0 rounded-xl bg-green-600/20 px-3 py-1 text-sm font-bold text-green-400">
              3 × côte
            </span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Bon résultat</p>
              <p className="text-xs text-gray-500">Bon vainqueur (ou nul), mauvais score</p>
            </div>
            <span className="shrink-0 rounded-xl bg-yellow-600/20 px-3 py-1 text-sm font-bold text-yellow-400">
              1 × côte
            </span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Mauvais résultat</p>
              <p className="text-xs text-gray-500">Mauvais vainqueur</p>
            </div>
            <span className="shrink-0 rounded-xl bg-gray-800 px-3 py-1 text-sm font-bold text-gray-500">
              0 pt
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-600 border-t border-gray-800 pt-3">
          La côte prise en compte est celle de Betclic.fr au moment où elle a été récupérée — elle est figée et ne change plus ensuite.
        </p>
      </div>
    </div>
  )
}

const STEPS = [
  'Pronostique le score de tous les matchs et valide-les avant le coup d\'envoi.',
  'Les pronostics sont verrouillés 15 minutes avant le début du match : aucune modification n\'est possible après ce délai.',
  'Une fois le match commencé, tu peux suivre tes pronostics et ceux des autres joueurs dans l\'onglet "Live".',
  'Suis ton évolution dans l\'onglet Classement tout au long de la compétition.',
  'Les points sont calculés automatiquement peu après la fin du match selon le barème ci-dessous.',
]
