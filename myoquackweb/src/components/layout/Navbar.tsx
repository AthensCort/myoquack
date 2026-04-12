import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { dashboardLinks } from './navigation'

export function Navbar() {
  const { currentDoctor, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const isDark = theme === 'dark'

  return (
    <header className="sticky top-0 z-40 border-b border-primary2/50 bg-primary text-white dark:border-slate-700 dark:bg-slate-950">
      <div className="flex w-full items-center justify-between gap-3 px-3 py-3 sm:px-4 lg:px-8 xl:px-10 2xl:px-14">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accentBlue text-sm font-black sm:h-10 sm:w-10 dark:bg-accentYellow dark:text-slate-950">
            MQ
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-wide text-softBlue">
              MyoQuack
            </p>
            <p className="truncate text-xs text-blue-100">
              Plataforma de fisioterapia EMG
            </p>
          </div>
        </div>

        <nav className="hidden items-center gap-4 lg:flex">
          {currentDoctor &&
            dashboardLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-white text-primary dark:bg-accentYellow dark:text-slate-950'
                      : 'text-blue-100 hover:bg-primary2 hover:text-white dark:text-slate-300 dark:hover:bg-slate-800'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          {!currentDoctor && (
            <NavLink
              to="/login"
              className="rounded-lg bg-accentYellow px-4 py-2 text-sm font-semibold text-primary"
            >
              Ingresar
            </NavLink>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-lg border border-white/30 px-3 py-2 text-xs font-bold text-blue-50 transition hover:bg-white/10 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
            aria-pressed={isDark}
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {isDark ? 'Modo claro' : 'Modo oscuro'}
          </button>

          {currentDoctor && (
            <>
              <p className="hidden text-right text-xs text-blue-100 dark:text-slate-300 sm:block">
                {currentDoctor.nombre_completo}
              </p>
              <button
                type="button"
                onClick={() => {
                  logout()
                  navigate('/login')
                }}
                className="rounded-lg bg-accentYellow px-3 py-2 text-sm font-bold text-primary sm:px-4"
              >
                Cerrar sesion
              </button>
            </>
          )}

          {!currentDoctor && (
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="hidden rounded-lg bg-accentYellow px-3 py-2 text-sm font-bold text-primary sm:block sm:px-4 lg:hidden"
            >
              Ingresar
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
