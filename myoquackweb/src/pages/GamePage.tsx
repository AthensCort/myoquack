import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHardware } from '../context/HardwareContext'
import { useAppState } from '../context/AppStateContext'
import { useToast } from '../context/ToastContext'
import type { EventoContraccion, SesionEmg } from '../models/types'

import cloud     from '../assets/game/cloud.png'
import grass     from '../assets/game/grass.png'
import wall      from '../assets/game/wall.png'
import explosion from '../assets/game/explosion_quack.png'
import damage    from '../assets/game/damage.png'
import dead      from '../assets/game/dead.png'
import flydown   from '../assets/game/flydown.png'
import flyup     from '../assets/game/flyup.png'
import neutral   from '../assets/game/neutral.png'
import easy      from '../assets/game/easy.png'
import normal    from '../assets/game/normal.png'
import hard      from '../assets/game/hard.png'
import trees     from '../assets/game/trees.png'
// Importa tu canción aquí (cambia .mp3 a .wav si es necesario)
import myoquacksong from '../assets/game/myoquacksong.mp3'

interface DuckState { x: number; y: number; alive: boolean; speed: number; hitPhase: 'none' | 'explosion' | 'damage' }
type Difficulty = 'EASY' | 'NORMAL' | 'HARD'

const DIFFICULTY_CONFIG = {
  EASY:   { baseSpeed: 0.4, increment: 0.02, crosshair: easy,   label: 'FÁCIL'   },
  NORMAL: { baseSpeed: 0.8, increment: 0.05, crosshair: normal, label: 'NORMAL'  },
  HARD:   { baseSpeed: 1.5, increment: 0.10, crosshair: hard,   label: 'DIFÍCIL' },
}

interface ActiveContraction {
  active: boolean
  startTime: number
  data: number[]
  crossedThreshold: boolean
}

interface CloudState {
  id: number
  x: number
  y: number
  width: number
  speed: number
  opacity: number
}

const DUCK_PATH_Y  = 38
const TARGET_MIN   = 42
const TARGET_MAX   = 52
const CROSSHAIR_X  = (TARGET_MIN + TARGET_MAX) / 2

