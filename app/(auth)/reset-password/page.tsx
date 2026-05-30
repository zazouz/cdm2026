'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'

const T = {
  fr: {
    title: 'Nouveau mot de passe',
    waiting: 'Vérification du lien...',
    invalidLink: 'Ce lien est invalide ou a expiré.',
    requestNew: 'Demander un nouveau lien',
    password: 'Nouveau mot de passe',
    passwordPlaceholder: '6 caractères minimum',
    confirm: 'Confirmer le mot de passe',
    confirmPlaceholder: 'Répète le mot de passe',
    submit: 'Enregistrer',
    loading: 'Enregistrement...',
    successTitle: 'Mot de passe mis à jour',
    successMsg: 'Tu vas être redirigé vers l\'accueil.',
    errPasswordMatch: 'Les mots de passe ne correspondent pas.',
    errPasswordLength: 'Le mot de passe doit contenir au moins 6 caractères.',
  },
  en: {
    title: 'New password',
    waiting: 'Verifying link...',
    invalidLink: 'This link is invalid or has expired.',
    requestNew: 'Request a new link',
    password: 'New password',
    passwordPlaceholder: 'At least 6 characters',
    confirm: 'Confirm password',
    confirmPlaceholder: 'Repeat your password',
    submit: 'Save',
    loading: 'Saving...',
    successTitle: 'Password updated',
    successMsg: 'You will be redirected shortly.',
    errPasswordMatch: 'Passwords do not match.',
    errPasswordLength: 'Password must be at least 6 characters.',
  },
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [lang] = useState<'fr' | 'en'>('fr')
  const [status, setStatus] = useState<'waiting' | 'ready' | 'invalid' | 'done'>('waiting')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const t = T[lang]

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStatus('ready')
      } else if (event === 'SIGNED_IN') {
        // Code already exchanged before listener registered
        setStatus('ready')
      }
    })

    // Trigger detection of the code/token in the URL
    supabase.auth.getSession()

    // If no event fires after a delay, the link is invalid
    const timeout = setTimeout(() => {
      setStatus(s => s === 'waiting' ? 'invalid' : s)
    }, 4000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError(t.errPasswordMatch); return }
    if (password.length < 6) { setError(t.errPasswordLength); return }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }
    setStatus('done')
    setTimeout(() => router.push('/matches'), 2000)
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
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
          {status === 'waiting' && (
            <p className="text-gray-400 text-sm text-center py-4">{t.waiting}</p>
          )}

          {status === 'invalid' && (
            <div className="space-y-4">
              <p className="text-red-400 text-sm bg-red-950/50 rounded-lg px-3 py-2">{t.invalidLink}</p>
              <Link
                href="/forgot-password"
                className="block w-full rounded-lg border border-gray-600 py-3 text-center text-sm font-semibold text-gray-300 transition-colors hover:border-gray-400 hover:text-white"
              >
                {t.requestNew}
              </Link>
            </div>
          )}

          {status === 'done' && (
            <div className="bg-green-950/50 border border-green-800 rounded-lg px-4 py-3">
              <p className="text-green-400 font-semibold text-sm mb-1">{t.successTitle}</p>
              <p className="text-gray-300 text-sm">{t.successMsg}</p>
            </div>
          )}

          {status === 'ready' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="reset-password" className="block text-sm text-gray-400 mb-1">{t.password}</label>
                <div className="relative">
                  <input
                    id="reset-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-gray-800 rounded-lg px-3 py-2.5 pr-14 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder={t.passwordPlaceholder}
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Masquer' : 'Afficher'}
                    className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-r-lg text-gray-400 hover:text-white"
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="reset-confirm" className="block text-sm text-gray-400 mb-1">{t.confirm}</label>
                <input
                  id="reset-confirm"
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="w-full bg-gray-800 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder={t.confirmPlaceholder}
                  required
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm bg-red-950/50 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-500 hover:bg-green-400 disabled:bg-gray-700 disabled:text-gray-300 text-gray-950 font-semibold rounded-lg py-3 transition-colors"
              >
                {loading ? t.loading : t.submit}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
