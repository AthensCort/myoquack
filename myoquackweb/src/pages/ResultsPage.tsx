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
      <Card title="Resultados de Sesion" subtitle="RF-07">
        <p className="text-sm text-slate-600">
          No hay resultados disponibles. Simule una sesion desde /game.
        </p>
        <button
          type="button"
          onClick={() => navigate('/game')}
          className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          Ir a Game
        </button>
      </Card>
    )
  }

  const metrics = [
    {
      label: 'Contracciones efectivas',
      value: simulation.total_contracciones_efectivas,
    },
    { label: 'Total patitos', value: simulation.report.total_patitos },
    { label: 'Avg Peak (uV)', value: formatNumber(simulation.report.stat_avg_peak) },
    { label: 'Avg RMS', value: formatNumber(simulation.report.stat_avg_rms) },
    { label: 'Avg IEMG', value: formatNumber(simulation.report.stat_avg_iemg) },
    {
      label: 'Avg Duracion (s)',
      value: formatNumber(simulation.report.stat_avg_duracion),
    },
  ]

  const waveformData =
    selectedWaveformEvent?.waveform_data.map((value, index) => ({
      sample: index,
      uv: value,
    })) ?? []

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
        downloadJson(`session_${saved.session.id_sesion}_report.json`, {
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
      `draft_report_${selectedPatient.id_paciente}_${new Date()
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
      `draft_events_${selectedPatient.id_paciente}.csv`,
      eventsToCsv(events),
      'text/csv;charset=utf-8',
    )
  }

  return (
    <div className="space-y-6">
      <Card title="Resultados de Sesion (RF-07)">
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
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
            <p className="mt-1 text-xs text-slate-500">
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
              Save Session
            </button>
            <button
              type="button"
              onClick={saveAndDownload}
              className="w-full rounded-xl bg-accentYellow px-4 py-2 text-sm font-bold text-primary sm:w-auto"
            >
              Save & Download
            </button>
            <button
              type="button"
              onClick={downloadCurrentReport}
              className="w-full rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary sm:w-auto"
            >
              Download Report (JSON)
            </button>
            <button
              type="button"
              onClick={() => downloadEventsCsv(simulation.events)}
              className="w-full rounded-xl border border-primary2 px-4 py-2 text-sm font-semibold text-primary2 sm:w-auto"
            >
              Download CSV events
            </button>
            <button
              type="button"
              onClick={() => navigate('/records')}
              className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold sm:w-auto"
            >
              Back to Records
            </button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label} className="p-4" title={metric.label}>
            <p className="text-2xl font-black text-primary">{metric.value}</p>
          </Card>
        ))}
      </div>

      <Card title="Waveform Preview">
        {!selectedWaveformEvent ? (
          <p className="text-sm text-slate-600">No hay eventos para visualizar.</p>
        ) : (
          <div className="h-64 w-full sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={waveformData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
                <XAxis dataKey="sample" />
                <YAxis />
                <Tooltip />
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

      <Card title="Analisis por Contraccion">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] divide-y divide-blue-100 text-sm">
            <thead className="bg-softBlue text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <SortableHeader
                  label="#"
                  sortKey="numero_orden"
                  currentSort={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Timestamp (s)"
                  sortKey="timestamp_segundos"
                  currentSort={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Peak (uV)"
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
            <tbody className="divide-y divide-blue-50">
              {sortedEvents.map((event) => (
                <tr
                  key={event.id_evento}
                  onClick={() => setSelectedEventId(event.id_evento)}
                  className={`cursor-pointer transition ${
                    event.id_evento === selectedWaveformEvent?.id_evento
                      ? 'bg-blue-50'
                      : 'hover:bg-slate-50'
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
        className="inline-flex items-center gap-1 font-semibold text-slate-700"
      >
        {label}
        <span className="text-[10px]">{active ? (direction === 'asc' ? '▲' : '▼') : ''}</span>
      </button>
    </th>
  )
}
