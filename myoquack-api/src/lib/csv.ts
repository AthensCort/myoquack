interface PatientCsvRow {
  id_paciente: string;
  nombre_completo: string;
  edad: number;
  genero: string;
  lado_trabajo: string;
  fecha_registro: string;
  session_count: number;
  last_session_date: string;
}

interface EventCsvRow {
  id_evento: string;
  id_sesion: string;
  numero_orden: number;
  timestamp_segundos: number;
  peak_uv: number;
  rms: number;
  iemg: number;
  duracion_segundos: number;
  waveform_data: number[];
}

function escapeCsv(value: string | number) {
  const normalized = String(value);
  if (!/[",\n]/.test(normalized)) {
    return normalized;
  }

  return `"${normalized.split('"').join('""')}"`;
}

export function buildPatientsCsv(rows: PatientCsvRow[]) {
  const headers = [
    "id_paciente",
    "nombre_completo",
    "edad",
    "genero",
    "lado_trabajo",
    "fecha_registro",
    "session_count",
    "last_session_date",
  ];

  const csvRows = rows.map((row) =>
    [
      row.id_paciente,
      row.nombre_completo,
      row.edad,
      row.genero,
      row.lado_trabajo,
      row.fecha_registro,
      row.session_count,
      row.last_session_date,
    ]
      .map(escapeCsv)
      .join(","),
  );

  return [headers.join(","), ...csvRows].join("\n");
}

export function buildEventsCsv(rows: EventCsvRow[]) {
  const headers = [
    "id_evento",
    "id_sesion",
    "numero_orden",
    "timestamp_segundos",
    "peak_uv",
    "rms",
    "iemg",
    "duracion_segundos",
    "waveform_data",
  ];

  const csvRows = rows.map((row) =>
    [
      row.id_evento,
      row.id_sesion,
      row.numero_orden,
      row.timestamp_segundos,
      row.peak_uv,
      row.rms,
      row.iemg,
      row.duracion_segundos,
      JSON.stringify(row.waveform_data),
    ]
      .map(escapeCsv)
      .join(","),
  );

  return [headers.join(","), ...csvRows].join("\n");
}
