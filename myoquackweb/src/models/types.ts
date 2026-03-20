export type Genero = 'M' | 'F' | 'O'
export type LadoTrabajo = 'Izquierdo' | 'Derecho' | 'Ambos'
export type MusculoTrabajo =
  | 'Gluteus Medius'
  | 'Quadriceps'
  | 'Hamstrings'
  | 'Tibialis Anterior'
  | 'Gastrocnemius'

export interface Doctor {
  id_medico: string
  password_hash?: string
  nombre_completo: string
  fecha_creacion?: Date
}

export interface Paciente {
  id_paciente: string
  id_medico: string
  nombre: string
  apellidos: string
  edad: number
  genero: Genero
  lado_trabajo: LadoTrabajo
  notas_clinicas: string
  fecha_registro: Date
}

export interface SesionEmg {
  id_sesion: string
  id_paciente: string
  nombre_reporte: string
  fecha_hora: Date
  musculo: MusculoTrabajo
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

export interface EventoContraccion {
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

export interface CalibrationDraft {
  musculo: MusculoTrabajo
  mvc_uv: number
  threshold_uv: number
}

export interface PreGameConfig {
  config_gain: number
  config_offset_mv: number
  config_threshold_uv: number
  tiempo_juego_segundos: number
}

export interface SessionSimulationResult {
  report: SesionEmg
  events: EventoContraccion[]
  total_contracciones_efectivas: number
  saved_session_id?: string
}

export interface SessionDraft {
  id_paciente: string
  calibration?: CalibrationDraft
  config?: PreGameConfig
  simulation?: SessionSimulationResult
  fecha_creacion: Date
}

export interface ReportListItem {
  session: SesionEmg
  patient: Paciente
}
