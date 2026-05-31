import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Card } from '../components/common/Card'
import { useAppState } from '../context/AppStateContext'
import { useToast } from '../context/ToastContext'

// 1. Schema strictly follows your new Prisma Model
const patientSchema = z.object({
  nombre: z.string().min(2, 'Nombre requerido.'),
  apellidos: z.string().min(2, 'Apellidos requeridos.'),
  fecha_nacimiento: z.string().min(1, 'Fecha de nacimiento requerida.'),
  genero: z.enum(['M', 'F']),
  notas_clinicas: z.string().max(500, 'Máximo 500 caracteres.').optional(),
})

type PatientFormValues = z.infer<typeof patientSchema>

export function PatientNewPage() {
  const navigate = useNavigate()
  const { createPatient } = useAppState()
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
      fecha_nacimiento: '',
      genero: 'M',
      notas_clinicas: '',
    },
  })

  const onSubmit = async (values: PatientFormValues) => {
    try {
      await createPatient({
        ...values,
        // Convert the HTML date string "YYYY-MM-DD" into a real ISO Date object for Prisma
        fecha_nacimiento: new Date(values.fecha_nacimiento).toISOString(), 
      })
      
      addToast(`Paciente registrado exitosamente.`, 'success')
      navigate('/records')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No fue posible registrar el paciente.'
      addToast(message, 'error')
    }
  }

  return (
    <Card
      title="Nuevo paciente"
      subtitle="Ingresa los datos del paciente a registrar"
      className="w-full"
    >
      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
        {/* Name */}
        <div>
          <label htmlFor="nombre" className="mb-1 block text-sm font-semibold">
            Nombre
          </label>
          <input
            id="nombre"
            type="text"
            {...register('nombre')}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          {errors.nombre && (
            <p className="mt-1 text-xs text-rose-600">{errors.nombre.message}</p>
          )}
        </div>

        {/* Last Names */}
        <div>
          <label htmlFor="apellidos" className="mb-1 block text-sm font-semibold">
            Apellidos
          </label>
          <input
            id="apellidos"
            type="text"
            {...register('apellidos')}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          {errors.apellidos && (
            <p className="mt-1 text-xs text-rose-600">{errors.apellidos.message}</p>
          )}
        </div>

        {/* Date of Birth */}
        <div>
          <label htmlFor="fecha_nacimiento" className="mb-1 block text-sm font-semibold">
            Fecha de nacimiento
          </label>
          <input
            id="fecha_nacimiento"
            type="date"
            {...register('fecha_nacimiento')}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          {errors.fecha_nacimiento && (
            <p className="mt-1 text-xs text-rose-600">{errors.fecha_nacimiento.message}</p>
          )}
        </div>

        {/* Gender */}
        <div>
          <label htmlFor="genero" className="mb-1 block text-sm font-semibold">
            Género
          </label>
          <select
            id="genero"
            {...register('genero')}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </select>
          {errors.genero && (
            <p className="mt-1 text-xs text-rose-600">{errors.genero.message}</p>
          )}
        </div>

        {/* Clinical Notes */}
        <div className="md:col-span-2">
          <label htmlFor="notas_clinicas" className="mb-1 block text-sm font-semibold">
            Notas clínicas
          </label>
          <textarea
            id="notas_clinicas"
            rows={4}
            {...register('notas_clinicas')}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          {errors.notas_clinicas && (
            <p className="mt-1 text-xs text-rose-600">{errors.notas_clinicas.message}</p>
          )}
        </div>

        {/* Actions */}
        <div className="md:col-span-2 flex justify-end gap-2 mt-2">
          <button
            type="button"
            onClick={() => navigate('/records')}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-accentYellow px-6 py-2 text-sm font-bold text-primary hover:brightness-110 disabled:opacity-70 transition-all"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar paciente'}
          </button>
        </div>
      </form>
    </Card>
  )
}