import { useHardware } from '../../context/HardwareContext'

export function Esp32ConnectButton() {
  const { isConnected, isDemoMode, connect, disconnect, toggleDemoMode } = useHardware()

  return (
    <div className="flex gap-2">
      {/* Real Hardware Button (Hidden when Demo is active so they don't clash) */}
      {!isDemoMode && (
        <button
          type="button"
          onClick={isConnected ? disconnect : connect}
          className={`rounded-xl px-4 py-2 text-sm font-bold shadow-sm transition-all ${
            isConnected
              ? 'bg-emerald-500 text-white hover:bg-rose-500'
              : 'bg-primary text-white hover:brightness-110'
          }`}
        >
          {isConnected ? 'ESP32 Conectado 🟢' : 'Conectar ESP32 🔌'}
        </button>
      )}

      {/* Demo Mode Button */}
      <button
        type="button"
        onClick={toggleDemoMode}
        className={`rounded-xl px-4 py-2 text-sm font-bold shadow-sm transition-all ${
          isDemoMode
            ? 'bg-purple-500 text-white hover:bg-rose-500' // Purple color to indicate simulation
            : 'border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
        }`}
      >
        {isDemoMode ? 'Demo Activo ⌨️' : 'Modo Demo'}
      </button>
    </div>
  )
}