import type {
  Doctor,
  EventoContraccion,
  Paciente,
  SesionEMG,
} from "@prisma/client";

function normalizeWaveformData(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((sample) => Number(sample));
}

export function serializeDoctor(doctor: Doctor) {
  return {
    id_medico: doctor.id_medico,
    nombre_completo: doctor.nombre_completo,
    fecha_creacion: doctor.fecha_creacion.toISOString(),
  };
}

export function serializePatient(patient: Paciente) {
  return {
    id_paciente: patient.id_paciente,
    id_medico: patient.id_medico,
    nombre: patient.nombre,
    apellidos: patient.apellidos,
    edad: patient.edad,
    genero: patient.genero,
    lado_trabajo: patient.lado_trabajo,
    notas_clinicas: patient.notas_clinicas ?? "",
    fecha_registro: patient.fecha_registro.toISOString(),
  };
}

export function serializeSession(session: SesionEMG, totalContracciones: number) {
  return {
    id_sesion: String(session.id_sesion),
    id_paciente: session.id_paciente,
    nombre_reporte: session.nombre_reporte ?? "",
    fecha_hora: session.fecha_hora.toISOString(),
    musculo: session.musculo,
    config_gain: session.config_gain,
    config_offset_mv: session.config_offset_mv,
    config_threshold_uv: session.config_threshold_uv,
    tiempo_juego_segundos: session.tiempo_juego_segundos,
    total_contracciones: totalContracciones,
    total_patitos: totalContracciones,
    stat_avg_peak: session.stat_avg_peak ?? 0,
    stat_avg_rms: session.stat_avg_rms ?? 0,
    stat_avg_iemg: session.stat_avg_iemg ?? 0,
    stat_avg_duracion: session.stat_avg_duracion ?? 0,
  };
}

export function serializeEvent(event: EventoContraccion) {
  return {
    id_evento: String(event.id_evento),
    id_sesion: String(event.id_sesion),
    numero_orden: event.numero_orden,
    timestamp_segundos: event.timestamp_segundos,
    peak_uv: event.peak_uv,
    rms: event.rms,
    iemg: event.iemg,
    duracion_segundos: event.duracion_segundos,
    waveform_data: normalizeWaveformData(event.waveform_data),
  };
}

export function buildSessionExport(
  session: SesionEMG,
  patient: Paciente,
  events: EventoContraccion[],
) {
  const serializedEvents = events.map(serializeEvent);
  const totalContraccionesEfectivas = events.filter(
    (event) => event.peak_uv >= session.config_threshold_uv,
  ).length;

  return {
    patient: serializePatient(patient),
    session: serializeSession(session, events.length),
    events: serializedEvents,
    total_contracciones_efectivas: totalContraccionesEfectivas,
  };
}
