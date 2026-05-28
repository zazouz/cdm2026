import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/matches')
  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 z-0">
        <img src="/bg-fifa-2026.jpg" alt="" aria-hidden className="h-full w-full object-cover opacity-[0.06]" />
      </div>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
