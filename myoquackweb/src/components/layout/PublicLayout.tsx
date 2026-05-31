import type { ReactNode } from 'react'
import { Navbar } from './Navbar'

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary2 to-primary text-slate-900 transition-colors dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
      <Navbar />
      <div className="flex min-h-[calc(100vh-73px)] items-center justify-center px-3 py-10 sm:px-4 lg:px-8 xl:px-10 2xl:px-14">
        {children}
      </div>
    </div>
  )
}
