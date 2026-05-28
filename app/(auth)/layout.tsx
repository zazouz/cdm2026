import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/matches')
  return (
    <div
      className="min-h-screen bg-gray-950"
      style={{ backgroundImage: "url('/bg-fifa-2026.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="min-h-screen bg-gray-950/[.94]">
        {children}
      </div>
    </div>
  )
}
