import { useEffect, useRef, useState } from 'react'
import { Card } from '../components/common/Card'
import { useAppState } from '../context/AppStateContext'
import { useToast } from '../context/ToastContext'
import type { EventoContraccion, SesionEmg } from '../models/types'
import { getApiBaseUrl } from '../services/api'
import { saveEsp32TestSessionToApi } from '../services/backend'
import { formatDateTime, formatNumber } from '../utils/format'

interface LedEvent {
  id: number
  createdAt: Date
}

function buildLedEventForApi(count: number, startedAt: Date): EventoContraccion {
  return {
    id_evento: 'LED-DRAFT-001',
    id_sesion: 'DRAFT',
    numero_orden: 1,
    timestamp_segundos: 0,
    peak_uv: count,
    rms: count,
    iemg: count,
    duracion_segundos: Math.max((Date.now() - startedAt.getTime()) / 1000, 1),
    waveform_data: [count],
  }
}

export function TestEsp32Page() {
  const apiUrl = getApiBaseUrl()
  const {
    patients,
    reports,
    selectedPatient,
    selectedPatientId,
    setSelectedPatientId,
    refresh,
  } = useAppState()
  const { addToast } = useToast()
  const [events, setEvents] = useState<LedEvent[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isCopying, setIsCopying] = useState(false)
  const [reportName, setReportName] = useState('Prueba LED WiFi ESP32')
  const startedAtRef = useRef(new Date())
  const refreshRef = useRef(refresh)

  const ledCount = events.length
  const lastEvent = events[events.length - 1] ?? null
  const ledReports = reports
    .filter(({ session }) =>
      session.nombre_reporte.toLowerCase().includes('led'),
    )
    .slice(0, 5)
  const latestSavedLedReport = ledReports[0] ?? null

  useEffect(() => {
    refreshRef.current = refresh
  }, [refresh])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refreshRef.current()
    }, 5000)

    return () => window.clearInterval(intervalId)
  }, [])

  const registerLedOn = () => {
    setEvents((current) => [
      ...current,
      {
        id: current.length + 1,
        createdAt: new Date(),
      },
    ])
  }

  const copyCurrentToken = async () => {
    setIsCopying(true)
    try {
      const storedValue = window.localStorage.getItem('myoquack.auth')
      if (!storedValue) {
        throw new Error('No hay una sesion guardada en este navegador.')
      }

      const parsed = JSON.parse(storedValue) as { token?: string }
      if (!parsed.token) {
        throw new Error('No encontre el token de sesion.')
      }

      await navigator.clipboard.writeText(parsed.token)
      addToast('Token copiado. Pegalo en ESP32/LedCounterWiFi/LedCounterWiFi.ino.', 'success')
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'No fue posible copiar el token.',
        'error',
      )
    } finally {
      setIsCopying(false)
    }
  }

  const saveLedTest = async () => {
    if (!selectedPatient) {
      addToast('Selecciona un paciente antes de guardar la prueba.', 'error')
      return
    }

    if (ledCount === 0) {
      addToast('Todavia no hay encendidos de LED para guardar.', 'error')
      return
    }

    const event = buildLedEventForApi(ledCount, startedAtRef.current)
    const report: SesionEmg = {
      id_sesion: 'DRAFT',
      id_paciente: selectedPatient.id_paciente,
      nombre_reporte: reportName,
      fecha_hora: new Date(),
      musculo: 'Tibialis Anterior',
      config_gain: 1,
      config_offset_mv: 0,
      config_threshold_uv: 1,
      tiempo_juego_segundos: Math.ceil(event.duracion_segundos),
      total_contracciones: ledCount,
      total_patitos: ledCount,
      stat_avg_peak: ledCount,
      stat_avg_rms: ledCount,
      stat_avg_iemg: ledCount,
      stat_avg_duracion: event.duracion_segundos,
    }

    setIsSaving(true)
    try {
      const saved = await saveEsp32TestSessionToApi(reportName, report, [event])
      await refresh()
      addToast(`Prueba LED guardada como sesion ${saved.session.id_sesion}.`, 'success')
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'No fue posible guardar la prueba LED.',
        'error',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card
        title="Test-Esp32"
        subtitle="Prueba simple por WiFi: contar cuantas veces se enciende el LED del ESP32"
        actions={
          <button
            type="button"
            onClick={() => void refresh()}
            className="w-full rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary dark:border-blue-400 dark:text-blue-200 sm:w-auto"
          >
            Refrescar reportes
          </button>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <div className="rounded-xl border border-blue-100 bg-softBlue p-4 dark:border-slate-700 dark:bg-slate-950">
              <p className="text-sm font-semibold text-textDark dark:text-slate-50">
                Como funciona por WiFi
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                El ESP32 se conecta a tu WiFi, prende su LED y manda el conteo a
                Railway con `POST /sesiones`. Tu pagina en Vercel no tiene que estar
                conectada al ESP32; lee lo que quedo en la base de datos y actualiza
                esta vista automaticamente cada 5 segundos.
              </p>
              <p className="mt-3 text-xs font-semibold text-primary dark:text-blue-200">
                API actual: {apiUrl}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-blue-100 p-4 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">Ultimo ESP32 guardado</p>
                <p className="mt-1 text-4xl font-black text-primary dark:text-blue-200">
                  {latestSavedLedReport
                    ? formatNumber(latestSavedLedReport.session.stat_avg_peak)
                    : '--'}
                </p>
              </div>
              <div className="rounded-xl border border-blue-100 p-4 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">Simulacion local web</p>
                <p className="mt-1 text-4xl font-black text-primary dark:text-blue-200">
                  {formatNumber(ledCount)}
                </p>
              </div>
              <div className="rounded-xl border border-blue-100 p-4 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">Ultimo evento</p>
                <p className="mt-2 text-sm font-bold text-textDark dark:text-slate-50">
                  {lastEvent ? lastEvent.createdAt.toLocaleTimeString('es-MX') : 'Ninguno'}
                </p>
              </div>
              <div className="rounded-xl border border-blue-100 p-4 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">Paciente</p>
                <p className="mt-2 text-sm font-bold text-textDark dark:text-slate-50">
                  {selectedPatientId ?? 'Sin seleccionar'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={registerLedOn}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                Simular LED encendido
              </button>
              <button
                type="button"
                onClick={() => {
                  setEvents([])
                  startedAtRef.current = new Date()
                }}
                className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 dark:text-rose-300"
              >
                Reiniciar simulacion
              </button>
              <button
                type="button"
                onClick={saveLedTest}
                disabled={isSaving || ledCount === 0 || !selectedPatient}
                className="rounded-xl bg-accentYellow px-4 py-2 text-sm font-bold text-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? 'Guardando...' : 'Guardar simulacion'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <label htmlFor="led-patient" className="block text-sm font-semibold">
              Paciente para la prueba
            </label>
            <select
              id="led-patient"
              value={selectedPatientId ?? ''}
              onChange={(event) => setSelectedPatientId(event.target.value || null)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">Selecciona un paciente</option>
              {patients.map((patient) => (
                <option key={patient.id_paciente} value={patient.id_paciente}>
                  {patient.id_paciente} - {patient.nombre} {patient.apellidos}
                </option>
              ))}
            </select>

            <label htmlFor="led-report-name" className="block text-sm font-semibold">
              Nombre del reporte
            </label>
            <input
              id="led-report-name"
              type="text"
              value={reportName}
              onChange={(event) => setReportName(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />

            <button
              type="button"
              onClick={copyCurrentToken}
              disabled={isCopying}
              className="w-full rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary dark:border-blue-400 dark:text-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCopying ? 'Copiando...' : 'Copiar token para ESP32'}
            </button>

            <div className="rounded-xl border border-blue-100 p-4 dark:border-slate-700">
              <p className="text-sm font-semibold text-textDark dark:text-slate-50">
                Valores que pegas en el sketch
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li>`API_URL`: {apiUrl}</li>
                <li>`PATIENT_ID`: {selectedPatientId ?? 'selecciona un paciente'}</li>
                <li>`JWT_TOKEN`: usa el boton de copiar token</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Ultimas pruebas LED guardadas">
        <div className="overflow-x-auto rounded-xl border border-blue-100 dark:border-slate-700">
          <table className="w-full min-w-[620px] divide-y divide-blue-100 text-sm dark:divide-slate-700">
            <thead className="bg-softBlue text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="px-3 py-2">Sesion</th>
                <th className="px-3 py-2">Paciente</th>
                <th className="px-3 py-2">Reporte</th>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Conteo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50 dark:divide-slate-800">
              {ledReports.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400" colSpan={5}>
                    No hay pruebas LED guardadas todavia.
                  </td>
                </tr>
              )}
              {ledReports.map(({ session, patient }) => (
                <tr key={session.id_sesion} className="hover:bg-slate-50 dark:hover:bg-slate-800/70">
                  <td className="px-3 py-2 font-semibold">{session.id_sesion}</td>
                  <td className="px-3 py-2">
                    {patient.nombre} {patient.apellidos}
                  </td>
                  <td className="px-3 py-2">{session.nombre_reporte}</td>
                  <td className="px-3 py-2">{formatDateTime(session.fecha_hora)}</td>
                  <td className="px-3 py-2 font-bold">{formatNumber(session.stat_avg_peak)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Pasos para hacerlo">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-blue-100 p-4 dark:border-slate-700">
            <p className="font-semibold text-textDark dark:text-slate-50">1. Edita el sketch</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Abre `ESP32/LedCounterWiFi/LedCounterWiFi.ino` y cambia WiFi, token y
              paciente.
            </p>
          </div>
          <div className="rounded-xl border border-blue-100 p-4 dark:border-slate-700">
            <p className="font-semibold text-textDark dark:text-slate-50">2. Sube al ESP32</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Usa Arduino IDE, placa ESP32, velocidad serial 115200 y sube el codigo.
            </p>
          </div>
          <div className="rounded-xl border border-blue-100 p-4 dark:border-slate-700">
            <p className="font-semibold text-textDark dark:text-slate-50">3. Revisa la pagina</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Cuando el ESP32 mande el conteo, presiona `Refrescar reportes` para verlo.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
