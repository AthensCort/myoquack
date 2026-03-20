import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  CalibrationDraft,
  EventoContraccion,
  Paciente,
  PreGameConfig,
  ReportListItem,
  SesionEmg,
  SessionDraft,
  SessionSimulationResult,
} from '../models/types'
import {
  createPatientInApi,
  deletePatientInApi,
  deleteSessionInApi,
  getPatientsCsvText,
  getSessionEventsCsvText,
  getSessionExportJsonText,
  listPatientsFromApi,
  listReportsFromApi,
  listSessionsFromApi,
  saveSessionToApi,
  type CreatePatientInput,
} from '../services/backend'
import {
  clearSavedSessionReference,
  clearSessionDraftForPatient,
  createSessionDraft,
  finalizeSessionFromSimulation,
  getCurrentSessionDraft,
  markDraftSessionSaved,
  setCalibrationDraft as setCalibrationInDraft,
  setPreGameConfigDraft as setPreGameConfigInDraft,
} from '../services/sessionDraft'
import { downloadTextFile } from '../utils/download'
import { useAuth } from './AuthContext'

interface AppStateValue {
  patients: Paciente[]
  sessions: SesionEmg[]
  reports: ReportListItem[]
  selectedPatientId: string | null
  selectedPatient: Paciente | null
  currentSessionDraft: SessionDraft | null
  setSelectedPatientId: (patientId: string | null) => void
  createPatient: (input: CreatePatientInput) => Promise<Paciente>
  deletePatient: (patientId: string) => Promise<void>
  startSessionDraft: (patientId: string) => SessionDraft
  setCalibrationDraft: (calibration: CalibrationDraft) => SessionDraft
  setPreGameConfigDraft: (config: PreGameConfig) => SessionDraft
  simulateSessionEnd: () => SessionSimulationResult
  saveCurrentSession: (
    reportName: string,
  ) => Promise<{ session: SesionEmg; events: EventoContraccion[] }>
  deleteSession: (sessionId: string) => Promise<void>
  downloadPatientsCsv: () => Promise<void>
  downloadSessionEventsCsv: (sessionId: string) => Promise<void>
  downloadSessionJson: (sessionId: string) => Promise<void>
  refresh: () => Promise<void>
}

