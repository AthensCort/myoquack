import { useNavigate } from 'react-router-dom'
import { useAppState } from '../context/AppStateContext'

export function ConfiguracionPage() {
  const navigate = useNavigate()
  const { selectedPatient, currentSessionDraft } = useAppState()

  const handleGoToGame = () => {
    navigate('/game')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">Configuración del Juego</h1>
        <p className="mt-1 text-slate-400">
          Paciente: <span className="font-semibold text-white">{selectedPatient?.nombre || 'Ninguno'}</span>
        </p>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6">
        <h2 className="text-xl font-bold text-white">Opciones de la Sesión</h2>
        <p className="mt-2 text-slate-400">
          Umbral guardado: <span className="font-mono text-accentYellow">{currentSessionDraft?.calibration?.threshold_uv?.toFixed(2)} uV</span>
        </p>
        
        {/* We will add the actual game settings (time, difficulty, etc.) here later! */}
        <div className="mt-6 flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-slate-700 bg-slate-800">
          <p className="text-slate-500">Formulario de configuración en construcción 🚧</p>
        </div>

        <button
          onClick={handleGoToGame}
          className="mt-6 rounded-lg bg-accentYellow px-8 py-3 font-bold text-primary transition-colors hover:brightness-110"
        >
          Continuar al Juego 🎮
        </button>
      </div>
    </div>
  )
}