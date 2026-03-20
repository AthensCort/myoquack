import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Doctor } from '../models/types'
import { clearSessionDraft } from '../services/sessionDraft'
import {
  clearStoredAuthSession,
  loginDoctor,
  persistAuthSession,
  registerDoctor,
  restoreStoredAuthSession,
  setAuthToken,
} from '../services/api'

interface AuthContextValue {
  currentDoctor: Doctor | null
  login: (id_medico: string, password: string) => Promise<void>
  register: (
    id_medico: string,
    nombre_completo: string,
    password: string,
  ) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentDoctor, setCurrentDoctor] = useState<Doctor | null>(() => {
    const storedSession = restoreStoredAuthSession()
    return storedSession?.doctor ?? null
  })

  const login = async (id_medico: string, password: string) => {
    const session = await loginDoctor(id_medico, password)
    persistAuthSession(session.token, session.doctor)
    setCurrentDoctor(session.doctor)
  }

  const register = async (
    id_medico: string,
    nombre_completo: string,
    password: string,
  ) => {
    const session = await registerDoctor(id_medico, nombre_completo, password)
    persistAuthSession(session.token, session.doctor)
    setCurrentDoctor(session.doctor)
  }

  const logout = () => {
    setAuthToken(null)
    setCurrentDoctor(null)
    clearStoredAuthSession()
    clearSessionDraft()
  }

  const value = useMemo(
    () => ({
      currentDoctor,
      login,
      register,
      logout,
    }),
    [currentDoctor],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider.')
  }
  return context
}