export function GamePage() {
  const { isConnected, emgValue } = useHardware()
  const { selectedPatient, currentSessionDraft, injectGameResults } = useAppState()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const calibration            = currentSessionDraft?.calibration
  const hasCalibration         = !!calibration?.threshold_uv
  const threshold              = hasCalibration ? calibration.threshold_uv : 500
  const durationSeconds        = currentSessionDraft?.config?.tiempo_juego_segundos || 180
  const durationMinutesDisplay = Math.floor(durationSeconds / 60)

  const [isPlaying,              setIsPlaying]              = useState(false)
  const [isDemo,                 setIsDemo]                 = useState(false)
  const [demoKeyPress,           setDemoKeyPress]           = useState(false)
  const [isReadyToShoot,         setIsReadyToShoot]         = useState(true)
  const [feedback,               setFeedback]               = useState<'HIT' | 'MISS' | null>(null)
  const [difficulty,             setDifficulty]             = useState<Difficulty>('NORMAL')
  const [timeLeft,               setTimeLeft]               = useState(durationSeconds)
  const [score,                  setScore]                  = useState(0)
  const [ducksHit,               setDucksHit]               = useState(0)
  const [effectiveContractions,  setEffectiveContractions]  = useState(0)

  const [duck, setDuck] = useState<DuckState>({
    x: -10, y: DUCK_PATH_Y, alive: true, hitPhase: 'none',
    speed: DIFFICULTY_CONFIG['NORMAL'].baseSpeed,
  })

  const [clouds, setClouds] = useState<CloudState[]>([
    { id: 1, x: 5,  y: 28,  width: 140, speed: 0.03, opacity: 0.95 },
    { id: 2, x: 42, y: 20,  width: 180, speed: 0.01, opacity: 0.80 },
    { id: 3, x: 85, y: 50,  width: 160, speed: 0.04, opacity: 0.90 },
    { id: 4, x: 22, y: 140, width: 120, speed: 0.05, opacity: 0.80 },
    { id: 5, x: 65, y: 160, width: 150, speed: 0.02, opacity: 0.75 },
  ])

  const audioRef          = useRef<HTMLAudioElement>(null)
  const respawnTimer      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const feedbackTimer     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const damageTimer       = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sessionEvents     = useRef<EventoContraccion[]>([])
  const activeContraction = useRef<ActiveContraction | null>(null)

  const canStartGame = isConnected && selectedPatient && hasCalibration
  const activeEmg = isDemo ? (demoKeyPress ? threshold * 1.5 : 0) : Math.abs(emgValue)
  // Math.abs() ensures we only deal with the raw power of the muscle flex in mV

  // ── Música de fondo ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(e => console.warn("El navegador bloqueó el audio:", e))
    } else if (!isPlaying && audioRef.current) {
      audioRef.current.pause()
    }
  }, [isPlaying])

  // ── Demo keyboard ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isDemo) return
    const dn = (e: KeyboardEvent) => { if (e.code === 'Space') setDemoKeyPress(true)  }
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') setDemoKeyPress(false) }
    window.addEventListener('keydown', dn)
    window.addEventListener('keyup',   up)
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up) }
  }, [isDemo])

  // ── Countdown timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying || timeLeft <= 0) return
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(t); handleSessionComplete(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [isPlaying, timeLeft])

  // ── Cloud movement ───────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setClouds((prevClouds) =>
        prevClouds.map((c) => ({
          ...c,
          x: c.x > 110 ? -20 : c.x + c.speed,
        }))
      )
    }, 50)
    return () => clearInterval(id)
  }, []) 

  // ── Duck movement ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return
    const id = setInterval(() => {
      setDuck((prev) => {
        if (prev.alive) {
          if (prev.x > 110) return {
            x: -10, y: DUCK_PATH_Y, alive: true, hitPhase: 'none',
            speed: prev.speed + DIFFICULTY_CONFIG[difficulty].increment,
          }
          return { ...prev, x: prev.x + prev.speed }
        } else if (prev.hitPhase !== 'none') {
          // Congelado en el aire durante la animación de impacto
          return prev;
        } else {
          // Gravedad
          return { ...prev, y: prev.y + 2.5 }
        }
      })
    }, 50)
    return () => clearInterval(id)
  }, [isPlaying, difficulty])

  // ── EMG / shooting logic ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return

    if (activeEmg > threshold * 0.2) {
      if (!activeContraction.current) {
        activeContraction.current = {
          active: true, startTime: performance.now(), data: [], crossedThreshold: false,
        }
      }
      activeContraction.current.data.push(activeEmg)
    }

    if (activeEmg < threshold * 0.4) {
      setIsReadyToShoot(true)
      if (activeContraction.current) {
        const cur = activeContraction.current
        if (cur.crossedThreshold) {
          const durationSecs = (performance.now() - cur.startTime) / 1000
          const peak = Math.max(...cur.data)
          const rms  = Math.sqrt(cur.data.reduce((s, v) => s + v * v, 0) / cur.data.length)
          const iemg = cur.data.reduce((s, v) => s + v, 0)
          sessionEvents.current.push({
            id_evento: `EV-${Date.now()}`, id_sesion: '',
            numero_orden:       sessionEvents.current.length + 1,
            timestamp_segundos: durationSeconds - timeLeft,
            peak_uv: peak, rms, iemg,
            duracion_segundos:  durationSecs,
            waveform_data:      cur.data,
          })
          setEffectiveContractions(sessionEvents.current.length)
        }
        activeContraction.current = null
      }
    }

    if (activeEmg >= threshold && isReadyToShoot && duck.alive) {
      if (activeContraction.current) activeContraction.current.crossedThreshold = true
      const isHit = duck.x >= TARGET_MIN && duck.x <= TARGET_MAX
      if (isHit) {
        // Fase 1: Explota inmediatamente
        setDuck((p) => ({ ...p, alive: false, hitPhase: 'explosion' }))
        setScore((s) => s + 100)
        setDucksHit((d) => d + 1)
        setFeedback('HIT')

        // Fase 2: Después de 150ms se disipa la explosión y se muestra achicharrado
        if (damageTimer.current) clearTimeout(damageTimer.current)
        damageTimer.current = setTimeout(() => {
          setDuck((p) => ({ ...p, hitPhase: 'damage' }))
        }, 150)

        // Fase 3: Después de 300ms totales, desaparece el feedback y comienza a caer
        if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
        feedbackTimer.current = setTimeout(() => {
          setFeedback(null)
          setDuck((p) => ({ ...p, hitPhase: 'none' }))
        }, 300)

        // Fase 4: Reaparece el pato en la izquierda
        if (respawnTimer.current) clearTimeout(respawnTimer.current)
        respawnTimer.current = setTimeout(() => {
          setDuck((p) => ({
            x: -10, y: DUCK_PATH_Y, alive: true, hitPhase: 'none',
            speed: p.speed + DIFFICULTY_CONFIG[difficulty].increment,
          }))
        }, 1200)
      } else {
        setFeedback('MISS')
        if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
        feedbackTimer.current = setTimeout(() => setFeedback(null), 800)
      }
      setIsReadyToShoot(false)
    }
  }, [activeEmg, threshold, isPlaying, isReadyToShoot, duck.alive, duck.x, difficulty, durationSeconds, timeLeft])

  // ── Helpers ──────────────────────────────────────────────────────────────
  const saveAndExit = () => {
    if (respawnTimer.current)  clearTimeout(respawnTimer.current)
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
    if (damageTimer.current)   clearTimeout(damageTimer.current)
    setIsPlaying(false)
    if (isDemo) {
      setIsDemo(false)
      addToast('Modo Demo finalizado. No se guardaron datos clínicos.', 'info')
      return
    }
    const events = sessionEvents.current
    const count  = events.length || 1
    const reportData: SesionEmg = {
      id_sesion: 'TEMP', id_paciente: selectedPatient?.id_paciente || '',
      nombre_reporte: '', fecha_hora: new Date(),
      musculo:          calibration?.musculo || 'Gluteus Medius',
      config_gain:      currentSessionDraft?.config?.config_gain      || 0,
      config_offset_mv: currentSessionDraft?.config?.config_offset_mv || 0,
      config_threshold_uv:   threshold,
      tiempo_juego_segundos: durationSeconds,
      total_contracciones: events.length,
      total_patitos:       ducksHit,
      stat_avg_peak:     events.reduce((s, e) => s + e.peak_uv,          0) / count,
      stat_avg_rms:      events.reduce((s, e) => s + e.rms,              0) / count,
      stat_avg_iemg:     events.reduce((s, e) => s + e.iemg,             0) / count,
      stat_avg_duracion: events.reduce((s, e) => s + e.duracion_segundos, 0) / count,
    }
    if (injectGameResults) injectGameResults({
      report: reportData, events,
      total_contracciones_efectivas: events.length,
    })
    navigate('/results')
  }

  const startGameSetup = () => {
    setScore(0); setDucksHit(0); setEffectiveContractions(0)
    sessionEvents.current = []
    setTimeLeft(durationSeconds)
    setDuck({ x: -10, y: DUCK_PATH_Y, alive: true, hitPhase: 'none', speed: DIFFICULTY_CONFIG[difficulty].baseSpeed })
    setIsPlaying(true)
    setFeedback(null)
  }

  const handleStartGame       = () => {
    if (!canStartGame) { addToast('Faltan requisitos para iniciar el juego clínico.', 'error'); return }
    setIsDemo(false); startGameSetup()
  }
  const handleDemoStart       = () => { setIsDemo(true); startGameSetup(); addToast('Modo Demo activado. Usa la barra espaciadora.', 'info') }
  const handleStopGame        = () => { if (!isDemo) addToast('Sesión finalizada manualmente. Guardando datos...', 'info'); saveAndExit() }
  const handleSessionComplete = () => {
    if (isDemo) { saveAndExit(); return }
    addToast('¡TIEMPO AGOTADO! Guardando datos...', 'success')
    setTimeout(() => saveAndExit(), 1500)
  }

  const getDuckSprite = () => {
    if (!duck.alive) {
      if (duck.hitPhase === 'explosion') return explosion
      if (duck.hitPhase === 'damage') return damage
      return dead // Cayendo
    }
    const frame = Math.floor(duck.x / 4) % 3
    return frame === 0 ? flyup : frame === 1 ? neutral : flydown
  }

  const progressPercentage = Math.min((activeEmg / threshold) * 100, 100)
  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  const retroBox = "border-4 border-slate-900 rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-slate-100"
  const retroBtn = "border-4 border-slate-900 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black uppercase tracking-widest active:translate-y-1 active:translate-x-1 active:shadow-none transition-all cursor-pointer"

  return (
    <div className="space-y-6 font-mono selection:bg-rose-500 selection:text-white pb-10">
      
      {/* ── Audio Background ── */}
      <audio ref={audioRef} src={myoquacksong} loop preload="auto" />

      {/* ══════════════════════════════════════════
          LOBBY
      ══════════════════════════════════════════ */}
      {!isPlaying && (
        <div className={`mx-auto max-w-2xl p-8 ${retroBox}`}>
          <h1 className="mb-8 text-5xl font-black text-slate-900 text-center uppercase tracking-widest drop-shadow-md">
            MYO-QUACK<br /><span className="text-2xl text-rose-600">Arcade Edition</span>
          </h1>

          <div className="space-y-4 font-bold text-sm uppercase text-slate-800 mb-8 bg-slate-200 p-4 border-4 border-slate-900">
            <div className="flex items-center justify-between border-b-4 border-dashed border-slate-400 pb-2">
              <span>Paciente P1</span>
              <span className="text-blue-700">{selectedPatient?.nombre || 'DEMO GUEST'}</span>
            </div>
            <div className="flex items-center justify-between border-b-4 border-dashed border-slate-400 pb-2">
              <span>Umbral MVC</span>
              <span className="text-purple-700">
                {hasCalibration ? `${threshold.toFixed(1)} uV` : 'NO CALIBRADO (DEMO: 500 uV)'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Tiempo de Sesión</span>
              <span className="text-emerald-700">{durationMinutesDisplay} MINUTOS</span>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-center font-black uppercase tracking-widest text-slate-900 mb-4 bg-accentYellow inline-block px-4 py-1 border-2 border-slate-900 transform -rotate-1">SELECT DIFFICULTY</h3>
            <div className="grid grid-cols-3 gap-4">
              {(['EASY', 'NORMAL', 'HARD'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  aria-pressed={difficulty === d}
                  className={`flex flex-col items-center gap-2 p-3 ${retroBtn} ${difficulty === d ? 'bg-rose-200 border-4 border-rose-700' : 'bg-white'}`}
                >
                  <img src={DIFFICULTY_CONFIG[d].crosshair} alt={DIFFICULTY_CONFIG[d].label} className="w-full h-20 object-contain [image-rendering:pixelated]" />
                  <span className="text-sm text-slate-900 font-bold">{DIFFICULTY_CONFIG[d].label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-4">
            <button
              onClick={handleStartGame} disabled={!canStartGame}
              className={`w-full bg-emerald-500 py-4 text-2xl text-slate-900 ${retroBtn} disabled:bg-slate-300 disabled:opacity-50`}
            >
              INICIAR JUEGO CLÍNICO 🎮
            </button>
            <button onClick={handleDemoStart} className={`w-full bg-accentYellow py-3 text-slate-900 ${retroBtn}`}>
              JUGAR MODO DEMO (SIN SESIÓN)
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          ÁREA DE JUEGO
      ══════════════════════════════════════════ */}
      {isPlaying && (
        <div className="flex flex-col xl:flex-row gap-6 mx-auto justify-center max-w-[1200px]">

          <div className={`w-full max-w-[800px] flex flex-col ${retroBox}`}>

            {/* ╔══════════════════════════════════════════╗
                ║  CANVAS  800 × 600 px                  ║
                ║                                          ║
                ║  z-0   wall    ← background painting   ║
                ║  z-10  clouds  ← clouds over wall      ║
                ║  z-20  trees   ← bottom-anchored       ║
                ║  z-30  duck    ← flying sprite         ║
                ║  z-40  grass   ← ground strip          ║
                ║  z-50  HUD     ← UI overlays           ║
                ╚══════════════════════════════════════════╝ */}
            <div
              className="relative w-full overflow-hidden"
              style={{ height: 600, backgroundColor: '#5C94FC' }}
            >

              {/* ── z-0 · WALL ── */}
              <img
                src={wall}
                alt="" aria-hidden="true"
                className="absolute inset-0 w-full h-full z-0 pointer-events-none [image-rendering:pixelated]"
                style={{ objectFit: 'cover', objectPosition: 'center' }}
              />

              {/* ── z-10 · CLOUDS ── */}
              {clouds.map((c) => (
                <img
                  key={c.id}
                  src={cloud}
                  alt=""
                  aria-hidden="true"
                  className="absolute z-10 pointer-events-none [image-rendering:pixelated]"
                  style={{
                    top: c.y,
                    left: `${c.x}%`,
                    width: c.width,
                    height: 'auto',
                    opacity: c.opacity,
                    transition: 'left 50ms linear',
                  }}
                />
              ))}

              {/* ── z-20 · TREES ──────────────────────────────────────────
                  Anchored to bottom:0 of the canvas — same anchor as grass.
                  display:block + verticalAlign:bottom eliminate the 4px
                  inline baseline gap so the bottom edge is pixel-perfect.
                  No runtime measurement needed.
              ─────────────────────────────────────────────────────────── */}
              <img
                src={trees}
                alt="" aria-hidden="true"
                className="absolute left-0 bottom-0 z-20 pointer-events-none [image-rendering:pixelated]"
                style={{
                  width:         '100%',
                  height:        'auto',
                  display:       'block',
                  verticalAlign: 'bottom',
                }}
              />

              {/* ── z-30 · DUCK ── */}
              <div
                className="absolute z-30 select-none"
                style={{
                  left:      `${duck.x}%`,
                  top:       `${duck.y}%`,
                  transform: 'translateY(-50%)',
                  transition: 'left 50ms linear, top 50ms linear', 
                }}
              >
                <img
                  src={getDuckSprite()}
                  alt="duck"
                  className="[image-rendering:pixelated]"
                  style={{
                    width:     64,
                    height:    64,
                    objectFit: 'contain',
                    filter:    'drop-shadow(2px 2px 0 rgba(0,0,0,0.4))',
                  }}
                />
              </div>

              {/* ── z-40 · GRASS ──────────────────────────────────────────
                  display:block + verticalAlign:bottom kill the 4px baseline
                  gap that <img> gets as an inline element, so bottom:0 is
                  truly flush with the canvas floor — no pixel offset.
              ─────────────────────────────────────────────────────────── */}
              <img
                src={grass}
                alt="" aria-hidden="true"
                className="absolute bottom-0 left-0 z-40 pointer-events-none [image-rendering:pixelated]"
                style={{
                  width:         '100%',
                  height:        'auto',
                  display:       'block',
                  verticalAlign: 'bottom',
                }}
              />

              {/* ── z-50 · HUD ── */}
              <div className="absolute inset-0 z-50 pointer-events-none">

                {/* Timer — top right */}
                <div className="absolute top-4 right-4">
                  <div className={`px-4 py-2 text-2xl border-4 border-slate-900 font-black shadow-[4px_4px_0px_rgba(0,0,0,1)] flex items-center gap-2 ${
                    timeLeft <= 30
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-black text-accentYellow'
                  }`}>
                    ⏳ {formatTime(timeLeft)}
                  </div>
                </div>

                {/* Stats — top left */}
                <div className="absolute top-4 left-4 flex flex-col items-start gap-2">
                  {isDemo && (
                    <div className="bg-black text-white px-3 py-1 text-xs border-2 border-white uppercase shadow-md animate-pulse">
                      DEMO: ESPACIO PARA DISPARAR
                    </div>
                  )}
                  <div className="bg-white/90 backdrop-blur-sm text-black px-3 py-1 text-xs border-2 border-black font-black uppercase shadow-md">
                    PUNTERÍA: <span className="text-blue-600">{ducksHit}</span> / {effectiveContractions}
                  </div>
                  <div className="bg-white/90 backdrop-blur-sm text-black px-3 py-1 text-xs border-2 border-black font-black uppercase shadow-md flex items-center gap-2">
                    <span className="text-slate-500">
                      {difficulty === 'EASY' ? '★☆☆' : difficulty === 'NORMAL' ? '★★☆' : '★★★'}
                    </span>
                    SPD: {duck.speed.toFixed(2)}
                  </div>
                </div>

                {/* Crosshair reticle — fixed at target zone center */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left:      `${CROSSHAIR_X}%`,
                    top:       `${DUCK_PATH_Y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <img
                    src={DIFFICULTY_CONFIG[difficulty].crosshair}
                    alt="Zona de disparo"
                    className="[image-rendering:pixelated]"
                    style={{
                      width:     72,
                      height:    72,
                      objectFit: 'contain',
                      opacity:   0.55,
                      filter:    'drop-shadow(0 0 4px rgba(0,0,0,0.5))',
                    }}
                  />
                </div>

                {/* HIT / MISS feedback */}
                {feedback && (
                  <div className="absolute top-[20%] left-1/2 -translate-x-1/2">
                    <span className={`text-7xl font-black tracking-widest uppercase ${
                      feedback === 'HIT' ? 'text-accentYellow' : 'text-rose-500'
                    }`} style={{ filter: 'drop-shadow(4px 4px 0 rgba(0,0,0,0.8))' }}>
                      {feedback}!
                    </span>
                  </div>
                )}
              </div>
            </div>{/* /canvas */}

            {/* ── EMG bar ── */}
            <div
              className="h-32 border-t-8 border-slate-900 p-4 flex flex-col justify-between"
              style={{ backgroundColor: '#1e1e1e', boxShadow: 'inset 0 5px 10px rgba(0,0,0,0.5)' }}
            >
              <div className="flex justify-between items-center px-2">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 border-black ${
                    isReadyToShoot
                      ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]'
                      : 'bg-rose-600 shadow-[0_0_10px_rgba(225,29,72,0.8)]'
                  }`} />
                  <p className={`font-black uppercase tracking-widest text-sm ${
                    isReadyToShoot ? 'text-emerald-400' : 'text-rose-500 animate-pulse'
                  }`}>
                    {isReadyToShoot ? 'ARMA LISTA' : 'RECARGANDO... (RELAJAR)'}
                  </p>
                </div>
                <p className="font-mono font-bold text-slate-400">
                  <span className="text-white">{activeEmg.toFixed(0)}</span> / {threshold.toFixed(0)} uV
                </p>
              </div>

              <div
                className="w-full h-10 bg-black p-1 border-4 border-[#444] rounded-sm relative"
                style={{ boxShadow: 'inset 0 0 10px rgba(0,0,0,1)' }}
              >
                <div
                  className="absolute top-0 bottom-0 right-0 w-1 z-10 bg-rose-500"
                  style={{ boxShadow: '0 0 5px rgba(225,29,72,1)' }}
                />
                <div
                  className={`h-full transition-all duration-75 ${
                    activeEmg >= threshold ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{
                    width: `${progressPercentage}%`,
                    boxShadow: activeEmg >= threshold
                      ? '0 0 15px rgba(225,29,72,0.6)'
                      : '0 0 10px rgba(16,185,129,0.4)',
                  }}
                />
              </div>
            </div>
          </div>{/* /canvas column */}

          {/* ── Sidebar ── */}
          <div className="w-full xl:w-64 flex flex-col gap-6">
            <div className="p-6 flex-1 flex flex-col justify-center items-center bg-slate-900 text-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
              <h3 className="text-xl font-bold uppercase tracking-widest mb-2 text-accentYellow z-10">SCORE</h3>
              <div
                className="text-5xl lg:text-6xl xl:text-5xl font-black tracking-widest z-10 text-center w-full"
                style={{ textShadow: '0 0 10px rgba(250,204,21,0.3)' }}
              >
                {score.toString().padStart(5, '0')}
              </div>
            </div>
            <button
              onClick={handleStopGame}
              className={`w-full bg-rose-600 hover:bg-rose-500 py-5 text-xl text-white ${retroBtn}`}
            >
              STOP / QUIT
            </button>
          </div>

        </div>
      )}
    </div>
  )
}