import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '../components/common/Card'
import { useAppState } from '../context/AppStateContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import type { EventoContraccion } from '../models/types'
import { eventsToCsv } from '../utils/csv'
import { downloadJson, downloadTextFile } from '../utils/download'
import { formatDateTime, formatNumber } from '../utils/format'

type SortableKey =
  | 'numero_orden'
  | 'timestamp_segundos'
  | 'peak_uv'
  | 'rms'
  | 'iemg'
  | 'duracion_segundos'

export function ResultsPage() {
  const navigate = useNavigate()
  const {
    selectedPatient,
    currentSessionDraft,
    saveCurrentSession,
    downloadSessionEventsCsv,
    refresh,
  } = useAppState()
  const { theme } = useTheme()
  const { addToast } = useToast()
  const simulation = currentSessionDraft?.simulation
  const [reportName, setReportName] = useState(
    simulation?.report.nombre_reporte ?? 'Reporte EMG',
  )
  const [sortKey, setSortKey] = useState<SortableKey>('numero_orden')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    simulation?.events[0]?.id_evento ?? null,
  )

  useEffect(() => {
    setReportName(simulation?.report.nombre_reporte ?? 'Reporte EMG')
    setSelectedEventId(simulation?.events[0]?.id_evento ?? null)
  }, [simulation])

  const sortedEvents = useMemo(() => {
    if (!simulation) {
      return []
    }
    const factor = sortDirection === 'asc' ? 1 : -1
    return [...simulation.events].sort((a, b) => {
      return (a[sortKey] - b[sortKey]) * factor
    })
  }, [simulation, sortDirection, sortKey])

  const selectedWaveformEvent = useMemo(() => {
    if (sortedEvents.length === 0) {
      return null
    }
    return (
      sortedEvents.find((event) => event.id_evento === selectedEventId) ??
      sortedEvents[0]
    )
  }, [selectedEventId, sortedEvents])

  if (!simulation || !selectedPatient) {
    return (
      <Card title="Resultados de sesion" subtitle="RF-07">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          No hay resultados disponibles. Simule una sesion desde /game.
        </p>
        <button
          type="button"
          onClick={() => navigate('/game')}
          className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          Ir al juego
        </button>
      </Card>
    )
  }

  const metrics = [
    {
      label: 'Contracciones efectivas',
      value: simulation.total_contracciones_efectivas,
    },
    { label: 'Total de patitos', value: simulation.report.total_patitos },
    {
      label: 'Promedio de pico (uV)',
      value: formatNumber(simulation.report.stat_avg_peak),
    },
    { label: 'Promedio RMS', value: formatNumber(simulation.report.stat_avg_rms) },
    { label: 'Promedio IEMG', value: formatNumber(simulation.report.stat_avg_iemg) },
    {
      label: 'Promedio de duracion (s)',
      value: formatNumber(simulation.report.stat_avg_duracion),
    },
  ]

  const waveformData =
    selectedWaveformEvent?.waveform_data.map((value, index) => ({
      sample: index,
      uv: value,
    })) ?? []
  const isDark = theme === 'dark'

  const handleSort = (key: SortableKey) => {
    if (sortKey === key) {
      setSortDirection((previous) => (previous === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDirection('asc')
  }

  const saveSession = () => {
    void (async () => {
      try {
        const saved = await saveCurrentSession(reportName)
        addToast(`Sesion ${saved.session.id_sesion} guardada.`, 'success')
        await refresh()
      } catch (error) {
        addToast(
          error instanceof Error ? error.message : 'No fue posible guardar la sesion.',
          'error',
        )
      }
    })()
  }

  const saveAndDownload = () => {
    void (async () => {
      try {
        const saved = await saveCurrentSession(reportName)
        downloadJson(`sesion_${saved.session.id_sesion}_reporte.json`, {
          patient: selectedPatient,
          session: saved.session,
          eventos: saved.events,
          total_contracciones_efectivas: simulation.total_contracciones_efectivas,
        })
        addToast('Sesion guardada y reporte JSON descargado.', 'success')
        await refresh()
      } catch (error) {
        addToast(
          error instanceof Error ? error.message : 'No fue posible guardar la sesion.',
          'error',
        )
      }
    })()
  }

  const downloadCurrentReport = () => {
    downloadJson(
      `borrador_reporte_${selectedPatient.id_paciente}_${new Date()
        .toISOString()
        .slice(0, 19)
        .replaceAll(':', '-')}.json`,
      {
        patient: selectedPatient,
        report: {
          ...simulation.report,
          nombre_reporte: reportName,
        },
        total_contracciones_efectivas: simulation.total_contracciones_efectivas,
        eventos: simulation.events,
      },
    )
  }

  const downloadEventsCsv = (events: EventoContraccion[]) => {
    if (simulation.saved_session_id) {
      void downloadSessionEventsCsv(simulation.saved_session_id)
      return
    }
    downloadTextFile(
      `borrador_eventos_${selectedPatient.id_paciente}.csv`,
      eventsToCsv(events),
      'text/csv;charset=utf-8',
    )
  }

  return (
    <div className="space-y-6">
      <Card title="Resultados de sesion (RF-07)">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <label htmlFor="reportName" className="mb-1 block text-sm font-semibold">
              Nombre del reporte
            </label>
            <input
              id="reportName"
              type="text"
              value={reportName}
              onChange={(event) => setReportName(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Paciente {selectedPatient.id_paciente} | Fecha:{' '}
              {formatDateTime(simulation.report.fecha_hora)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <button
              type="button"
              onClick={saveSession}
              className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white sm:w-auto"
            >
              Guardar sesion
            </button>
            <button
              type="button"
              onClick={saveAndDownload}
              className="w-full rounded-xl bg-accentYellow px-4 py-2 text-sm font-bold text-primary sm:w-auto"
            >
              Guardar y descargar
            </button>
            <button
              type="button"
              onClick={downloadCurrentReport}
              className="w-full rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary dark:border-blue-400 dark:text-blue-200 sm:w-auto"
            >
              Descargar reporte (JSON)
            </button>
            <button
              type="button"
              onClick={() => downloadEventsCsv(simulation.events)}
              className="w-full rounded-xl border border-primary2 px-4 py-2 text-sm font-semibold text-primary2 dark:border-blue-400 dark:text-blue-200 sm:w-auto"
            >
              Descargar eventos en CSV
            </button>
            <button
              type="button"
              onClick={() => navigate('/records')}
              className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-600 dark:text-slate-100 sm:w-auto"
            >
              Volver a registros
            </button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label} className="p-4" title={metric.label}>
            <p className="text-2xl font-black text-primary dark:text-blue-200">{metric.value}</p>
          </Card>
        ))}
      </div>

      <Card title="Vista previa de la onda">
        {!selectedWaveformEvent ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">No hay eventos para visualizar.</p>
        ) : (
          <div className="h-64 w-full sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={waveformData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? '#334155' : '#dbeafe'}
                />
                <XAxis dataKey="sample" stroke={isDark ? '#cbd5e1' : '#475569'} />
                <YAxis stroke={isDark ? '#cbd5e1' : '#475569'} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#bfdbfe',
                    color: isDark ? '#f8fafc' : '#0f172a',
                  }}
                  labelStyle={{ color: isDark ? '#f8fafc' : '#0f172a' }}
                />
                <Line
                  type="monotone"
                  dataKey="uv"
                  stroke="#4B8BFF"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card title="Analisis por contraccion">
        <div className="overflow-x-auto rounded-xl border border-blue-100 dark:border-slate-700">
          <table className="w-full min-w-[720px] divide-y divide-blue-100 text-sm dark:divide-slate-700">
            <thead className="bg-softBlue text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <SortableHeader
                  label="#"
                  sortKey="numero_orden"
                  currentSort={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Tiempo (s)"
                  sortKey="timestamp_segundos"
                  currentSort={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Pico (uV)"
                  sortKey="peak_uv"
                  currentSort={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="RMS"
                  sortKey="rms"
                  currentSort={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="IEMG"
                  sortKey="iemg"
                  currentSort={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Duracion (s)"
                  sortKey="duracion_segundos"
                  currentSort={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50 dark:divide-slate-800">
              {sortedEvents.map((event) => (
                <tr
                  key={event.id_evento}
                  onClick={() => setSelectedEventId(event.id_evento)}
                  className={`cursor-pointer transition ${
                    event.id_evento === selectedWaveformEvent?.id_evento
                      ? 'bg-blue-50 dark:bg-blue-950/50'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <td className="px-3 py-2">{event.numero_orden}</td>
                  <td className="px-3 py-2">{formatNumber(event.timestamp_segundos, 3)}</td>
                  <td className="px-3 py-2">{formatNumber(event.peak_uv, 3)}</td>
                  <td className="px-3 py-2">{formatNumber(event.rms, 3)}</td>
                  <td className="px-3 py-2">{formatNumber(event.iemg, 3)}</td>
                  <td className="px-3 py-2">{formatNumber(event.duracion_segundos, 3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

interface SortableHeaderProps {
  label: string
  sortKey: SortableKey
  currentSort: SortableKey
  direction: 'asc' | 'desc'
  onSort: (sortKey: SortableKey) => void
}

function SortableHeader({
  label,
  sortKey,
  currentSort,
  direction,
  onSort,
}: SortableHeaderProps) {
  const active = currentSort === sortKey
  return (
    <th className="px-3 py-2">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200"
      >
        {label}
        <span className="text-[10px]">{active ? (direction === 'asc' ? '^' : 'v') : ''}</span>
      </button>
    </th>
  )
}