const AppStateContext = createContext<AppStateValue | undefined>(undefined)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { currentDoctor } = useAuth()
  const [patients, setPatients] = useState<Paciente[]>([])
  const [sessions, setSessions] = useState<SesionEmg[]>([])
  const [reports, setReports] = useState<ReportListItem[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [currentSessionDraft, setCurrentSessionDraft] =
    useState<SessionDraft | null>(getCurrentSessionDraft())

  const selectedPatient = useMemo(
    () =>
      selectedPatientId
        ? patients.find((patient) => patient.id_paciente === selectedPatientId) ?? null
        : null,
    [patients, selectedPatientId],
  )

  const syncDraft = () => {
    setCurrentSessionDraft(getCurrentSessionDraft())
  }

  const loadReports = async () => {
    if (!currentDoctor) {
      setReports([])
      return []
    }

    const nextReports = await listReportsFromApi()
    setReports(nextReports)
    return nextReports
  }

  const loadPatients = async (preferredPatientId?: string | null) => {
    if (!currentDoctor) {
      setPatients([])
      setSelectedPatientId(null)
      return []
    }

    const nextPatients = await listPatientsFromApi()
    setPatients(nextPatients)
    setSelectedPatientId((previous) => {
      const candidate = preferredPatientId ?? previous
      if (candidate && nextPatients.some((patient) => patient.id_paciente === candidate)) {
        return candidate
      }
      return nextPatients[0]?.id_paciente ?? null
    })
    return nextPatients
  }

  const loadSessions = async (patientId: string | null = selectedPatientId) => {
    if (!currentDoctor || !patientId) {
      setSessions([])
      return []
    }

    const nextSessions = await listSessionsFromApi(patientId)
    setSessions(nextSessions)
    return nextSessions
  }

  const refresh = async () => {
    syncDraft()
    if (!currentDoctor) {
      setPatients([])
      setSessions([])
      setReports([])
      setSelectedPatientId(null)
      return
    }

    await Promise.all([loadPatients(selectedPatientId), loadReports()])
    await loadSessions(selectedPatientId)
  }

  useEffect(() => {
    if (!currentDoctor) {
      setPatients([])
      setSessions([])
      setReports([])
      setSelectedPatientId(null)
      setCurrentSessionDraft(null)
      return
    }

    syncDraft()
    void Promise.all([loadPatients(), loadReports()]).catch((error: unknown) => {
      console.error('No fue posible cargar datos iniciales:', error)
    })
  }, [currentDoctor])

  useEffect(() => {
    if (!currentDoctor) {
      setSessions([])
      return
    }

    void loadSessions(selectedPatientId).catch((error: unknown) => {
      console.error('No fue posible cargar sesiones:', error)
    })
  }, [currentDoctor, selectedPatientId])

  const createPatient = async (input: CreatePatientInput) => {
    const patient = await createPatientInApi(input)
    await loadPatients(patient.id_paciente)
    setSelectedPatientId(patient.id_paciente)
    setSessions([])
    return patient
  }

  const deletePatient = async (patientId: string) => {
    await deletePatientInApi(patientId)
    clearSessionDraftForPatient(patientId)
    syncDraft()
    await Promise.all([loadPatients(selectedPatientId === patientId ? null : selectedPatientId), loadReports()])
  }

  const startSessionDraft = (patientId: string) => {
    const draft = createSessionDraft(patientId)
    setSelectedPatientId(patientId)
    setCurrentSessionDraft(draft)
    return draft
  }

  const setCalibrationDraft = (calibration: CalibrationDraft) => {
    const draft = setCalibrationInDraft(calibration)
    setCurrentSessionDraft(draft)
    return draft
  }

  const setPreGameConfigDraft = (config: PreGameConfig) => {
    const draft = setPreGameConfigInDraft(config)
    setCurrentSessionDraft(draft)
    return draft
  }

  const simulateSessionEnd = () => {
    const result = finalizeSessionFromSimulation()
    syncDraft()
    return result
  }

  const saveCurrentSession = async (reportName: string) => {
    const draft = getCurrentSessionDraft()
    if (!draft) {
      throw new Error('No hay un borrador de sesion activo.')
    }

    const saved = await saveSessionToApi(reportName, draft)
    markDraftSessionSaved(saved.session, saved.events)
    syncDraft()
    await Promise.all([loadReports(), loadSessions(draft.id_paciente)])
    return saved
  }

  const deleteSession = async (sessionId: string) => {
    await deleteSessionInApi(sessionId)
    clearSavedSessionReference(sessionId)
    syncDraft()
    await Promise.all([loadReports(), loadSessions(selectedPatientId)])
  }

  const downloadPatientsCsv = async () => {
    const csv = await getPatientsCsvText()
    const filename = `patients_${new Date().toISOString().slice(0, 10)}.csv`
    downloadTextFile(filename, csv, 'text/csv;charset=utf-8')
  }

  const downloadSessionEventsCsv = async (sessionId: string) => {
    const csv = await getSessionEventsCsvText(sessionId)
    downloadTextFile(`session_${sessionId}_events.csv`, csv, 'text/csv;charset=utf-8')
  }

  const downloadSessionJson = async (sessionId: string) => {
    const payload = await getSessionExportJsonText(sessionId)
    downloadTextFile(
      `session_${sessionId}_report.json`,
      payload,
      'application/json;charset=utf-8',
    )
  }

  const value: AppStateValue = {
    patients,
    sessions,
    reports,
    selectedPatientId,
    selectedPatient,
    currentSessionDraft,
    setSelectedPatientId,
    createPatient,
    deletePatient,
    startSessionDraft,
    setCalibrationDraft,
    setPreGameConfigDraft,
    simulateSessionEnd,
    saveCurrentSession,
    deleteSession,
    downloadPatientsCsv,
    downloadSessionEventsCsv,
    downloadSessionJson,
    refresh,
  }

  return (
    <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
  )
}

export function useAppState() {
  const context = useContext(AppStateContext)
  if (!context) {
    throw new Error('useAppState debe usarse dentro de AppStateProvider.')
  }
  return context
}
