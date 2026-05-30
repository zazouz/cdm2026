'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'

const T = {
  fr: {
    title: 'Mot de passe oublié',
    subtitle: 'Saisis ton adresse email pour recevoir un lien de réinitialisation.',
    email: 'Email',
    emailPlaceholder: 'prenom.nom@exemple.com',
    submit: 'Envoyer le lien',
    loading: 'Envoi...',
    backToLogin: 'Retour à la connexion',
    successTitle: 'Email envoyé',
    successMsg: 'Si cette adresse correspond à un compte, tu recevras un lien de réinitialisation dans quelques minutes. Pense à vérifier tes spams.',
    noEmail: 'Tu n\'as pas renseigné d\'email lors de ton inscription. Contacte un administrateur pour réinitialiser ton mot de passe.',
  },
  en: {
    title: 'Forgot password',
    subtitle: 'Enter your email address to receive a reset link.',
    email: 'Email',
    emailPlaceholder: 'firstname.lastname@example.com',
    submit: 'Send link',
    loading: 'Sending...',
    backToLogin: 'Back to login',
    successTitle: 'Email sent',
    successMsg: 'If this address matches an account, you will receive a reset link shortly. Check your spam folder.',
    noEmail: 'You didn\'t provide an email at registration. Contact an administrator to reset your password.',
  },
}

export default function ForgotPasswordPage() {
  const [lang, setLang] = useState<'fr' | 'en'>('fr')
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const t = T[lang]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/reset-password`
    await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
    setSent(true)
    setLoading(false)
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src="/logo-fifa-2026.jpg"
            alt="FIFA World Cup 2026"
            width={112} height={112}
            className="h-28 w-auto mx-auto mb-3"
            fetchPriority="high"
          />
          <h1 className="text-2xl font-bold text-white">{t.title}</h1>
          <div className="flex justify-center mt-3">
            <div className="flex overflow-hidden rounded-full border border-gray-800 text-[10px] font-bold">
              <button type="button" onClick={() => setLang('fr')} className={`flex items-center justify-center min-h-[44px] px-3 transition-colors ${lang === 'fr' ? 'bg-green-700 text-white' : 'bg-gray-900 text-gray-400 hover:text-gray-200'}`}>FR</button>
              <button type="button" onClick={() => setLang('en')} className={`flex items-center justify-center min-h-[44px] px-3 transition-colors ${lang === 'en' ? 'bg-green-700 text-white' : 'bg-gray-900 text-gray-400 hover:text-gray-200'}`}>EN</button>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
          {sent ? (
            <div className="space-y-4">
              <div className="bg-green-950/50 border border-green-800 rounded-lg px-4 py-3">
                <p className="text-green-400 font-semibold text-sm mb-1">{t.successTitle}</p>
                <p className="text-gray-300 text-sm">{t.successMsg}</p>
              </div>
              <Link
                href="/login"
                className="block w-full rounded-lg border border-gray-600 py-3 text-center text-sm font-semibold text-gray-300 transition-colors hover:border-gray-400 hover:text-white"
              >
                {t.backToLogin}
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-400">{t.subtitle}</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="forgot-email" className="block text-sm text-gray-400 mb-1">{t.email}</label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-gray-800 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder={t.emailPlaceholder}
                    required
                    autoFocus
                    autoComplete="email"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-500 hover:bg-green-400 disabled:bg-gray-700 disabled:text-gray-300 text-gray-950 font-semibold rounded-lg py-3 transition-colors"
                >
                  {loading ? t.loading : t.submit}
                </button>
              </form>

              <Link
                href="/login"
                className="block w-full rounded-lg border border-gray-600 py-3 text-center text-sm font-semibold text-gray-300 transition-colors hover:border-gray-400 hover:text-white"
              >
                {t.backToLogin}
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
