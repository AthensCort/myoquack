import { useNavigate } from 'react-router-dom'
import { Sun, Moon, Bird } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
// 1. Import the new button
import { Esp32ConnectButton } from '../common/Esp32ConnectButton'

export function Navbar() {
  const { currentDoctor, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const isDark = theme === 'dark'

  return (
    <header className="sticky top-0 z-40 border-b border-primary2/50 bg-primary text-white dark:border-slate-700 dark:bg-slate-950">
      <div className="flex w-full items-center justify-between gap-3 px-3 py-3 sm:px-4 lg:px-8 xl:px-10 2xl:px-14">
        {/* LEFT: Branding */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accentBlue text-slate-950 sm:h-10 sm:w-10 dark:bg-accentYellow">
            <Bird className="h-6 w-6" />
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

        {/* RIGHT: Actions */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          
          {/* 2. Insert the ESP32 Connection Button here */}
          <Esp32ConnectButton />

          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/30 transition hover:bg-white/10 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {isDark ? (
              <Sun className="h-5 w-5 text-accentYellow" />
            ) : (
              <Moon className="h-5 w-5 text-blue-50" />
            )}
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
        </div>
      </div>
    </header>
  )
}