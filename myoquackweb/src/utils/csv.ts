import type { EventoContraccion } from '../models/types'

function escapeCsv(value: string | number) {
  const normalized = String(value)
  if (!/[",\n]/.test(normalized)) {
    return normalized
  }
  return `"${normalized.replaceAll('"', '""')}"`
}

export function eventsToCsv(events: EventoContraccion[]) {
  const headers = [
    'id_evento',
    'id_sesion',
    'numero_orden',
    'timestamp_segundos',
    'peak_uv',
    'rms',
    'iemg',
    'duracion_segundos',
    'waveform_data',
  ]

  const rows = events.map((event) =>
    [
      event.id_evento,
      event.id_sesion,
      event.numero_orden,
      event.timestamp_segundos,
      event.peak_uv,
      event.rms,
      event.iemg,
      event.duracion_segundos,
      JSON.stringify(event.waveform_data),
    ]
      .map(escapeCsv)
      .join(','),
  )

  return [headers.join(','), ...rows].join('\n')
}
