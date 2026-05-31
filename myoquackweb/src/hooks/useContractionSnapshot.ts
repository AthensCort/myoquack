import { useState, useEffect, useRef } from 'react'

export function useContractionSnapshot(history: any[], currentValue: number, threshold: number) {
  const [snapshot, setSnapshot] = useState<any[] | null>(null)
  const isCoolingDown = useRef(false)

  useEffect(() => {
    // Si ya estamos en cooldown (evitar múltiples capturas de la misma contracción), salimos
    if (isCoolingDown.current) return

    // Detectar contracción (evento de disparo)
    if (currentValue > threshold && threshold > 0) {
      
      // Capturamos los últimos 50 puntos de historia (el "antes") 
      // y podríamos esperar un poco más para el "después"
      const capturedData = history.slice(-50)
      
      setSnapshot(capturedData)
      isCoolingDown.current = true

      // Cooldown de 2 segundos antes de permitir otra captura
      setTimeout(() => {
        isCoolingDown.current = false
      }, 2000)
    }
  }, [currentValue, threshold, history])

  return { snapshot, setSnapshot }
}