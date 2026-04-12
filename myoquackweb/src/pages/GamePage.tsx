import { useNavigate } from 'react-router-dom'
import { Card } from '../components/common/Card'
import { useAppState } from '../context/AppStateContext'
import { useToast } from '../context/ToastContext'

export function GamePage() {
  const navigate = useNavigate()
  const { selectedPatient, currentSessionDraft, simulateSessionEnd } = useAppState()
  const { addToast } = useToast()
  const calibration = currentSessionDraft?.calibration
  const config = currentSessionDraft?.config

  if (!selectedPatient || !currentSessionDraft || !calibration || !config) {
    return (
      <Card title="Vista del juego" subtitle="RF-06 (sin logica de juego)">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Falta informacion de configuracion previa. Complete calibracion y
          configuracion antes de entrar al juego.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => navigate('/pre-game')}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Ir a configuracion
          </button>
          <button
            type="button"
            onClick={() => navigate('/records')}
            className="rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary dark:border-blue-400 dark:text-blue-200"
          >
            Ir a Registros
          </button>
        </div>
      </Card>
    )
  }

  return (
    <Card
      title="Juego (proximamente)"
      subtitle="El juego real no esta implementado. Esta vista solo simula el fin de la sesion."
      className="w-full"
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-blue-100 bg-softBlue p-4 dark:border-slate-700 dark:bg-slate-950">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Paciente y sesion activa
          </h3>
          <ul className="mt-3 space-y-1 text-sm text-textDark dark:text-slate-100">
            <li>
              <strong>Paciente:</strong> {selectedPatient.nombre} {selectedPatient.apellidos}
            </li>
            <li>
              <strong>ID:</strong> {selectedPatient.id_paciente}
            </li>
            <li>
              <strong>Musculo:</strong> {calibration.musculo}
            </li>
            <li>
              <strong>Ganancia:</strong> {config.config_gain}
            </li>
            <li>
              <strong>Desplazamiento:</strong> {config.config_offset_mv} mV
            </li>
            <li>
              <strong>Umbral:</strong> {config.config_threshold_uv} uV
            </li>
            <li>
              <strong>Tiempo:</strong> {config.tiempo_juego_segundos} s
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Presione el boton para simular el fin de sesion y generar automaticamente
            eventos de contraccion, metricas y reporte.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/pre-game')}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-600 dark:text-slate-100"
            >
              Volver a configuracion
            </button>
            <button
              type="button"
              onClick={() => {
                simulateSessionEnd()
                addToast('Sesion simulada. Revisa resultados.', 'success')
                navigate('/results')
              }}
              className="rounded-xl bg-accentYellow px-4 py-2 text-sm font-bold text-primary"
            >
              Simular fin de sesion
            </button>
          </div>
        </div>
      </div>
    </Card>
  )
}
