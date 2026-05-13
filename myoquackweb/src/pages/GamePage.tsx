import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHardware } from '../context/HardwareContext'
import { useAppState } from '../context/AppStateContext'
import { useToast } from '../context/ToastContext'
import type { EventoContraccion, SesionEmg, SessionSimulationResult } from '../models/types'

interface DuckState { x: number; y: number; alive: boolean; speed: number; }
type Difficulty = 'EASY' | 'NORMAL' | 'HARD'

const DIFFICULTY_CONFIG = {
  EASY: { baseSpeed: 0.4, increment: 0.02, label: 'FÁCIL' },
  NORMAL: { baseSpeed: 0.8, increment: 0.05, label: 'NORMAL' },
  HARD: { baseSpeed: 1.5, increment: 0.10, label: 'DIFÍCIL' }
}

// Interfaz interna para manejar la contracción en vivo
interface ActiveContraction {
  active: boolean;
  startTime: number;
  data: number[];
  crossedThreshold: boolean;
}

export function GamePage() {
  const { isConnected, emgValue } = useHardware()
  // Usamos la nueva función injectGameResults de nuestro contexto
  const { selectedPatient, currentSessionDraft, injectGameResults } = useAppState()
  const { addToast } = useToast()
  const navigate = useNavigate()

  // --- CONFIGURACIÓN ---
  const calibration = currentSessionDraft?.calibration
  const hasCalibration = !!calibration?.threshold_uv 
  const threshold = hasCalibration ? calibration.threshold_uv : 500 
  
  const durationSeconds = currentSessionDraft?.config?.tiempo_juego_segundos || 180
  const durationMinutesDisplay = Math.floor(durationSeconds / 60)
  
  const TARGET_MIN = 42; 
  const TARGET_MAX = 52; 
  const DUCK_PATH_Y = 35; 
  
  // --- ESTADOS DEL SISTEMA Y UI ---
  const [isPlaying, setIsPlaying] = useState(false)
  const [isDemo, setIsDemo] = useState(false)
  const [demoKeyPress, setDemoKeyPress] = useState(false)
  const [isReadyToShoot, setIsReadyToShoot] = useState(true)
  const [feedback, setFeedback] = useState<'HIT' | 'MISS' | null>(null)
  const [difficulty, setDifficulty] = useState<Difficulty>('NORMAL')
  const [timeLeft, setTimeLeft] = useState(durationSeconds)

  // --- 📊 NUEVOS ESTADOS DE DATOS CLÍNICOS ---
  const [score, setScore] = useState(0) // Puntuación Arcade
  const [ducksHit, setDucksHit] = useState(0) // Total Patitos
  const [effectiveContractions, setEffectiveContractions] = useState(0) // Contracciones reales
  
  const [duck, setDuck] = useState<DuckState>({ x: -10, y: DUCK_PATH_Y, alive: true, speed: 0.8 })
  
  // REFERENCIAS DE TIEMPO Y RECOLECCIÓN
  const respawnTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  // 📈 Arreglo en memoria para guardar todas las contracciones de la sesión
  const sessionEvents = useRef<EventoContraccion[]>([])
  // 📈 Objeto temporal para la contracción que está ocurriendo en este milisegundo
  const activeContraction = useRef<ActiveContraction | null>(null)

  const canStartGame = isConnected && selectedPatient && hasCalibration
  const activeEmg = isDemo ? (demoKeyPress ? threshold * 1.5 : 0) : emgValue

  // Lógica del teclado (Modo Prueba)
  useEffect(() => {
    if (!isDemo) return
    const handleKeyDown = (e: KeyboardEvent) => { if (e.code === 'Space') setDemoKeyPress(true) }
    const handleKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') setDemoKeyPress(false) }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp) }
  }, [isDemo])

  // --- LÓGICA DEL TEMPORIZADOR ---
  useEffect(() => {
    if (!isPlaying || timeLeft <= 0) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleSessionComplete() // ¡El tiempo se acabó!
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isPlaying, timeLeft])

  // --- MOTOR GRÁFICO (Movimiento) ---
  useEffect(() => {
    if (!isPlaying || !duck.alive) return
    const interval = setInterval(() => {
      setDuck((prev) => {
        if (prev.x > 110) { return { x: -10, y: DUCK_PATH_Y, alive: true, speed: prev.speed + DIFFICULTY_CONFIG[difficulty].increment } }
        return { ...prev, x: prev.x + prev.speed }
      })
    }, 50)
    return () => clearInterval(interval)
  }, [isPlaying, duck.alive, difficulty])

  // =========================================================================
  // 🧠 MOTOR DE ADQUISICIÓN DE SEÑAL Y DISPARO
  // =========================================================================
  useEffect(() => {
    if (!isPlaying) return

    // 1. RECOLECCIÓN DE DATOS: Si el músculo se empieza a contraer (> 20% del umbral)
    if (activeEmg > threshold * 0.2) {
      if (!activeContraction.current) {
        // Iniciar la grabación de la onda
        activeContraction.current = {
          active: true,
          startTime: performance.now(),
          data: [],
          crossedThreshold: false
        }
      }
      activeContraction.current.data.push(activeEmg)
    }

    // 2. RECARGA Y CIERRE DE EVENTO: El músculo se relaja (< 40% del umbral)
    if (activeEmg < threshold * 0.4) {
      setIsReadyToShoot(true)

      // Si había una grabación activa, la cerramos y calculamos matemáticas
      if (activeContraction.current) {
        const current = activeContraction.current

        // Solo la guardamos si superó el umbral (fue efectiva)
        if (current.crossedThreshold) {
          const durationSecs = (performance.now() - current.startTime) / 1000;
          const peak = Math.max(...current.data);
          // Math para RMS (Raíz Cuadrada de la Media de los Cuadrados)
          const rms = Math.sqrt(current.data.reduce((sum, val) => sum + val * val, 0) / current.data.length);
          // Math para iEMG (Integral simple como sumatoria)
          const iemg = current.data.reduce((sum, val) => sum + val, 0);

          // Crear objeto EventoContraccion exacto como en tus types.ts
          const newEvent: EventoContraccion = {
            id_evento: `EV-${Date.now()}`, 
            id_sesion: '', // Se llenará en la DB posteriormente
            numero_orden: sessionEvents.current.length + 1,
            timestamp_segundos: durationSeconds - timeLeft, // En qué segundo de la sesión pasó
            peak_uv: peak,
            rms: rms,
            iemg: iemg,
            duracion_segundos: durationSecs,
            waveform_data: current.data // Guardamos la onda para graficarla después
          }
          
          sessionEvents.current.push(newEvent)
          setEffectiveContractions(sessionEvents.current.length) // Actualizar UI
        }
        activeContraction.current = null; // Limpiar para el siguiente intento
      }
    }

    // 3. LÓGICA DE DISPARO (El paciente cruzó el umbral al 100%)
    if (activeEmg >= threshold && isReadyToShoot && duck.alive) {
      // Marcamos la contracción activa como "Efectiva"
      if (activeContraction.current) {
        activeContraction.current.crossedThreshold = true;
      }

      const isHit = duck.x >= TARGET_MIN && duck.x <= TARGET_MAX

      if (isHit) {
        setDuck((prev) => ({ ...prev, alive: false }))
        setScore((s) => s + 100)
        setDucksHit((d) => d + 1) // Sumamos al conteo de patitos
        setFeedback('HIT')
        
        if (respawnTimer.current) clearTimeout(respawnTimer.current)
        respawnTimer.current = setTimeout(() => {
          setDuck((prev) => ({ x: -10, y: DUCK_PATH_Y, alive: true, speed: prev.speed + DIFFICULTY_CONFIG[difficulty].increment }))
          setFeedback(null)
        }, 1200)
      } else {
        setFeedback('MISS')
        if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
        feedbackTimer.current = setTimeout(() => setFeedback(null), 800)
      }
      setIsReadyToShoot(false) 
    }
  }, [activeEmg, threshold, isPlaying, isReadyToShoot, duck.alive, duck.x, difficulty, durationSeconds, timeLeft])

  // =========================================================================
  // 💾 GUARDADO Y FIN DE SESIÓN
  // =========================================================================
  
  const saveAndExit = () => {
    // 1. Calcular promedios generales de toda la sesión
    const events = sessionEvents.current;
    const count = events.length || 1; // Prevenir división entre 0
    const avgPeak = events.reduce((sum, e) => sum + e.peak_uv, 0) / count;
    const avgRms = events.reduce((sum, e) => sum + e.rms, 0) / count;
    const avgIemg = events.reduce((sum, e) => sum + e.iemg, 0) / count;
    const avgDur = events.reduce((sum, e) => sum + e.duracion_segundos, 0) / count;

    // 2. Crear el reporte final (como lo pide tu Pantalla 6 y types.ts)
    const reportData: SesionEmg = {
      id_sesion: 'TEMP', // Se asigna real en backend
      id_paciente: selectedPatient?.id_paciente || '',
      nombre_reporte: '', // Se llenará en la Pantalla 6
      fecha_hora: new Date(),
      musculo: calibration?.musculo || 'Gluteus Medius',
      config_gain: currentSessionDraft?.config?.config_gain || 0,
      config_offset_mv: currentSessionDraft?.config?.config_offset_mv || 0,
      config_threshold_uv: threshold,
      tiempo_juego_segundos: durationSeconds,
      total_contracciones: events.length,
      total_patitos: ducksHit,
      stat_avg_peak: avgPeak,
      stat_avg_rms: avgRms,
      stat_avg_iemg: avgIemg,
      stat_avg_duracion: avgDur
    };

    // 3. Crear el bloque de simulación
    const simulationResult: SessionSimulationResult = {
      report: reportData,
      events: events,
      total_contracciones_efectivas: events.length
    }

    // 4. Guardar en el borrador global usando la nueva función
    if (injectGameResults) {
      injectGameResults(simulationResult)
    }

    // 5. Limpiar y navegar a Resultados
    setIsPlaying(false)
    if (respawnTimer.current) clearTimeout(respawnTimer.current)
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
    navigate('/results')
  }

  const startGameSetup = () => {
    setScore(0)
    setDucksHit(0)
    setEffectiveContractions(0)
    sessionEvents.current = [] // Reiniciar el arreglo de datos médicos
    setTimeLeft(durationSeconds)
    setDuck({ x: -10, y: DUCK_PATH_Y, alive: true, speed: DIFFICULTY_CONFIG[difficulty].baseSpeed })
    setIsPlaying(true)
    setFeedback(null)
  }

  const handleStartGame = () => {
    if (!canStartGame) { addToast('Faltan requisitos para iniciar el juego.', 'error'); return }
    setIsDemo(false)
    startGameSetup()
  }

  const handleDemoStart = () => { setIsDemo(true); startGameSetup() }

  const handleStopGame = () => {
    addToast('Sesión finalizada manualmente. Guardando datos...', 'info')
    saveAndExit()
  }

  const handleSessionComplete = () => {
    addToast('¡TIEMPO AGOTADO! Guardando datos...', 'success')
    setTimeout(() => { saveAndExit() }, 1500)
  }

  // UI calculations
  const progressPercentage = Math.min((activeEmg / threshold) * 100, 100)
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const retroBoxStyle = "border-4 border-slate-900 rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-slate-100"
  const retroBtnStyle = "border-4 border-slate-900 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black uppercase tracking-widest active:translate-y-1 active:translate-x-1 active:shadow-none transition-all cursor-pointer"

  return (
    <div className="space-y-6 font-mono selection:bg-rose-500 selection:text-white">
      {/* LOBBY */}
      {!isPlaying && (
        <div className={`mx-auto max-w-2xl p-8 ${retroBoxStyle}`}>
          <h1 className="mb-8 text-5xl font-black text-slate-900 text-center uppercase tracking-widest drop-shadow-md">
            MYO-QUACK<br/><span className="text-2xl text-rose-600">Arcade Edition</span>
          </h1>
          
          <div className="space-y-4 font-bold text-sm uppercase text-slate-800 mb-8 bg-slate-200 p-4 border-4 border-slate-900">
            <div className="flex items-center justify-between border-b-4 border-dashed border-slate-400 pb-2">
              <span>Paciente P1</span>
              <span className="text-blue-700">{selectedPatient?.nombre || 'INSERT COIN'}</span>
            </div>
            <div className="flex items-center justify-between border-b-4 border-dashed border-slate-400 pb-2">
              <span>Umbral MVC</span>
              <span className="text-purple-700">{hasCalibration ? `${threshold.toFixed(1)} uV` : 'REQUERIDO'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Tiempo de Sesión</span>
              <span className="text-emerald-700">{durationMinutesDisplay} MINUTOS</span>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-center font-black uppercase tracking-widest text-slate-900 mb-4 bg-accentYellow inline-block px-4 py-1 border-2 border-slate-900 transform -rotate-1">SELECT DIFFICULTY</h3>
            <div className="grid grid-cols-3 gap-4">
              {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`py-3 text-sm font-black border-4 border-slate-900 transition-all ${
                    difficulty === level 
                      ? 'bg-slate-900 text-accentYellow shadow-none translate-y-1 translate-x-1' 
                      : 'bg-white text-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:bg-slate-50'
                  }`}
                >
                  {DIFFICULTY_CONFIG[level].label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-4">
            <button onClick={handleStartGame} disabled={!canStartGame} className={`w-full bg-emerald-500 py-4 text-2xl text-slate-900 ${retroBtnStyle} disabled:bg-slate-300 disabled:opacity-50`}>
              INICIAR JUEGO 🎮
            </button>
            <button onClick={handleDemoStart} className={`w-full bg-accentYellow py-3 text-slate-900 ${retroBtnStyle}`}>
              MODO PRUEBA (BARRA ESPACIADORA)
            </button>
          </div>
        </div>
      )}

      {/* ÁREA DE JUEGO */}
      {isPlaying && (
        <div className="grid gap-6 lg:grid-cols-4">
          
          <div className={`lg:col-span-3 flex flex-col h-[650px] relative overflow-hidden bg-[#5C94FC] ${retroBoxStyle}`}>
            
            <div className="flex-1 relative overflow-hidden">
              <div className="absolute top-[10%] left-[15%] w-24 h-8 bg-white/90 rounded-full blur-[1px] shadow-[20px_10px_0_10px_rgba(255,255,255,0.9),-20px_10px_0_5px_rgba(255,255,255,0.9)]"></div>
              <div className="absolute top-[25%] right-[20%] w-32 h-10 bg-white/80 rounded-full blur-[1px] shadow-[20px_10px_0_10px_rgba(255,255,255,0.8),-20px_10px_0_5px_rgba(255,255,255,0.8)] scale-75"></div>

              {/* ⏱️ RELOJ EN PANTALLA */}
              <div className="absolute top-4 right-4 z-30">
                <div className={`px-4 py-2 text-2xl border-4 border-slate-900 font-black shadow-[4px_4px_0px_rgba(0,0,0,1)] flex items-center gap-2 ${timeLeft <= 30 ? 'bg-rose-500 text-white animate-pulse' : 'bg-black text-accentYellow'}`}>
                  ⏳ {formatTime(timeLeft)}
                </div>
              </div>

              <div className="absolute top-4 left-4 z-30 space-y-2 flex gap-2">
                {isDemo && <div className="bg-black text-white px-3 py-1 text-xs border-2 border-white uppercase shadow-md animate-pulse mt-1">DEMO: ESPACIO PARA DISPARAR</div>}
                
                {/* 📊 NUEVO: Contadores en Pantalla */}
                <div className="bg-white/90 backdrop-blur-sm text-black px-3 py-1 text-xs border-2 border-black font-black uppercase shadow-md">
                  PUNTERÍA: <span className="text-blue-600">{ducksHit}</span> / {effectiveContractions}
                </div>
                <div className="bg-white/90 backdrop-blur-sm text-black px-3 py-1 text-xs border-2 border-black font-black uppercase shadow-md">
                  {DIFFICULTY_CONFIG[difficulty].label} SPD: {duck.speed.toFixed(2)}
                </div>
              </div>

              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-40 border-x-4 border-dashed border-white/40 bg-white/10 z-10 flex items-center justify-center pointer-events-none shadow-[inset_0_0_20px_rgba(255,255,255,0.2)]">
                <div className="w-20 h-20 border-4 border-rose-500 rounded-full relative shadow-[0_0_15px_rgba(244,63,94,0.5)]" style={{ position: 'absolute', top: `${DUCK_PATH_Y}%`, transform: 'translateY(-30%)' }}>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,1)]"></div>
                  <div className="absolute top-1/2 left-[-15px] w-8 h-1 bg-rose-500 -translate-y-1/2"></div>
                  <div className="absolute top-1/2 right-[-15px] w-8 h-1 bg-rose-500 -translate-y-1/2"></div>
                  <div className="absolute left-1/2 top-[-15px] w-1 h-8 bg-rose-500 -translate-x-1/2"></div>
                  <div className="absolute left-1/2 bottom-[-15px] w-1 h-8 bg-rose-500 -translate-x-1/2"></div>
                </div>
              </div>

              {feedback && (
                <div className="absolute top-[20%] left-1/2 -translate-x-1/2 z-40 pointer-events-none">
                  <span className={`text-7xl font-black tracking-widest uppercase drop-shadow-[6px_6px_0px_rgba(0,0,0,0.8)] ${feedback === 'HIT' ? 'text-accentYellow scale-110 transition-transform' : 'text-rose-500'}`}>
                    {feedback}!
                  </span>
                </div>
              )}

              <div className="absolute text-7xl select-none z-20 drop-shadow-[5px_5px_0px_rgba(0,0,0,0.4)]" style={{ left: `${duck.x}%`, top: `${duck.y}%`, transform: duck.alive ? 'scaleX(-1)' : 'none', filter: duck.alive ? 'none' : 'grayscale(100%) brightness(50%)' }}>
                {duck.alive ? '🦆' : '💥'}
              </div>

              <div className="absolute bottom-[-2px] left-0 right-0 h-[25%] bg-[#80D010] border-t-8 border-[#52860a] z-30">
                <div className="absolute top-[-50px] left-[10%] text-7xl drop-shadow-[4px_4px_0px_rgba(0,0,0,0.3)]">🌳</div>
                <div className="absolute top-[-40px] right-[15%] text-6xl drop-shadow-[4px_4px_0px_rgba(0,0,0,0.3)] z-10">🌲</div>
                <div className="absolute top-[-30px] right-[8%] text-5xl drop-shadow-[4px_4px_0px_rgba(0,0,0,0.3)]">🌲</div>
              </div>
            </div>

            <div className="h-32 bg-[#222] border-t-8 border-slate-900 p-4 z-40 flex flex-col justify-between shadow-[inset_0_5px_10px_rgba(0,0,0,0.5)]">
              <div className="flex justify-between items-end px-2">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 border-black ${isReadyToShoot ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-rose-600 shadow-[0_0_10px_rgba(225,29,72,0.8)]'}`}></div>
                  <p className={`font-black uppercase tracking-widest text-sm ${isReadyToShoot ? 'text-emerald-400' : 'text-rose-500 animate-pulse'}`}>
                    {isReadyToShoot ? 'ARMA LISTA' : 'RECARGANDO... (RELAJAR)'}
                  </p>
                </div>
                <p className="font-mono font-bold text-slate-400">
                  <span className="text-white">{activeEmg.toFixed(0)}</span> / {threshold.toFixed(0)} uV
                </p>
              </div>
              <div className="w-full h-10 bg-black p-1 border-4 border-[#444] rounded-sm relative shadow-[inset_0_0_10px_rgba(0,0,0,1)]">
                <div className="absolute top-[-4px] bottom-[-4px] left-[100%] w-1 bg-rose-500 z-10 shadow-[0_0_5px_rgba(225,29,72,1)]"></div>
                <div className={`h-full transition-all duration-75 ${activeEmg >= threshold ? 'bg-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.6)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]'}`} style={{ width: `${progressPercentage}%` }} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className={`p-6 flex-1 flex flex-col justify-center items-center bg-slate-900 text-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden`}>
              <h3 className="text-xl font-bold uppercase tracking-widest mb-2 text-accentYellow z-10">SCORE</h3>
              <div className="text-7xl font-black tracking-widest z-10 drop-shadow-[0_0_10px_rgba(250,204,21,0.3)]">
                {score.toString().padStart(5, '0')}
              </div>
            </div>
            
            <button onClick={handleStopGame} className={`w-full bg-rose-600 hover:bg-rose-500 py-5 text-xl text-white ${retroBtnStyle}`}>
              STOP / QUIT
            </button>
          </div>

        </div>
      )}
    </div>
  )
}