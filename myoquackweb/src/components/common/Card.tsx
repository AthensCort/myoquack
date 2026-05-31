import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function Card({ title, subtitle, actions, children, className }: CardProps) {
  return (
    <section
      className={`rounded-2xl border border-blue-100 bg-white p-4 text-slate-900 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:shadow-slate-950/30 sm:p-6 ${
        className ?? ''
      }`}
    >
      {(title || subtitle || actions) && (
        <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title && (
              <h2 className="text-xl font-bold text-textDark dark:text-slate-50">
                {title}
              </h2>
            )}
            {subtitle && <p className="text-sm text-grayish dark:text-slate-400">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  )
}
