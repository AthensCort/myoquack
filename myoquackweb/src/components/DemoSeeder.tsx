import { useState } from 'react'
import { useAppState } from '../context/AppStateContext'
import { useToast } from '../context/ToastContext'
import type { MusculoTrabajo } from '../models/types'

export function DemoSeeder() {
  const { 
    createPatient, 
    startSessionDraft, 
    setCalibrationDraft, 
    setPreGameConfigDraft, 
    simulateSessionEnd, 
    saveCurrentSession,
    refresh
  } = useAppState()
  const { addToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  // Función auxiliar para crear una sesión completa con datos simulados
  const generateSession = async (
    patientId: string, 
    musculo: MusculoTrabajo, 
    mvc: number, 
    reportName: string
  ) => {
    // 1. Iniciamos el borrador
    startSessionDraft(patientId)
    // 2. Simulamos la calibración
    setCalibrationDraft({ musculo, mvc_uv: mvc, threshold_uv: mvc * 0.70 })
    // 3. Simulamos la configuración
    setPreGameConfigDraft({ 
      config_gain: 1, 
      config_offset_mv: 0, 
      config_threshold_uv: mvc * 0.70, 
      tiempo_juego_segundos: 180 
    })
    // 4. 🔥 Generamos las matemáticas, gráficas RMS e iEMG falsas
    simulateSessionEnd() 
    // 5. Guardamos en la base de datos
    await saveCurrentSession(reportName)
  }

  const handleInjectData = async () => {
    setIsLoading(true)
    try {
      // 🏥 PACIENTE 1: Atleta de alto rendimiento
      const p1 = await createPatient({
        nombre: 'Alejandro',
        apellidos: 'Garza Treviño',
        fecha_nacimiento: '1998-05-14',
        genero: 'M',
        notas_clinicas: 'Paciente refiere dolor agudo en banda iliotibial. Iniciamos protocolo de fortalecimiento en Gluteus Medius preparatorio para Medio Maratón.'
      } as any) // "as any" por si cambiaste la interfaz de CreatePatientInput

      await generateSession(p1.id_paciente, 'Gluteus Medius', 850, 'Sesión 1 - Evaluación Base')
      await generateSession(p1.id_paciente, 'Gluteus Medius', 920, 'Sesión 2 - Aumento de Carga')
      await generateSession(p1.id_paciente, 'Gluteus Medius', 1100, 'Sesión 3 - Alta Médica Parcial')

      // 🏥 PACIENTE 2: Lesión de escalada
      const p2 = await createPatient({
        nombre: 'Valeria',
        apellidos: 'Sada Cantú',
        fecha_nacimiento: '2001-09-22',
        genero: 'F',
        notas_clinicas: 'Recuperación de microdesgarre por sobreesfuerzo en práctica de bouldering. Trabajo de resistencia.'
      } as any)

      await generateSession(p2.id_paciente, 'Biceps Brachii', 600, 'Sesión 1 - Terapia de Reactivación')
      await generateSession(p2.id_paciente, 'Biceps Brachii', 680, 'Sesión 2 - Resistencia')

      // 🏥 PACIENTE 3: Adulto Mayor
      const p3 = await createPatient({
        nombre: 'Héctor',
        apellidos: 'Montemayor',
        fecha_nacimiento: '1955-03-10',
        genero: 'M',
        notas_clinicas: 'Sarcopenia leve. Fortalecimiento de tren inferior para mejorar estabilidad al caminar.'
      } as any)

      await generateSession(p3.id_paciente, 'Quadriceps', 350, 'Sesión 1 - Familiarización MyoQuack')

      // Refrescamos la interfaz global
      await refresh()
      addToast('¡Base de datos clínica poblada exitosamente!', 'success')
      
    } catch (error) {
      console.error(error)
      addToast('Error al inyectar datos.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button 
      onClick={handleInjectData} 
      disabled={isLoading}
      className="fixed bottom-4 right-4 z-50 rounded-lg border-2 border-purple-500 bg-purple-900/80 px-4 py-2 font-mono text-sm font-bold text-purple-300 shadow-lg backdrop-blur-sm transition-all hover:bg-purple-600 hover:text-white"
    >
      {isLoading ? '⏳ INYECTANDO DATOS...' : '🌱 AUTO-LLENAR BD (DEMO)'}
    </button>
  )
}