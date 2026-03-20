import type {
  CalibrationDraft,
  EventoContraccion,
  PreGameConfig,
  SesionEmg,
  SessionDraft,
  SessionSimulationResult,
} from '../models/types'

interface DraftStore {
  sessionDraft: SessionDraft | null
}

const store: DraftStore = {
  sessionDraft: null,
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

function cloneSimulation(
  simulation: SessionSimulationResult,
): SessionSimulationResult {
  return {
    ...simulation,
    report: cloneSession(simulation.report),
    events: simulation.events.map(cloneEvent),
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

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function randomInt(min: number, max: number) {
  return Math.floor(randomBetween(min, max + 1))
}

function round(value: number, decimals = 2) {
  return Number(value.toFixed(decimals))
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

export function createSessionDraft(patientId: string): SessionDraft {
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

export function clearSessionDraftForPatient(patientId: string) {
  if (store.sessionDraft?.id_paciente === patientId) {
    store.sessionDraft = null
  }
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

export function markDraftSessionSaved(
  session: SesionEmg,
  events: EventoContraccion[],
) {
  const draft = getRequiredDraftWithConfig()
  if (!draft.simulation) {
    throw new Error('No hay resultados simulados para guardar.')
  }

  draft.simulation.saved_session_id = session.id_sesion
  draft.simulation.report = cloneSession(session)
  draft.simulation.events = events.map(cloneEvent)
  return cloneDraft(draft)
}

export function clearSavedSessionReference(sessionId: string) {
  if (store.sessionDraft?.simulation?.saved_session_id === sessionId) {
    store.sessionDraft.simulation.saved_session_id = undefined
  }
}
