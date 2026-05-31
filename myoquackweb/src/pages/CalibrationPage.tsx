import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHardware } from '../context/HardwareContext'
import { useToast } from '../context/ToastContext'
import { useAppState } from '../context/AppStateContext'
import { LineChart, Line, YAxis, ResponsiveContainer, CartesianGrid, XAxis, ReferenceLine } from 'recharts'
import type { MusculoTrabajo } from '../models/types'

export function CalibrationPage() {
  const { isConnected, emgValue, emgHistory } = useHardware()
  const { addToast } = useToast()
  
  const { selectedPatient, setCalibrationDraft, currentSessionDraft } = useAppState() 
  const navigate = useNavigate()

  const patientName = selectedPatient 
    ? `${selectedPatient.nombre} ${selectedPatient.apellidos || ''}`.trim() 
    : 'Ningún paciente seleccionado'

  const [isCalibrating, setIsCalibrating] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30)
  const [mvc, setMvc] = useState<number>(0) 
  const [selectedMuscle, setSelectedMuscle] = useState<MusculoTrabajo>('Gluteus Medius')

  const threshold = Math.round(mvc * 0.75)

  const saveCalibrationData = () => {
    try {
      setCalibrationDraft({
        musculo: selectedMuscle,
        mvc_uv: mvc,
        threshold_uv: threshold,
      })
      addToast('Calibración guardada exitosamente', 'success')
      navigate('/pre-game')
    } catch (error) {
      console.error("Error al guardar:", error)
      addToast('Error al guardar datos.', 'error')
    }
  }

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>
    
    if (isCalibrating && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
    } else if (isCalibrating && timeLeft === 0) {
      setIsCalibrating(false)
      saveCalibrationData()
    }
    
    return () => clearInterval(timer)
  }, [isCalibrating, timeLeft])

  useEffect(() => {
    if (isCalibrating && emgValue > mvc) {
      setMvc(emgValue)
    }
  }, [emgValue, isCalibrating])

  const handleStart = () => {
    if (!isConnected) {
      addToast('Conecta el dispositivo o usa el Modo Demo.', 'error')
      return
    }
    setMvc(0)
    setTimeLeft(30)
    setIsCalibrating(true)
  }

  const handleStopEarly = () => {
    setIsCalibrating(false)
    addToast('Calibración finalizada manualmente.', 'info')
    saveCalibrationData()
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black text-white">Calibración EMG</h1>
        <p className="mt-1 text-slate-400">Paciente: <span className="font-semibold text-white">{patientName}</span></p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300">Músculo a calibrar</label>
            <select 
              value={selectedMuscle}
              onChange={(e) => setSelectedMuscle(e.target.value as MusculoTrabajo)}
              disabled={isCalibrating}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white focus:border-accentYellow outline-none"
            >
              <option value="Gluteus Medius">Gluteus Medius</option>
              <option value="Biceps Brachii">Biceps Brachii</option>
              <option value="Quadriceps">Quadriceps</option>
            </select>
          </div>

          <div className="flex gap-3">
            {!isCalibrating ? (
              <button
                onClick={handleStart}
                disabled={!isConnected || !currentSessionDraft}
                className="flex-1 rounded-lg bg-accentYellow px-6 py-3 font-bold text-primary transition-colors hover:brightness-110 disabled:opacity-50"
              >
                Iniciar calibración
              </button>
            ) : (
              <button
                onClick={handleStopEarly}
                className="flex-1 rounded-lg bg-rose-600 px-6 py-3 font-bold text-white transition-colors hover:bg-rose-700 animate-pulse"
              >
                DETENER Y GUARDAR ({timeLeft}s)
              </button>
            )}
          </div>

          {!currentSessionDraft && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg">
              <p className="text-sm text-rose-400 font-medium">
                ⚠️ Debes iniciar una sesión desde el expediente antes de calibrar.
              </p>
            </div>
          )}

          <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-5 shadow-sm space-y-2 font-mono text-sm">
            <p className="text-slate-300 flex justify-between">
              <span>EMG Actual:</span>
              <span className="text-white font-bold">{emgValue.toFixed(1)} uV</span>
            </p>
            <p className="text-slate-300 flex justify-between">
              <span>MVC Alcanzado:</span>
              <span className="text-blue-400 font-bold">{mvc.toFixed(1)} uV</span>
            </p>
            <p className="text-slate-300 flex justify-between border-t border-slate-800 pt-2">
              <span>Umbral Sugerido (75%):</span>
              <span className="text-accentYellow font-bold">{threshold} uV</span>
            </p>
          </div>
        </section>

        {/* Signal display — same as MyoSignalPage */}
        <section className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 flex flex-col">
          <h3 className="mb-4 font-bold text-white">Señal en Tiempo Real</h3>
          <div className="flex h-64 w-full flex-col items-center justify-center overflow-hidden rounded-lg bg-slate-900 p-4 shadow-inner">
            {isConnected ? (
              <div className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={emgHistory} margin={{ top: 10, right: 10, left: 0, bottom: 15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <YAxis
                      domain={[-1700, 1700]}
                      ticks={[-1700, -850, 0, 850, 1700]}
                      width={85}
                      allowDataOverflow={true}
                      tickFormatter={(value) => `${value} mV`}
                      tick={{ fill: '#94A3B8', fontSize: 13, fontFamily: 'monospace' }}
                      axisLine={{ stroke: '#334155', strokeWidth: 2 }}
                      tickLine={{ stroke: '#334155' }}
                      tickMargin={5}
                    />
                    <XAxis dataKey="time" hide />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={false}
                      isAnimationActive={false}
                    />
                    {!isCalibrating && mvc > 0 && (
                      <ReferenceLine
                        y={threshold}
                        stroke="#ef4444"
                        strokeDasharray="5 5"
                        label={{ position: 'right', value: '75%', fill: '#ef4444', fontSize: 10 }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="font-mono text-sm text-slate-500">
                -- Sin datos entrantes --
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}