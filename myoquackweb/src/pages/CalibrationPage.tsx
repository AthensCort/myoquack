import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/common/Card'
import { useAppState } from '../context/AppStateContext'
import { useToast } from '../context/ToastContext'
import { MUSCLE_OPTIONS } from '../data/seed'
import type { MusculoTrabajo } from '../models/types'
import { formatNumber } from '../utils/format'

export function CalibrationPage() {
  const navigate = useNavigate()
  const {
    selectedPatient,
    selectedPatientId,
    currentSessionDraft,
    startSessionDraft,
    setCalibrationDraft,
  } = useAppState()
  const { addToast } = useToast()
  const timerRef = useRef<number | null>(null)
  const initialMuscle = currentSessionDraft?.calibration?.musculo ?? MUSCLE_OPTIONS[0]
  const [musculo, setMusculo] = useState<MusculoTrabajo>(initialMuscle)
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [currentEmgUv, setCurrentEmgUv] = useState(0)
  const [mvcUv, setMvcUv] = useState(currentSessionDraft?.calibration?.mvc_uv ?? 0)
  const [thresholdUv, setThresholdUv] = useState(
    currentSessionDraft?.calibration?.threshold_uv ?? 0,
  )

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!isCalibrating) {
      return
    }

    timerRef.current = window.setInterval(() => {
      const emgValue = Number((Math.random() * 2200 + 100).toFixed(2))
      setCurrentEmgUv(emgValue)
      setMvcUv((previous) => Math.max(previous, emgValue))
    }, 180)

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
      }
    }
  }, [isCalibrating])

  const barPercentage = useMemo(() => {
    const visualMax = Math.max(2500, mvcUv, 1)
    return Math.min((currentEmgUv / visualMax) * 100, 100)
  }, [currentEmgUv, mvcUv])

  if (!selectedPatient) {
    return (
      <Card title="Calibracion EMG" subtitle="RF-04">
        <p className="text-sm text-slate-600">
          No hay paciente seleccionado. Seleccione un paciente desde Registros.
        </p>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigate('/records')}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Ir a Registros
          </button>
        </div>
      </Card>
    )
  }

  if (!currentSessionDraft) {
    return (
      <Card title="Calibracion EMG" subtitle="RF-04">
        <p className="text-sm text-slate-600">
          Necesita crear una sesion nueva para iniciar calibracion.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (!selectedPatientId) {
                return
              }
              startSessionDraft(selectedPatientId)
            }}
            className="rounded-xl bg-accentYellow px-4 py-2 text-sm font-bold text-primary"
          >
            Crear Borrador
          </button>
          <button
            type="button"
            onClick={() => navigate('/records')}
            className="rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary"
          >
            Volver
          </button>
        </div>
      </Card>
    )
  }

  const startCalibration = () => {
    setMvcUv(0)
    setThresholdUv(0)
    setCurrentEmgUv(0)
    setIsCalibrating(true)
  }

  const finishCalibration = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
    }
    setIsCalibrating(false)

    if (mvcUv <= 0) {
      addToast('No se detectaron senales. Repita la calibracion.', 'error')
      return
    }

    const threshold = Number((mvcUv * 0.7).toFixed(2))
    setThresholdUv(threshold)
    setCalibrationDraft({
      musculo,
      mvc_uv: mvcUv,
      threshold_uv: threshold,
    })
    addToast('Calibracion finalizada. Threshold calculado al 70% MVC.', 'success')
    navigate('/pre-game')
  }

  return (
    <Card
      title="EMG Calibration"
      subtitle={`Paciente: ${selectedPatient.nombre} ${selectedPatient.apellidos}`}
      className="w-full"
    >
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <div>
            <label htmlFor="musculo" className="mb-1 block text-sm font-semibold">
              Musculo de trabajo
            </label>
            <select
              id="musculo"
              value={musculo}
              onChange={(event) => setMusculo(event.target.value as MusculoTrabajo)}
              disabled={isCalibrating}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              {MUSCLE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            {!isCalibrating ? (
              <button
                type="button"
                onClick={startCalibration}
                className="rounded-xl bg-accentYellow px-4 py-2 text-sm font-bold text-primary"
              >
                Start Calibration
              </button>
            ) : (
              <button
                type="button"
                onClick={finishCalibration}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                Finish Calibration
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/records')}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold"
            >
              Cancelar
            </button>
          </div>

          <div className="rounded-xl border border-blue-100 bg-softBlue p-4 text-sm">
            <p>
              <strong>EMG actual:</strong> {formatNumber(currentEmgUv)} uV
            </p>
            <p>
              <strong>MVC:</strong> {formatNumber(mvcUv)} uV
            </p>
            <p>
              <strong>Threshold (70% MVC):</strong> {formatNumber(thresholdUv)} uV
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-blue-100 bg-white p-6">
          <p className="text-sm font-semibold text-textDark">Visualizacion en tiempo real</p>
          <div className="h-8 w-full overflow-hidden rounded-full bg-blue-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accentBlue to-primary transition-[width] duration-150"
              style={{ width: `${barPercentage}%` }}
              aria-hidden
            />
          </div>
          <p className="text-xs text-slate-500">
            Barra normalizada segun valor MVC y rango visual maximo.
          </p>
        </div>
      </div>
    </Card>
  )
}
