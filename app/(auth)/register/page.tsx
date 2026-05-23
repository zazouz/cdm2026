'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ firstName: '', lastName: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const username = (form.firstName + form.lastName)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if (form.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('Prénom et nom sont obligatoires.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const email = `${username}@prono.internal`
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password: form.password })

    if (signUpError) {
      setError(signUpError.message === 'User already registered'
        ? 'Ce nom d\'utilisateur est déjà pris.'
        : signUpError.message)
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
        setError('Erreur lors de la création du compte. Ce pseudo est peut-être déjà pris.')
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
          <div className="text-5xl mb-3">🏆</div>
          <h1 className="text-2xl font-bold text-white">Pronostics CDM 2026</h1>
          <p className="text-gray-400 mt-1">Crée ton compte</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Prénom</label>
              <input
                type="text"
                value={form.firstName}
                onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                className="w-full bg-gray-800 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Karim"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nom</label>
              <input
                type="text"
                value={form.lastName}
                onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                className="w-full bg-gray-800 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Benzema"
                required
              />
            </div>
          </div>

          {username && (
            <p className="text-xs text-gray-500">
              Ton pseudo : <span className="text-green-400 font-mono">{username}</span>
            </p>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-1">Mot de passe</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full bg-gray-800 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="6 caractères minimum"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Confirmer le mot de passe</label>
            <input
              type="password"
              value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              className="w-full bg-gray-800 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Répète le mot de passe"
              required
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-950/50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-lg py-3 transition-colors"
          >
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Déjà un compte ?{' '}
            <Link href="/login" className="text-green-400 hover:text-green-300">
              Se connecter
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
