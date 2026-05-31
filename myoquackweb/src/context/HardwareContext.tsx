import { createContext, useContext, useState, useRef, useEffect, type ReactNode } from 'react'
import { useToast } from './ToastContext'

interface HardwareContextValue {
  isConnected: boolean
  emgValue: number
  rectifiedEmgValue: number
  emgHistory: { time: string; value: number }[]
  isDemoMode: boolean
  toggleDemoMode: () => void
  connect: () => Promise<void>
  disconnect: () => Promise<void>
}

const HardwareContext = createContext<HardwareContextValue | undefined>(undefined)

export function HardwareProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [emgValue, setEmgValue] = useState<number>(0)
  const [rectifiedEmgValue, setRectifiedEmgValue] = useState<number>(0)
  const [emgHistory, setEmgHistory] = useState<{ time: string; value: number }[]>([])
  
  const [isDemoMode, setIsDemoMode] = useState(false)
  
  const { addToast } = useToast()
  
  const portRef = useRef<any>(null)
  const readerRef = useRef<any>(null)
  const keepReadingRef = useRef(false)

  const demoKeyPressRef = useRef(false)

  // ── MOTOR DEL MODO DEMO ────────────────────────────────────────────────
  useEffect(() => {
    if (!isDemoMode) return

    setIsConnected(true)
    addToast('Modo Demo: ¡Mantén presionada la tecla ENTER!', 'info')

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cambiado a Enter
      if (e.code === 'Enter' || e.code === 'NumpadEnter') {
        e.preventDefault() 
        demoKeyPressRef.current = true
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'NumpadEnter') {
        e.preventDefault()
        demoKeyPressRef.current = false
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    const demoInterval = setInterval(() => {
      let nextValue = 0

      if (demoKeyPressRef.current) {
        // Ráfaga EMG Activa: Ruido de alta frecuencia entre -1200mV y +1200mV
        nextValue = (Math.random() - 0.5) * 2400
      } else {
        // Ruido de línea base (reposo): entre -25mV y +25mV
        nextValue = (Math.random() - 0.5) * 50
      }

      // El valor rectificado solo se usa para la lógica del juego (disparar)
      const rectified_mV = Math.abs(nextValue)

      setEmgValue(nextValue) // Bipolar (cruza el 0)
      setRectifiedEmgValue(rectified_mV) // Absoluto (siempre positivo)
      
      setEmgHistory((prev) => {
        // IMPORTANTE: Guardamos nextValue (bipolar) para que la gráfica baje a los negativos
        const newData = [...prev, { time: '', value: nextValue }]
        return newData.length > 100 ? newData.slice(newData.length - 100) : newData
      })
    }, 50)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      clearInterval(demoInterval)
      setIsConnected(false)
      setEmgValue(0)
      setRectifiedEmgValue(0)
      setEmgHistory([])
      demoKeyPressRef.current = false
    }
  }, [isDemoMode, addToast])

  const toggleDemoMode = () => setIsDemoMode((prev) => !prev)

  // ── LÓGICA DEL HARDWARE REAL ───────────────────────────────────────────
  const connect = async () => {
    if (isDemoMode) {
      addToast('Desactiva el Modo Demo antes de conectar el hardware real.', 'error')
      return
    }

    try {
      if (!('serial' in navigator)) {
        addToast('Tu navegador no soporta Web Serial. Usa Chrome o Edge.', 'error')
        return
      }

      const port = await (navigator as any).serial.requestPort()
      await port.open({ baudRate: 115200 })
      portRef.current = port
      setIsConnected(true)
      keepReadingRef.current = true
      addToast('¡ESP32 Conectado exitosamente!', 'success')
      readLoop(port)

    } catch (error) {
      console.error('Error al conectar:', error)
      addToast('Conexión cancelada o fallida.', 'error')
    }
  }

  const readLoop = async (port: any) => {
    const textDecoder = new TextDecoderStream()
    port.readable.pipeTo(textDecoder.writable)
    const reader = textDecoder.readable.getReader()
    readerRef.current = reader
    let buffer = ''

    try {
      while (keepReadingRef.current) {
        const { value, done } = await reader.read()
        if (done) break
        if (value) {
          buffer += value
          const lines = buffer.split('\n')
          if (lines.length > 1) {
            buffer = lines.pop() || ''
            const latestReading = lines[lines.length - 1].trim()
            const numericValue = parseFloat(latestReading)

            if (!isNaN(numericValue)) {
              // 1. Convertir ADC (0-4095) a Voltaje (0 - 3300 mV)
              const voltage_mV = (numericValue / 4095) * 3300
              
              // 2. Quitar el offset de 1.7V (1700 mV) para centrar en 0
              const bipolar_mV = voltage_mV - 1700
              
              // 3. Rectificar la señal (absoluto) para la lógica del juego
              const rectified_mV = Math.abs(bipolar_mV)

              setEmgValue(bipolar_mV)
              setRectifiedEmgValue(rectified_mV)
              
              setEmgHistory((prev) => {
                // Guardamos bipolar_mV para que la gráfica del hardware físico también vaya a negativos
                const newData = [...prev, { time: '', value: bipolar_mV }]
                return newData.length > 100 ? newData.slice(newData.length - 100) : newData
              })
            }
          }
        }
      }
    } catch (error) {
      console.error('Error leyendo el puerto serial:', error)
    } finally {
      reader.releaseLock()
    }
  }

  const disconnect = async () => {
    if (isDemoMode) {
      setIsDemoMode(false)
      addToast('Modo Demo desactivado', 'info')
      return
    }

    keepReadingRef.current = false
    try {
      if (readerRef.current) {
        await readerRef.current.cancel()
        readerRef.current = null
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
      if (portRef.current) {
        await portRef.current.close()
        portRef.current = null
      }
    } catch (error) {
      console.error('El navegador bloqueó el cierre del puerto:', error)
    } finally {
      setIsConnected(false)
      setEmgValue(0)
      setRectifiedEmgValue(0)
      setEmgHistory([])
      addToast('ESP32 Desconectado.', 'info')
    }
  }

  return (
    <HardwareContext.Provider value={{ 
      isConnected, 
      emgValue,
      rectifiedEmgValue,
      emgHistory, 
      isDemoMode,
      toggleDemoMode,
      connect, 
      disconnect 
    }}>
      {children}
    </HardwareContext.Provider>
  )
}

export function useHardware() {
  const context = useContext(HardwareContext)
  if (!context) {
    throw new Error('useHardware debe usarse dentro de HardwareProvider.')
  }
  return context
}