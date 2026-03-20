import bcrypt from 'bcryptjs'
import {
  seedDoctors,
  seedEvents,
  seedPatients,
  seedSessions,
} from '../data/seed'
import type {
  CalibrationDraft,
  Doctor,
  EventoContraccion,
  Paciente,
  PreGameConfig,
  ReportListItem,
  SesionEmg,
  SessionDraft,
  SessionSimulationResult,
} from '../models/types'
import { eventsToCsv } from '../utils/csv'

interface MutableStore {
  doctors: Doctor[]
  patients: Paciente[]
  sessions: SesionEmg[]
  events: EventoContraccion[]
  sessionDraft: SessionDraft | null
}

const store: MutableStore = {
  doctors: seedDoctors.map(cloneDoctor),
  patients: seedPatients.map(clonePatient),
  sessions: seedSessions.map(cloneSession),
  events: seedEvents.map(cloneEvent),
  sessionDraft: null,
}

function cloneDoctor(doctor: Doctor): Doctor {
  return {
    ...doctor,
    fecha_creacion: doctor.fecha_creacion ? new Date(doctor.fecha_creacion) : undefined,
  }
}

function clonePatient(patient: Paciente): Paciente {
  return {
    ...patient,
    fecha_registro: new Date(patient.fecha_registro),
  }
}

function cloneSession(session: SesionEmg): SesionEmg {
  return {
    ...session,
    fecha_hora: new Date(session.fecha_hora),
  }
}

function cloneEvent(event: EventoContraccion): EventoContraccion {
  return {
    ...event,
    waveform_data: [...event.waveform_data],
  }
}

function cloneDraft(draft: SessionDraft): SessionDraft {
  return {
    ...draft,
    fecha_creacion: new Date(draft.fecha_creacion),
    calibration: draft.calibration ? { ...draft.calibration } : undefined,
    config: draft.config ? { ...draft.config } : undefined,
    simulation: draft.simulation ? cloneSimulation(draft.simulation) : undefined,
  }
}

function cloneSimulation(
  simulation: SessionSimulationResult,
): SessionSimulationResult {
  return {
    ...simulation,
    report: cloneSession(simulation.report),
    events: simulation.events.map(cloneEvent),
  }
}

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function randomInt(min: number, max: number) {
  return Math.floor(randomBetween(min, max + 1))
}

function round(value: number, decimals = 2) {
  return Number(value.toFixed(decimals))
}

function getNextNumericId(prefix: string, ids: string[], width = 4) {
  const maxValue = ids.reduce((acc, id) => {
    if (!id.startsWith(prefix)) {
      return acc
    }
    const parsed = Number.parseInt(id.replace(prefix, ''), 10)
    if (Number.isNaN(parsed)) {
      return acc
    }
    return Math.max(acc, parsed)
  }, 0)
  return `${prefix}${String(maxValue + 1).padStart(width, '0')}`
}

function getRequiredDraft() {
  if (!store.sessionDraft) {
    throw new Error('No hay un borrador de sesion activo.')
  }
  return store.sessionDraft
}

function getRequiredDraftWithConfig() {
  const draft = getRequiredDraft()
  if (!draft.calibration || !draft.config) {
    throw new Error('La calibracion y la configuracion previa son requeridas.')
  }
  return draft
}

function generateWaveform(
  threshold: number,
  forceEffective: boolean,
): number[] {
  const size = 100
  const amplitudeFactor = forceEffective
    ? randomBetween(1.15, 1.75)
    : randomBetween(0.7, 1.55)
  const amplitudeBase = Math.max(threshold * amplitudeFactor, 100)
  const waveform: number[] = []

  for (let i = 0; i < size; i += 1) {
    const t = i / (size - 1)
    const contraction = Math.sin(Math.PI * t) ** 2
    const noise = randomBetween(-0.045, 0.045) * amplitudeBase
    const sample = Math.max(0, contraction * amplitudeBase + noise)
    waveform.push(round(sample, 3))
  }

  return waveform
}

