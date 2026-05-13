import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHardware } from '../context/HardwareContext'
import { useToast } from '../context/ToastContext'
import { useAppState } from '../context/AppStateContext'
import { LineChart, Line, YAxis, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'
import type { MusculoTrabajo } from '../models/types'

export function CalibrationPage() {
  const { isConnected, emgValue, emgHistory } = useHardware()
  const { addToast } = useToast()
  
  // Extraemos currentSessionDraft para validar que existe una sesión activa
  const { selectedPatient, setCalibrationDraft, currentSessionDraft } = useAppState() 
  const navigate = useNavigate()

  // Nombre seguro del paciente para la UI
  const patientName = selectedPatient 
    ? `${selectedPatient.nombre} ${selectedPatient.apellidos || ''}`.trim() 
    : 'Ningún paciente seleccionado'

  // Estados de calibración
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30)
  const [mvc, setMvc] = useState<number>(0) 
  const [selectedMuscle, setSelectedMuscle] = useState<MusculoTrabajo>('Gluteus Medius')

  // El umbral se calcula como el 75% del MVC alcanzado
  const threshold = Math.round(mvc * 0.75)

  // 1. Lógica del Temporizador y Guardado Automático
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>
    
    if (isCalibrating && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
    } else if (isCalibrating && timeLeft === 0) {
      setIsCalibrating(false)
      
      try {
        // IMPORTANTE: Usamos mvc_uv y threshold_uv para que coincida con la interfaz y el servicio
        setCalibrationDraft({
          musculo: selectedMuscle,
          mvc_uv: mvc,
          threshold_uv: threshold,
        })

        addToast('¡Calibración completada con éxito!', 'success')
        
        // REDIRECCIÓN: Apunta directamente a /pre-game
        setTimeout(() => {
          navigate('/pre-game') 
        }, 1500)

      } catch (error) {
        console.error("Error al guardar calibración:", error)
        addToast('Error: No se pudo guardar. Asegúrate de haber iniciado una sesión.', 'error')
      }
    }
    
    return () => clearInterval(timer)
  }, [isCalibrating, timeLeft, mvc, threshold, selectedMuscle, addToast, setCalibrationDraft, navigate])

  // 2. Lógica de Detección de Pico Máximo (MVC)
  useEffect(() => {
    if (isCalibrating && emgValue > mvc) {
      setMvc(emgValue)
    }
  }, [emgValue, isCalibrating, mvc])

  const handleStart = () => {
    if (!isConnected) {
      addToast('Conecta el dispositivo o usa el Modo Demo.', 'error')
      return
    }
    setMvc(0)
    setTimeLeft(30)
    setIsCalibrating(true)
  }

  const handleCancel = () => {
    setIsCalibrating(false)
    setTimeLeft(30)
    setMvc(0)
  }

  // Ajuste dinámico del eje Y en la gráfica
  const yAxisMax = isCalibrating || mvc === 0 ? 4095 : mvc * 1.2

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black text-white">Calibración EMG</h1>
        <p className="mt-1 text-slate-400">Paciente: <span className="font-semibold text-white">{patientName}</span></p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {/* PANEL DE CONTROL */}
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
            <button
              onClick={handleStart}
              // Bloqueado si no hay sesión activa (currentSessionDraft)
              disabled={isCalibrating || !isConnected || !currentSessionDraft}
              className="flex-1 rounded-lg bg-accentYellow px-6 py-3 font-bold text-primary transition-colors hover:brightness-110 disabled:opacity-50"
            >
              {isCalibrating ? `Calibrando... ${timeLeft}s` : 'Iniciar calibración'}
            </button>
            <button
              onClick={handleCancel}
              disabled={!isCalibrating}
              className="rounded-lg border border-slate-600 px-6 py-3 font-semibold text-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              Cancelar
            </button>
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

        {/* PANEL DE GRÁFICA */}
        <section className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 flex flex-col">
          <h3 className="mb-4 font-bold text-white">Señal en Tiempo Real</h3>
          <div className="flex-1 min-h-[250px] w-full rounded-lg bg-slate-950 p-2 shadow-inner">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={emgHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <YAxis domain={[0, yAxisMax]} stroke="#64748b" fontSize={10} />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={emgValue >= threshold && threshold > 0 ? '#facc15' : '#10b981'} 
                  strokeWidth={2}
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
        </section>
      </div>
    </div>
  )
}