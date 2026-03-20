import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/common/Card'
import { ConfirmModal } from '../components/common/ConfirmModal'
import { useAppState } from '../context/AppStateContext'
import { useToast } from '../context/ToastContext'
import { formatDate, formatDateTime, formatNumber } from '../utils/format'

export function RecordsPage() {
  const navigate = useNavigate()
  const {
    patients,
    sessions,
    selectedPatientId,
    selectedPatient,
    setSelectedPatientId,
    deletePatient,
    startSessionDraft,
    downloadPatientsCsv,
    downloadSessionEventsCsv,
  } = useAppState()
  const { addToast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [patientToDelete, setPatientToDelete] = useState<string | null>(null)

  const filteredPatients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) {
      return patients
    }
    return patients.filter((patient) => {
      const fullName = `${patient.nombre} ${patient.apellidos}`.toLowerCase()
      return (
        fullName.includes(term) ||
        patient.id_paciente.toLowerCase().includes(term)
      )
    })
  }, [patients, searchTerm])

  const createSessionForSelectedPatient = () => {
    if (!selectedPatientId) {
      return
    }
    startSessionDraft(selectedPatientId)
    navigate('/calibration')
  }

  return (
    <>
      <Card
        title="Pantalla 2 - Registros"
        subtitle="RF-03: consulta de pacientes, sesiones y flujo de nueva sesion"
        actions={
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => navigate('/patients/new')}
              className="w-full rounded-xl bg-accentYellow px-4 py-2 text-sm font-bold text-primary sm:w-auto"
            >
              Registrar Paciente
            </button>
            <button
              type="button"
              onClick={createSessionForSelectedPatient}
              disabled={!selectedPatientId}
              className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              Nueva Sesion
            </button>
            <button
              type="button"
              onClick={() => void downloadPatientsCsv()}
              className="w-full rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary sm:w-auto"
            >
              Descargar CSV Pacientes
            </button>
          </div>
        }
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-4">
            <label htmlFor="patient-search" className="block text-sm font-semibold">
              Buscar paciente
            </label>
            <input
              id="patient-search"
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="ID o nombre..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
            <div className="overflow-x-auto rounded-xl border border-blue-100">
              <table className="min-w-[680px] w-full divide-y divide-blue-100 text-sm">
                <thead className="bg-softBlue text-left text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2">Edad</th>
                    <th className="px-3 py-2">Genero</th>
                    <th className="px-3 py-2">Lado</th>
                    <th className="px-3 py-2">Registro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50">
                  {filteredPatients.length === 0 && (
                    <tr>
                      <td className="px-3 py-3 text-slate-500" colSpan={6}>
                        No hay pacientes para mostrar.
                      </td>
                    </tr>
                  )}
                  {filteredPatients.map((patient) => {
                    const isSelected = patient.id_paciente === selectedPatientId
                    return (
                      <tr
                        key={patient.id_paciente}
                        className={`cursor-pointer transition ${
                          isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                        }`}
                        onClick={() => setSelectedPatientId(patient.id_paciente)}
                      >
                        <td className="px-3 py-2 font-semibold">{patient.id_paciente}</td>
                        <td className="px-3 py-2">{`${patient.nombre} ${patient.apellidos}`}</td>
                        <td className="px-3 py-2">{patient.edad}</td>
                        <td className="px-3 py-2">{patient.genero}</td>
                        <td className="px-3 py-2">{patient.lado_trabajo}</td>
                        <td className="px-3 py-2">{formatDate(patient.fecha_registro)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
            <h3 className="text-lg font-bold text-textDark">
              {selectedPatient
                ? `Sesiones de ${selectedPatient.nombre} ${selectedPatient.apellidos}`
                : 'Seleccione un paciente'}
            </h3>
            {selectedPatient && (
              <p className="mt-1 text-xs text-slate-500">
                ID: {selectedPatient.id_paciente} | Lado: {selectedPatient.lado_trabajo}
              </p>
            )}
            <div className="mt-4 overflow-x-auto rounded-xl border border-blue-100 bg-white">
              <table className="min-w-[860px] w-full divide-y divide-blue-100 text-xs">
                <thead className="bg-softBlue text-left uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-2 py-2">ID Sesion</th>
                    <th className="px-2 py-2">Reporte</th>
                    <th className="px-2 py-2">Fecha</th>
                    <th className="px-2 py-2">Musculo</th>
                    <th className="px-2 py-2">Contr.</th>
                    <th className="px-2 py-2">Patitos</th>
                    <th className="px-2 py-2">Threshold</th>
                    <th className="px-2 py-2">Tiempo</th>
                    <th className="px-2 py-2">CSV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50">
                  {sessions.length === 0 && (
                    <tr>
                      <td className="px-2 py-3 text-slate-500" colSpan={9}>
                        Este paciente aun no tiene sesiones guardadas.
                      </td>
                    </tr>
                  )}
                  {sessions.map((session) => (
                    <tr key={session.id_sesion} className="hover:bg-slate-50">
                      <td className="px-2 py-2 font-semibold">{session.id_sesion}</td>
                      <td className="px-2 py-2">{session.nombre_reporte}</td>
                      <td className="px-2 py-2">{formatDateTime(session.fecha_hora)}</td>
                      <td className="px-2 py-2">{session.musculo}</td>
                      <td className="px-2 py-2">{session.total_contracciones}</td>
                      <td className="px-2 py-2">{session.total_patitos}</td>
                      <td className="px-2 py-2">
                        {formatNumber(session.config_threshold_uv)} uV
                      </td>
                      <td className="px-2 py-2">{session.tiempo_juego_segundos}s</td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => void downloadSessionEventsCsv(session.id_sesion)}
                          className="rounded-lg border border-primary px-2 py-1 font-semibold text-primary"
                        >
                          Descargar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={createSessionForSelectedPatient}
                disabled={!selectedPatientId}
                className="w-full rounded-xl bg-primary2 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                Ir a Calibracion
              </button>
              <button
                type="button"
                onClick={() => navigate('/reports')}
                className="w-full rounded-xl border border-primary2 px-4 py-2 text-sm font-semibold text-primary2 sm:w-auto"
              >
                Ir a Reportes
              </button>
              <button
                type="button"
                onClick={() => selectedPatientId && setPatientToDelete(selectedPatientId)}
                disabled={!selectedPatientId}
                className="w-full rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                Eliminar Paciente
              </button>
            </div>
          </div>
        </div>
      </Card>
      <ConfirmModal
        open={patientToDelete !== null}
        title="Eliminar paciente"
        description="Esta accion elimina el paciente y todas sus sesiones guardadas."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onCancel={() => setPatientToDelete(null)}
        onConfirm={() => {
          if (!patientToDelete) {
            return
          }
          void (async () => {
            try {
              await deletePatient(patientToDelete)
              addToast(`Paciente ${patientToDelete} eliminado.`, 'success')
            } catch (error) {
              addToast(
                error instanceof Error
                  ? error.message
                  : 'No fue posible eliminar el paciente.',
                'error',
              )
            } finally {
              setPatientToDelete(null)
            }
          })()
        }}
      />
    </>
  )
}
