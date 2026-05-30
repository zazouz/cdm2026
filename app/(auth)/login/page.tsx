'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'

const T = {
  fr: {
    title: 'Connecte-toi',
    pseudo: 'Pseudo',
    password: 'Mot de passe',
    submit: 'Se connecter',
    loading: 'Connexion...',
    noAccount: 'Pas encore de compte ?',
    register: "S'inscrire",
    forgot: 'Mot de passe oublié ?',
    error: 'Pseudo ou mot de passe incorrect.',
  },
  en: {
    title: 'Sign in',
    pseudo: 'Username',
    password: 'Password',
    submit: 'Sign in',
    loading: 'Signing in...',
    noAccount: 'No account yet?',
    register: 'Sign up',
    forgot: 'Forgot password?',
    error: 'Incorrect username or password.',
  },
}

export default function LoginPage() {
  const router = useRouter()
  const [lang, setLang] = useState<'fr' | 'en'>('fr')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState(0)
  const t = T[lang]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const normalizedUsername = username.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '')

    let authEmail = `${normalizedUsername}@prono.app`
    try {
      const { data: userRecord } = await supabase
        .from('users')
        .select('email')
        .eq('username', normalizedUsername)
        .single()
      if (userRecord?.email) authEmail = userRecord.email
    } catch {}

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: authEmail, password })

    if (signInError) {
      setLoginAttempts(n => n + 1)
      setError(t.error)
      setLoading(false)
      return
    }

    router.push('/matches')
    router.refresh()
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
          <h1 className="text-2xl font-bold text-white">{lang === 'fr' ? 'Pronostics Coupe du Monde 2026' : 'World Cup 2026 Predictions'}</h1>
          <p className="text-gray-400 mt-1">{t.title}</p>
          <div className="flex justify-center mt-3">
            <div className="flex overflow-hidden rounded-full border border-gray-800 text-[10px] font-bold">
              <button type="button" onClick={() => setLang('fr')} className={`flex items-center justify-center min-h-[44px] px-3 transition-colors ${lang === 'fr' ? 'bg-green-700 text-white' : 'bg-gray-900 text-gray-400 hover:text-gray-200'}`}>FR</button>
              <button type="button" onClick={() => setLang('en')} className={`flex items-center justify-center min-h-[44px] px-3 transition-colors ${lang === 'en' ? 'bg-green-700 text-white' : 'bg-gray-900 text-gray-400 hover:text-gray-200'}`}>EN</button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl p-6 space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm text-gray-400 mb-1">{t.pseudo}</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-gray-800 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="oliviergiroud"
              required
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-gray-400 mb-1">{t.password}</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-gray-800 rounded-lg px-3 py-2.5 pr-14 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder=""
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? (lang === 'fr' ? 'Masquer le mot de passe' : 'Hide password') : (lang === 'fr' ? 'Afficher le mot de passe' : 'Show password')}
                className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-r-lg text-gray-400 hover:text-white"
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-950/50 rounded-lg px-3 py-2 space-y-1">
              <p className="text-red-400 text-sm">{error}</p>
              {loginAttempts >= 1 && (
                <p className="text-xs text-gray-400">
                  {lang === 'fr'
                    ? <>Pas encore de compte ? <a href="/register" className="text-green-400 underline">Inscris-toi ici.</a></>
                    : <>No account yet? <a href="/register" className="text-green-400 underline">Sign up here.</a></>}
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-400 disabled:bg-gray-700 disabled:text-gray-300 text-gray-950 font-semibold rounded-lg py-3 transition-colors"
          >
            {loading ? t.loading : t.submit}
          </button>

          <div className="text-center">
            <Link
              href="/forgot-password"
              className="mx-auto flex min-h-11 items-center justify-center px-3 text-sm text-gray-400 transition-colors hover:text-gray-300"
            >
              {t.forgot}
            </Link>
          </div>

          <Link
            href="/register"
            className="block w-full rounded-lg border border-gray-600 py-3 text-center text-sm font-semibold text-gray-300 transition-colors hover:border-gray-400 hover:text-white"
          >
            {t.noAccount} {t.register}
          </Link>
        </form>
      </div>
    </main>
  )
}
