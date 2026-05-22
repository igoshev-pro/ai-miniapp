'use client'

import { Loader2 } from 'lucide-react'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { AdminSidebar } from './_components/AdminSidebar'
import { AdminHeader } from './_components/AdminHeader'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { loading, isAdmin, role, user } = useAdminAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <div className="text-sm text-zinc-400">Проверка доступа...</div>
        </div>
      </div>
    )
  }

  if (!isAdmin || !role || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="text-sm text-zinc-400">Нет доступа</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <AdminSidebar role={role} />
      <div className="ml-64 flex min-h-screen flex-col">
        <AdminHeader
          username={user.username}
          telegramId={user.telegramId}
          role={role}
        />
        <main className="flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  )
}