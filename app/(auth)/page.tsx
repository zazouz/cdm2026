import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6">

        {/* Hero */}
        <div className="text-center space-y-3 pt-6">
          <div className="text-6xl">⚽</div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">CDM 2026</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Pronostique tous les matchs. Les points se calculent sur les côtes bookmaker.
          </p>
        </div>

        {/* Barème */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Barème des points</p>

          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-950 text-base">⭐</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Score exact</p>
              <p className="text-xs text-gray-500">Bon score ET bon résultat</p>
            </div>
            <span className="text-sm font-extrabold text-green-400 font-mono whitespace-nowrap">3 × côte</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-950 text-base">✓</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Bon résultat</p>
              <p className="text-xs text-gray-500">Victoire ou nul correct, score faux</p>
            </div>
            <span className="text-sm font-extrabold text-blue-400 font-mono whitespace-nowrap">1 × côte</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-800 text-sm text-gray-500">✗</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-400">Mauvais résultat</p>
              <p className="text-xs text-gray-600">Résultat incorrect</p>
            </div>
            <span className="text-sm font-extrabold text-gray-600 font-mono whitespace-nowrap">0 pt</span>
          </div>

          <p className="text-[11px] text-gray-600 leading-relaxed border-t border-gray-800 pt-3">
            La côte utilisée est celle du résultat que tu as prédit, figée au moment du match.
            Plus la surprise est grande, plus tu gagnes.
          </p>
        </div>

        {/* Règles */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 space-y-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Comment ça marche</p>
          <div className="flex gap-3 text-sm">
            <span className="text-gray-600 font-mono shrink-0 w-4">1.</span>
            <p className="text-gray-400">Prédit le score de chaque match avant le coup d&apos;envoi.</p>
          </div>
          <div className="flex gap-3 text-sm">
            <span className="text-gray-600 font-mono shrink-0 w-4">2.</span>
            <p className="text-gray-400">Les pronos se <strong className="text-white">verrouillent 15 min</strong> avant le match.</p>
          </div>
          <div className="flex gap-3 text-sm">
            <span className="text-gray-600 font-mono shrink-0 w-4">3.</span>
            <p className="text-gray-400">Les points tombent automatiquement dès la fin du match.</p>
          </div>
          <div className="flex gap-3 text-sm">
            <span className="text-gray-600 font-mono shrink-0 w-4">4.</span>
            <p className="text-gray-400">Suis ton score dans le classement et compare avec tes amis.</p>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-3 pb-8">
          <Link
            href="/login"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 py-4 text-base font-bold text-black transition-all hover:bg-green-500 active:scale-[0.98]"
          >
            Entrer ⚽
          </Link>
          <Link
            href="/register"
            className="flex w-full items-center justify-center rounded-xl border border-gray-700 py-3 text-sm font-semibold text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
          >
            Créer un compte
          </Link>
        </div>

      </div>
    </div>
  )
}
