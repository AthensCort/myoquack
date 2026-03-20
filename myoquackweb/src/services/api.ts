import type { Doctor } from '../models/types'

const API_URL = import.meta.env.VITE_API_URL?.trim() || 'http://localhost:4000'
const AUTH_STORAGE_KEY = 'myoquack.auth'

interface ApiDoctor {
  id_medico: string
  nombre_completo: string
  fecha_creacion?: string
}

interface AuthResponse {
  token: string
  doctor: ApiDoctor
}

interface ErrorResponse {
  error?: string
}

interface StoredAuthSession {
  token: string
  doctor: ApiDoctor
}

let authToken: string | null = null

function toDoctor(doctor: ApiDoctor): Doctor {
  return {
    id_medico: doctor.id_medico,
    nombre_completo: doctor.nombre_completo,
    fecha_creacion: doctor.fecha_creacion ? new Date(doctor.fecha_creacion) : undefined,
  }
}

async function parseJson<T>(response: Response): Promise<T | null> {
  const text = await response.text()
  if (!text) {
    return null
  }

  return JSON.parse(text) as T
}

async function requestAuth(path: string, payload: Record<string, string>) {
  const response = await apiFetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const body = (await parseJson<AuthResponse | ErrorResponse>(response)) ?? {}

  if (!response.ok) {
    const errorMessage =
      'error' in body && body.error ? body.error : 'No fue posible completar la autenticacion.'
    throw new Error(errorMessage)
  }

  if (!('token' in body) || !('doctor' in body)) {
    throw new Error('La respuesta del servidor no tiene el formato esperado.')
  }

  const session = {
    token: body.token,
    doctor: toDoctor(body.doctor),
  }

  setAuthToken(session.token)
  return session
}

export function getApiBaseUrl() {
  return API_URL
}

export function setAuthToken(token: string | null) {
  authToken = token
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }

  if (authToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${authToken}`)
  }

  return fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  })
}

export async function loginDoctor(id_medico: string, password: string) {
  return requestAuth('/auth/login', { id_medico, password })
}

export async function registerDoctor(
  id_medico: string,
  nombre_completo: string,
  password: string,
) {
  return requestAuth('/auth/register', {
    id_medico,
    nombre_completo,
    password,
  })
}

export function restoreStoredAuthSession() {
  if (typeof window === 'undefined') {
    return null
  }

  const storedValue = window.localStorage.getItem(AUTH_STORAGE_KEY)
  if (!storedValue) {
    return null
  }

  try {
    const parsed = JSON.parse(storedValue) as StoredAuthSession
    if (!parsed.token || !parsed.doctor?.id_medico || !parsed.doctor?.nombre_completo) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY)
      return null
    }

    const session = {
      token: parsed.token,
      doctor: toDoctor(parsed.doctor),
    }

    setAuthToken(session.token)
    return session
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

export function persistAuthSession(token: string, doctor: Doctor) {
  if (typeof window === 'undefined') {
    return
  }

  const payload: StoredAuthSession = {
    token,
    doctor: {
      id_medico: doctor.id_medico,
      nombre_completo: doctor.nombre_completo,
      fecha_creacion: doctor.fecha_creacion?.toISOString(),
    },
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload))
}

export function clearStoredAuthSession() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY)
}
