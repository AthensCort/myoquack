import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Card } from '../components/common/Card'
import { useAppState } from '../context/AppStateContext'
import { useToast } from '../context/ToastContext'

const patientSchema = z.object({
  nombre: z.string().min(2, 'Nombre requerido.'),
  apellidos: z.string().min(2, 'Apellidos requeridos.'),
  edad: z.number().int().min(1, 'Edad invalida.').max(120, 'Edad invalida.'),
  genero: z.enum(['M', 'F', 'O']),
  lado_trabajo: z.enum(['Izquierdo', 'Derecho', 'Ambos']),
  notas_clinicas: z.string().max(500, 'Maximo 500 caracteres.').optional(),
})

type PatientFormValues = z.infer<typeof patientSchema>

export function PatientNewPage() {
  const navigate = useNavigate()
  const { createPatient, startSessionDraft } = useAppState()
  const { addToast } = useToast()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      nombre: '',
      apellidos: '',
      edad: 18,
      genero: 'M',
      lado_trabajo: 'Derecho',
      notas_clinicas: '',
    },
  })

  const onSubmit = async (values: PatientFormValues) => {
    try {
      const patient = await createPatient({
        ...values,
        notas_clinicas: values.notas_clinicas ?? '',
      })
      startSessionDraft(patient.id_paciente)
      addToast(`Paciente ${patient.id_paciente} registrado.`, 'success')
      navigate('/calibration')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No fue posible registrar el paciente.'
      addToast(message, 'error')
    }
  }

  return (
    <Card
      title="Registro de Paciente"
      subtitle="RF-02: alta de paciente y redireccion automatica a calibracion"
      className="w-full"
    >
      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label htmlFor="nombre" className="mb-1 block text-sm font-semibold">
            Nombre
          </label>
          <input
            id="nombre"
            type="text"
            {...register('nombre')}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />
          {errors.nombre && (
            <p className="mt-1 text-xs text-rose-600">{errors.nombre.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="apellidos" className="mb-1 block text-sm font-semibold">
            Apellidos
          </label>
          <input
            id="apellidos"
            type="text"
            {...register('apellidos')}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />
          {errors.apellidos && (
            <p className="mt-1 text-xs text-rose-600">{errors.apellidos.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="edad" className="mb-1 block text-sm font-semibold">
            Edad
          </label>
          <input
            id="edad"
            type="number"
            {...register('edad', { valueAsNumber: true })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />
          {errors.edad && (
            <p className="mt-1 text-xs text-rose-600">{errors.edad.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="genero" className="mb-1 block text-sm font-semibold">
            Genero
          </label>
          <select
            id="genero"
            {...register('genero')}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          >
            <option value="M">M</option>
            <option value="F">F</option>
            <option value="O">O</option>
          </select>
          {errors.genero && (
            <p className="mt-1 text-xs text-rose-600">{errors.genero.message}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label htmlFor="lado_trabajo" className="mb-1 block text-sm font-semibold">
            Lado de trabajo
          </label>
          <select
            id="lado_trabajo"
            {...register('lado_trabajo')}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          >
            <option value="Izquierdo">Izquierdo</option>
            <option value="Derecho">Derecho</option>
            <option value="Ambos">Ambos</option>
          </select>
          {errors.lado_trabajo && (
            <p className="mt-1 text-xs text-rose-600">{errors.lado_trabajo.message}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label htmlFor="notas_clinicas" className="mb-1 block text-sm font-semibold">
            Notas clinicas
          </label>
          <textarea
            id="notas_clinicas"
            rows={4}
            {...register('notas_clinicas')}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />
          {errors.notas_clinicas && (
            <p className="mt-1 text-xs text-rose-600">{errors.notas_clinicas.message}</p>
          )}
        </div>

        <div className="md:col-span-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate('/records')}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-textDark"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-accentYellow px-4 py-2 text-sm font-bold text-primary disabled:opacity-70"
          >
            Guardar Paciente
          </button>
        </div>
      </form>
    </Card>
  )
}