function computeRms(samples: number[]) {
  const sumSquares = samples.reduce((acc, value) => acc + value * value, 0)
  return Math.sqrt(sumSquares / samples.length)
}

function computeIemg(samples: number[], dtSeconds: number) {
  const area = samples.reduce((acc, value) => acc + Math.abs(value), 0) * dtSeconds
  return area
}

function buildSimulationFromDraft(
  draft: SessionDraft,
): SessionSimulationResult {
  const now = new Date()
  const eventCount = randomInt(10, 40)
  const threshold = draft.config!.config_threshold_uv
  const events: EventoContraccion[] = []
  let currentTimestamp = 0

  for (let index = 0; index < eventCount; index += 1) {
    const duration = round(randomBetween(0.3, 1.2), 3)
    const forceEffective = index === 0
    const waveform = generateWaveform(threshold, forceEffective)
    const peakUv = Math.max(...waveform)
    const rms = computeRms(waveform)
    const dt = duration / waveform.length
    const iemg = computeIemg(waveform, dt)
    const gapBefore = round(randomBetween(0.15, 0.75), 3)
    currentTimestamp = round(currentTimestamp + gapBefore, 3)

    events.push({
      id_evento: `DRAFT-E-${String(index + 1).padStart(3, '0')}`,
      id_sesion: 'DRAFT',
      numero_orden: index + 1,
      timestamp_segundos: currentTimestamp,
      peak_uv: round(peakUv, 3),
      rms: round(rms, 3),
      iemg: round(iemg, 3),
      duracion_segundos: duration,
      waveform_data: waveform,
    })

    currentTimestamp = round(currentTimestamp + duration, 3)
  }

  const effectiveCount = events.filter(
    (event) => event.peak_uv >= threshold,
  ).length
  const avgPeak =
    events.reduce((acc, event) => acc + event.peak_uv, 0) / events.length
  const avgRms =
    events.reduce((acc, event) => acc + event.rms, 0) / events.length
  const avgIemg =
    events.reduce((acc, event) => acc + event.iemg, 0) / events.length
  const avgDuration =
    events.reduce((acc, event) => acc + event.duracion_segundos, 0) /
    events.length

  const report: SesionEmg = {
    id_sesion: 'DRAFT',
    id_paciente: draft.id_paciente,
    nombre_reporte: `Reporte ${now.toISOString().slice(0, 16).replace('T', ' ')}`,
    fecha_hora: now,
    musculo: draft.calibration!.musculo,
    config_gain: draft.config!.config_gain,
    config_offset_mv: draft.config!.config_offset_mv,
    config_threshold_uv: draft.config!.config_threshold_uv,
    tiempo_juego_segundos: draft.config!.tiempo_juego_segundos,
    total_contracciones: events.length,
    total_patitos: events.length,
    stat_avg_peak: round(avgPeak, 3),
    stat_avg_rms: round(avgRms, 3),
    stat_avg_iemg: round(avgIemg, 3),
    stat_avg_duracion: round(avgDuration, 3),
  }

  return {
    report,
    events,
    total_contracciones_efectivas: effectiveCount,
  }
}

