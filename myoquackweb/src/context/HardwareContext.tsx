import { createContext, useContext, useState, useRef, useEffect, type ReactNode } from 'react'
import { useToast } from './ToastContext'

interface HardwareContextValue {
  isConnected: boolean
  emgValue: number
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
  const [emgHistory, setEmgHistory] = useState<{ time: string; value: number }[]>([])
  
  // NEW: Demo Mode State
  const [isDemoMode, setIsDemoMode] = useState(false)
  
  const { addToast } = useToast()
  
  const portRef = useRef<any>(null)
  const readerRef = useRef<any>(null)
  const keepReadingRef = useRef(false)

  // NEW: The Demo Mode Engine
  useEffect(() => {
    if (!isDemoMode) return

    setIsConnected(true) // Trick the app into thinking hardware is connected
    addToast('Modo Demo: ¡Mantén presionada la barra espaciadora!', 'info')

    let simulatedTarget = 100 // Resting baseline

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault() // Prevents the page from scrolling down!
        simulatedTarget = 3800 // High spike, similar to a strong MVC
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        simulatedTarget = 100 // Drop back to rest
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    // Simulate the readLoop pushing data at ~50ms intervals
    const demoInterval = setInterval(() => {
      // Add random noise (+/- 100) to make it look like a real biological signal
      const noise = (Math.random() * 200) - 100
      const currentValue = Math.max(0, simulatedTarget + noise)

      setEmgValue(currentValue)
      setEmgHistory((prev) => {
        const newData = [...prev, { time: '', value: currentValue }]
        return newData.length > 100 ? newData.slice(newData.length - 100) : newData
      })
    }, 50)

    // Cleanup when you turn Demo Mode off
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      clearInterval(demoInterval)
      setIsConnected(false)
      setEmgValue(0)
      setEmgHistory([])
    }
  }, [isDemoMode, addToast])

  const toggleDemoMode = () => setIsDemoMode((prev) => !prev)

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
              setEmgValue(numericValue)
              setEmgHistory((prev) => {
                const newData = [...prev, { time: '', value: numericValue }]
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
    // If we are in demo mode, disconnect just turns it off
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
      setEmgHistory([])
      addToast('ESP32 Desconectado.', 'info')
    }
  }

  return (
    <HardwareContext.Provider value={{ 
      isConnected, 
      emgValue, 
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