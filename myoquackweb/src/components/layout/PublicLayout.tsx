import type { ReactNode } from 'react'
import { Navbar } from './Navbar'

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary2 to-primary">
      <Navbar />
      <div className="flex min-h-[calc(100vh-73px)] items-center justify-center px-3 py-10 sm:px-4 lg:px-8 xl:px-10 2xl:px-14">
        {children}
      </div>
    </div>
  )
}