function buildPatientRowsForCsv(patients: Paciente[]) {
  const headers = [
    'id_paciente',
    'nombre_completo',
    'edad',
    'genero',
    'lado_trabajo',
    'fecha_registro',
    'session_count',
    'last_session_date',
  ]

  const rows = patients.map((patient) => {
    const sessions = store.sessions
      .filter((session) => session.id_paciente === patient.id_paciente)
      .sort((a, b) => b.fecha_hora.getTime() - a.fecha_hora.getTime())
    const lastSessionDate = sessions[0]?.fecha_hora?.toISOString() ?? ''
    const values = [
      patient.id_paciente,
      `${patient.nombre} ${patient.apellidos}`,
      patient.edad,
      patient.genero,
      patient.lado_trabajo,
      patient.fecha_registro.toISOString(),
      sessions.length,
      lastSessionDate,
    ]

    return values
      .map((value) => {
        const normalized = String(value)
        if (!/[",\n]/.test(normalized)) {
          return normalized
        }
        return `"${normalized.replaceAll('"', '""')}"`
      })
      .join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}

function getPatientByIdInternal(patientId: string) {
  return store.patients.find((patient) => patient.id_paciente === patientId)
}

export function authLogin(id_medico: string, password: string): Doctor | null {
  const doctor = store.doctors.find((item) => item.id_medico === id_medico)
  if (!doctor || !doctor.password_hash) {
    return null
  }
  const valid = bcrypt.compareSync(password, doctor.password_hash)
  return valid ? cloneDoctor(doctor) : null
}

export function listPatients(id_medico: string): Paciente[] {
  return store.patients
    .filter((patient) => patient.id_medico === id_medico)
    .sort(
      (a, b) => b.fecha_registro.getTime() - a.fecha_registro.getTime(),
    )
    .map(clonePatient)
}

export function createPatient(
  input: Omit<Paciente, 'id_paciente' | 'fecha_registro'>,
): Paciente {
  const patientId = getNextNumericId(
    'P-',
    store.patients.map((patient) => patient.id_paciente),
  )
  const patient: Paciente = {
    ...input,
    id_paciente: patientId,
    fecha_registro: new Date(),
  }
  store.patients.push(patient)
  return clonePatient(patient)
}

export function getPatientById(patientId: string): Paciente | undefined {
  const patient = getPatientByIdInternal(patientId)
  return patient ? clonePatient(patient) : undefined
}

export function listSessions(patientId: string): SesionEmg[] {
  return store.sessions
    .filter((session) => session.id_paciente === patientId)
    .sort((a, b) => b.fecha_hora.getTime() - a.fecha_hora.getTime())
    .map(cloneSession)
}

export function listReports(id_medico: string): ReportListItem[] {
  const doctorPatients = new Set(
    store.patients
      .filter((patient) => patient.id_medico === id_medico)
      .map((patient) => patient.id_paciente),
  )

  return store.sessions
    .filter((session) => doctorPatients.has(session.id_paciente))
    .sort((a, b) => b.fecha_hora.getTime() - a.fecha_hora.getTime())
    .map((session) => {
      const patient = getPatientByIdInternal(session.id_paciente)
      if (!patient) {
        throw new Error('Paciente no encontrado para sesion.')
      }
      return {
        session: cloneSession(session),
        patient: clonePatient(patient),
      }
    })
}

export function createSessionDraft(patientId: string): SessionDraft {
  const patient = getPatientByIdInternal(patientId)
  if (!patient) {
    throw new Error('Paciente no encontrado.')
  }
  store.sessionDraft = {
    id_paciente: patientId,
    fecha_creacion: new Date(),
  }
  return cloneDraft(store.sessionDraft)
}

export function getCurrentSessionDraft(): SessionDraft | null {
  return store.sessionDraft ? cloneDraft(store.sessionDraft) : null
}

export function clearSessionDraft() {
  store.sessionDraft = null
}

export function setCalibrationDraft(
  calibration: CalibrationDraft,
): SessionDraft {
  const draft = getRequiredDraft()
  draft.calibration = {
    ...calibration,
    mvc_uv: round(calibration.mvc_uv, 3),
    threshold_uv: round(calibration.threshold_uv, 3),
  }
  return cloneDraft(draft)
}

export function setPreGameConfigDraft(config: PreGameConfig): SessionDraft {
  const draft = getRequiredDraft()
  draft.config = {
    ...config,
    config_gain: round(config.config_gain, 3),
    config_offset_mv: round(config.config_offset_mv, 3),
    config_threshold_uv: round(config.config_threshold_uv, 3),
    tiempo_juego_segundos: Math.round(config.tiempo_juego_segundos),
  }
  return cloneDraft(draft)
}

export function finalizeSessionFromSimulation(): SessionSimulationResult {
  const draft = getRequiredDraftWithConfig()
  draft.simulation = buildSimulationFromDraft(draft)
  return cloneSimulation(draft.simulation)
}

export function saveSessionFromDraft(reportName: string) {
  const draft = getRequiredDraftWithConfig()
  if (!draft.simulation) {
    throw new Error('No hay resultados simulados para guardar.')
  }

  const trimmedReportName = reportName.trim()
  if (!trimmedReportName) {
    throw new Error('El nombre del reporte no puede estar vacio.')
  }

  if (draft.simulation.saved_session_id) {
    const existing = store.sessions.find(
      (session) => session.id_sesion === draft.simulation!.saved_session_id,
    )
    if (existing) {
      existing.nombre_reporte = trimmedReportName
      draft.simulation.report.nombre_reporte = trimmedReportName
      return {
        session: cloneSession(existing),
        events: store.events
          .filter((event) => event.id_sesion === existing.id_sesion)
          .sort((a, b) => a.numero_orden - b.numero_orden)
          .map(cloneEvent),
      }
    }
  }

  const sessionId = getNextNumericId(
    'S-',
    store.sessions.map((session) => session.id_sesion),
  )

  const persistedSession: SesionEmg = {
    ...draft.simulation.report,
    id_sesion: sessionId,
    nombre_reporte: trimmedReportName,
    fecha_hora: new Date(draft.simulation.report.fecha_hora),
  }

  let eventSequence = store.events.reduce((acc, event) => {
    const numeric = Number.parseInt(event.id_evento.replace('E-', ''), 10)
    if (Number.isNaN(numeric)) {
      return acc
    }
    return Math.max(acc, numeric)
  }, 0)

  const persistedEvents = draft.simulation.events.map((event) => {
    eventSequence += 1
    const persistedEvent: EventoContraccion = {
      ...event,
      id_evento: `E-${String(eventSequence).padStart(6, '0')}`,
      id_sesion: sessionId,
      waveform_data: [...event.waveform_data],
    }
    return persistedEvent
  })

  store.sessions.push(persistedSession)
  store.events.push(...persistedEvents)
  draft.simulation.saved_session_id = sessionId
  draft.simulation.report = cloneSession(persistedSession)
  draft.simulation.events = persistedEvents.map(cloneEvent)

  return {
    session: cloneSession(persistedSession),
    events: persistedEvents.map(cloneEvent),
  }
}

export function deleteSession(sessionId: string): boolean {
  const sessionLengthBefore = store.sessions.length
  store.sessions = store.sessions.filter((session) => session.id_sesion !== sessionId)
  store.events = store.events.filter((event) => event.id_sesion !== sessionId)

  if (
    store.sessionDraft?.simulation?.saved_session_id &&
    store.sessionDraft.simulation.saved_session_id === sessionId
  ) {
    store.sessionDraft.simulation.saved_session_id = undefined
  }

  return store.sessions.length < sessionLengthBefore
}

export function exportPatientsCsv(id_medico: string): string {
  const patients = listPatients(id_medico)
  return buildPatientRowsForCsv(patients)
}

export function exportSessionEventsCsv(sessionId: string): string {
  const events = store.events
    .filter((event) => event.id_sesion === sessionId)
    .sort((a, b) => a.numero_orden - b.numero_orden)
    .map(cloneEvent)
  return eventsToCsv(events)
}

export function getSessionWithEvents(sessionId: string) {
  const session = store.sessions.find((item) => item.id_sesion === sessionId)
  if (!session) {
    return null
  }
  const patient = getPatientByIdInternal(session.id_paciente)
  if (!patient) {
    return null
  }
  const events = store.events
    .filter((event) => event.id_sesion === sessionId)
    .sort((a, b) => a.numero_orden - b.numero_orden)
    .map(cloneEvent)

  return {
    session: cloneSession(session),
    patient: clonePatient(patient),
    events,
  }
}

export function exportSessionJson(sessionId: string): string {
  const payload = getSessionWithEvents(sessionId)
  if (!payload) {
    throw new Error('Sesion no encontrada para exportar.')
  }
  return JSON.stringify(payload, null, 2)
}
