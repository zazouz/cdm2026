'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'

const T = {
  fr: {
    title: 'Pronostics Coupe du Monde 2026',
    subtitle: 'Crée ton compte',
    firstName: 'Prénom',
    lastName: 'Nom',
    realNameWarning: 'Utilise ton vrai prénom et nom — les comptes avec de faux noms seront supprimés.',
    pseudo: 'Ton pseudo :',
    password: 'Mot de passe',
    passwordPlaceholder: '6 caractères minimum',
    confirm: 'Confirmer le mot de passe',
    confirmPlaceholder: 'Répète le mot de passe',
    submit: 'Créer mon compte',
    loading: 'Création...',
    alreadyAccount: 'Déjà un compte ?',
    login: 'Se connecter',
    errPasswordMatch: 'Les mots de passe ne correspondent pas.',
    errPasswordLength: 'Le mot de passe doit contenir au moins 6 caractères.',
    errNameRequired: 'Prénom et nom sont obligatoires.',
    errUsernameTaken: 'Ce nom d\'utilisateur est déjà pris.',
    errGeneric: 'Erreur lors de la création du compte. Ce pseudo est peut-être déjà pris.',
  },
  en: {
    title: 'World Cup 2026 Predictions',
    subtitle: 'Create your account',
    firstName: 'First name',
    lastName: 'Last name',
    realNameWarning: 'Use your real first and last name — accounts with fake names will be deleted.',
    pseudo: 'Your username:',
    password: 'Password',
    passwordPlaceholder: 'At least 6 characters',
    confirm: 'Confirm password',
    confirmPlaceholder: 'Repeat your password',
    submit: 'Create account',
    loading: 'Creating...',
    alreadyAccount: 'Already have an account?',
    login: 'Sign in',
    errPasswordMatch: 'Passwords do not match.',
    errPasswordLength: 'Password must be at least 6 characters.',
    errNameRequired: 'First name and last name are required.',
    errUsernameTaken: 'This username is already taken.',
    errGeneric: 'Error creating account. This username may already be taken.',
  },
}

export default function RegisterPage() {
  const router = useRouter()
  const [lang, setLang] = useState<'fr' | 'en'>('fr')
  const [form, setForm] = useState({ firstName: '', lastName: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const t = T[lang]

  const username = (form.firstName + form.lastName)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm) {
      setError(t.errPasswordMatch)
      return
    }
    if (form.password.length < 6) {
      setError(t.errPasswordLength)
      return
    }
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError(t.errNameRequired)
      return
    }

    setLoading(true)
    const supabase = createClient()

    const email = `${username}@prono.app`
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password: form.password })

    if (signUpError) {
      setError(signUpError.message === 'User already registered' ? t.errUsernameTaken : signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { error: insertError } = await supabase.from('users').insert({
        id: data.user.id,
        username,
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
      })

      if (insertError) {
        setError(t.errGeneric)
        setLoading(false)
        return
      }
    }

    router.push('/matches')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="https://upload.wikimedia.org/wikipedia/en/1/17/2026_FIFA_World_Cup_emblem.svg" alt="FIFA World Cup 2026" className="h-24 w-auto mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-white">{t.title}</h1>
          <p className="text-gray-400 mt-1">{t.subtitle}</p>
          <div className="flex justify-center mt-3">
            <div className="flex overflow-hidden rounded-full border border-gray-800 text-[10px] font-bold">
              <button type="button" onClick={() => setLang('fr')} className={`px-3 py-1 transition-colors ${lang === 'fr' ? 'bg-green-700 text-white' : 'bg-gray-900 text-gray-500 hover:text-gray-300'}`}>FR</button>
              <button type="button" onClick={() => setLang('en')} className={`px-3 py-1 transition-colors ${lang === 'en' ? 'bg-green-700 text-white' : 'bg-gray-900 text-gray-500 hover:text-gray-300'}`}>EN</button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t.firstName}</label>
              <input
                type="text"
                value={form.firstName}
                onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                className="w-full bg-gray-800 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Olivier"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t.lastName}</label>
              <input
                type="text"
                value={form.lastName}
                onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                className="w-full bg-gray-800 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Giroud"
                required
              />
            </div>
          </div>

          <p className="text-xs text-amber-600 bg-amber-950/40 rounded-lg px-3 py-2">
            {t.realNameWarning}
          </p>

          {username && (
            <p className="text-xs text-gray-500">
              {t.pseudo} <span className="text-green-400 font-mono">{username}</span>
            </p>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-1">{t.password}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full bg-gray-800 rounded-lg px-3 py-2.5 pr-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder={t.passwordPlaceholder}
                required
              />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">{t.confirm}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                className="w-full bg-gray-800 rounded-lg px-3 py-2.5 pr-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder={t.confirmPlaceholder}
                required
              />
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

          <p className="text-center text-sm text-gray-500">
            {t.alreadyAccount}{' '}
            <Link href="/login" className="text-green-400 hover:text-green-300">
              {t.login}
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
