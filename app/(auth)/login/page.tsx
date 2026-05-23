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
    forgotMsg: 'Contacte david.leroux@msccruises.com',
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
    forgotMsg: 'Contact david.leroux@msccruises.com',
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
  const [showForgot, setShowForgot] = useState(false)
  const t = T[lang]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const normalizedUsername = username.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '')
    const email = `${normalizedUsername}@prono.app`

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(t.error)
      setLoading(false)
      return
    }

    router.push('/matches')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏆</div>
          <h1 className="text-2xl font-bold text-white">Pronostics CDM 2026</h1>
          <p className="text-gray-400 mt-1">{t.title}</p>
          <div className="flex justify-center mt-3">
            <div className="flex overflow-hidden rounded-full border border-gray-800 text-[10px] font-bold">
              <button type="button" onClick={() => setLang('fr')} className={`px-3 py-1 transition-colors ${lang === 'fr' ? 'bg-green-700 text-white' : 'bg-gray-900 text-gray-500 hover:text-gray-300'}`}>FR</button>
              <button type="button" onClick={() => setLang('en')} className={`px-3 py-1 transition-colors ${lang === 'en' ? 'bg-green-700 text-white' : 'bg-gray-900 text-gray-500 hover:text-gray-300'}`}>EN</button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t.pseudo}</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-gray-800 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="kariembenzema"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">{t.password}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-gray-800 rounded-lg px-3 py-2.5 pr-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder=""
                required
              />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-950/50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-lg py-3 transition-colors"
          >
            {loading ? t.loading : t.submit}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowForgot(v => !v)}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              {t.forgot}
            </button>
            {showForgot && (
              <p className="mt-1 text-xs text-gray-500 bg-gray-800 rounded-lg px-3 py-2">
                {t.forgotMsg}
              </p>
            )}
          </div>

          <p className="text-center text-sm text-gray-500">
            {t.noAccount}{' '}
            <Link href="/register" className="text-green-400 hover:text-green-300">
              {t.register}
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
