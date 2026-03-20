import type {
  EventoContraccion,
  Paciente,
  ReportListItem,
  SesionEmg,
  SessionDraft,
} from '../models/types'
import { apiFetch } from './api'

interface ApiErrorResponse {
  error?: string
}

interface ApiPatient {
  id_paciente: string
  id_medico: string
  nombre: string
  apellidos: string
  edad: number
  genero: Paciente['genero']
  lado_trabajo: Paciente['lado_trabajo']
  notas_clinicas: string
  fecha_registro: string
}

interface ApiSession {
  id_sesion: string
  id_paciente: string
  nombre_reporte: string
  fecha_hora: string
  musculo: SesionEmg['musculo']
  config_gain: number
  config_offset_mv: number
  config_threshold_uv: number
  tiempo_juego_segundos: number
  total_contracciones: number
  total_patitos: number
  stat_avg_peak: number
  stat_avg_rms: number
  stat_avg_iemg: number
  stat_avg_duracion: number
}

interface ApiEvent {
  id_evento: string
  id_sesion: string
  numero_orden: number
  timestamp_segundos: number
  peak_uv: number
  rms: number
  iemg: number
  duracion_segundos: number
  waveform_data: number[]
}

interface ApiReportItem {
  session: ApiSession
  patient: ApiPatient
}

interface ApiSessionMutationResponse {
  session: ApiSession
  events: ApiEvent[]
}

async function parseJson<T>(response: Response): Promise<T | null> {
  const text = await response.text()
  if (!text) {
    return null
  }

  return JSON.parse(text) as T
}

async function requestJson<T>(path: string, init?: RequestInit) {
  const response = await apiFetch(path, init)
  const payload = await parseJson<T | ApiErrorResponse>(response)

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && payload.error
        ? payload.error
        : 'La API devolvio un error.'
    throw new Error(message)
  }

  if (payload === null) {
    throw new Error('La API devolvio una respuesta vacia.')
  }

  return payload as T
}

async function requestText(path: string, init?: RequestInit) {
  const response = await apiFetch(path, init)
  const text = await response.text()

  if (!response.ok) {
    try {
      const payload = JSON.parse(text) as ApiErrorResponse
      throw new Error(payload.error || 'La API devolvio un error.')
    } catch {
      throw new Error(text || 'La API devolvio un error.')
    }
  }

  return text
}

function toPatient(patient: ApiPatient): Paciente {
  return {
    ...patient,
    notas_clinicas: patient.notas_clinicas ?? '',
    fecha_registro: new Date(patient.fecha_registro),
  }
}

function toSession(session: ApiSession): SesionEmg {
  return {
    ...session,
    nombre_reporte: session.nombre_reporte ?? '',
    fecha_hora: new Date(session.fecha_hora),
  }
}

function toEvent(event: ApiEvent): EventoContraccion {
  return {
    ...event,
    id_evento: String(event.id_evento),
    id_sesion: String(event.id_sesion),
    waveform_data: [...event.waveform_data],
  }
}

export interface CreatePatientInput {
  nombre: string
  apellidos: string
  edad: number
  genero: Paciente['genero']
  lado_trabajo: Paciente['lado_trabajo']
  notas_clinicas: string
}

export async function listPatientsFromApi() {
  const patients = await requestJson<ApiPatient[]>('/pacientes')
  return patients.map(toPatient)
}

export async function createPatientInApi(input: CreatePatientInput) {
  const patient = await requestJson<ApiPatient>('/pacientes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  return toPatient(patient)
}

export async function deletePatientInApi(patientId: string) {
  await requestText(`/pacientes/${patientId}`, {
    method: 'DELETE',
  })
}

export async function listSessionsFromApi(patientId: string) {
  const sessions = await requestJson<ApiSession[]>(
    `/sesiones?patientId=${encodeURIComponent(patientId)}`,
  )
  return sessions.map(toSession)
}

export async function listReportsFromApi() {
  const reports = await requestJson<ApiReportItem[]>('/sesiones/reports')
  return reports.map((report) => ({
    session: toSession(report.session),
    patient: toPatient(report.patient),
  })) satisfies ReportListItem[]
}

export async function saveSessionToApi(reportName: string, draft: SessionDraft) {
  if (!draft.simulation) {
    throw new Error('No hay resultados simulados para guardar.')
  }

  if (draft.simulation.saved_session_id) {
    const updated = await requestJson<ApiSessionMutationResponse>(
      `/sesiones/${draft.simulation.saved_session_id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportName,
        }),
      },
    )

    return {
      session: toSession(updated.session),
      events: updated.events.map(toEvent),
    }
  }

  const created = await requestJson<ApiSessionMutationResponse>('/sesiones', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reportName,
      report: {
        ...draft.simulation.report,
        fecha_hora: draft.simulation.report.fecha_hora.toISOString(),
        nombre_reporte: reportName,
      },
      events: draft.simulation.events,
    }),
  })

  return {
    session: toSession(created.session),
    events: created.events.map(toEvent),
  }
}

export async function deleteSessionInApi(sessionId: string) {
  await requestText(`/sesiones/${sessionId}`, {
    method: 'DELETE',
  })
}

export async function getPatientsCsvText() {
  return requestText('/pacientes/export/csv')
}

export async function getSessionEventsCsvText(sessionId: string) {
  return requestText(`/sesiones/${sessionId}/events/csv`)
}

export async function getSessionExportJsonText(sessionId: string) {
  return requestText(`/sesiones/${sessionId}/export/json`)
}
