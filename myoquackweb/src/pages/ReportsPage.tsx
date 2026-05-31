import { useState } from 'react'
import { Card } from '../components/common/Card'
import { ConfirmModal } from '../components/common/ConfirmModal'
import { useAppState } from '../context/AppStateContext'
import { useToast } from '../context/ToastContext'
import { formatDateTime } from '../utils/format'

export function ReportsPage() {
  const { reports, deleteSession, downloadSessionEventsCsv, downloadSessionJson } =
    useAppState()
  const { addToast } = useToast()
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)

  return (
    <>
      <Card
        title="Gestion de reportes"
        subtitle="RF-08: guardar, descargar y eliminar sesiones"
      >
        <div className="overflow-x-auto rounded-xl border border-blue-100 dark:border-slate-700">
          <table className="w-full min-w-[760px] divide-y divide-blue-100 text-sm dark:divide-slate-700">
            <thead className="bg-softBlue text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="px-3 py-2">ID Sesion</th>
                <th className="px-3 py-2">Paciente</th>
                <th className="px-3 py-2">Reporte</th>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Musculo</th>
                <th className="px-3 py-2">Contr.</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50 dark:divide-slate-800">
              {reports.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400" colSpan={7}>
                    No hay sesiones guardadas.
                  </td>
                </tr>
              )}
              {reports.map(({ session, patient }) => (
                <tr key={session.id_sesion} className="hover:bg-slate-50 dark:hover:bg-slate-800/70">
                  <td className="px-3 py-2 font-semibold">{session.id_sesion}</td>
                  <td className="px-3 py-2">{`${patient.nombre} ${patient.apellidos}`}</td>
                  <td className="px-3 py-2">{session.nombre_reporte}</td>
                  <td className="px-3 py-2">{formatDateTime(session.fecha_hora)}</td>
                  <td className="px-3 py-2">{session.musculo}</td>
                  <td className="px-3 py-2">{session.total_contracciones}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void downloadSessionJson(session.id_sesion)}
                        className="rounded-lg border border-primary px-2 py-1 text-xs font-semibold text-primary dark:border-blue-400 dark:text-blue-200"
                      >
                        JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => void downloadSessionEventsCsv(session.id_sesion)}
                        className="rounded-lg border border-primary2 px-2 py-1 text-xs font-semibold text-primary2 dark:border-blue-400 dark:text-blue-200"
                      >
                        CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => setSessionToDelete(session.id_sesion)}
                        className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmModal
        open={sessionToDelete !== null}
        title="Eliminar sesion"
        description="Esta accion elimina la sesion y sus eventos asociados en memoria."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onCancel={() => setSessionToDelete(null)}
        onConfirm={() => {
          if (!sessionToDelete) {
            return
          }
          void (async () => {
            try {
              await deleteSession(sessionToDelete)
              addToast(`Sesion ${sessionToDelete} eliminada.`, 'success')
            } catch (error) {
              addToast(
                error instanceof Error
                  ? error.message
                  : 'No fue posible eliminar la sesion.',
                'error',
              )
            } finally {
              setSessionToDelete(null)
            }
          })()
        }}
      />
    </>
  )
}
