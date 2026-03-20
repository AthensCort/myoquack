import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Card } from '../components/common/Card'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const registerSchema = z
  .object({
    id_medico: z.string().min(1, 'El ID del medico es requerido.'),
    nombre_completo: z.string().min(3, 'El nombre completo es requerido.'),
    password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres.'),
    confirmPassword: z.string().min(6, 'Confirma la contrasena.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contrasenas no coinciden.',
  })

type RegisterFormValues = z.infer<typeof registerSchema>

export function RegisterPage() {
  const navigate = useNavigate()
  const { currentDoctor, register: registerDoctor } = useAuth()
  const { addToast } = useToast()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      id_medico: '',
      nombre_completo: '',
      password: '',
      confirmPassword: '',
    },
  })

  useEffect(() => {
    if (currentDoctor) {
      navigate('/records', { replace: true })
    }
  }, [currentDoctor, navigate])

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      await registerDoctor(values.id_medico, values.nombre_completo, values.password)
      addToast('Doctor registrado correctamente.', 'success')
      navigate('/records', { replace: true })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No fue posible registrar el doctor.'
      setError('root', { type: 'manual', message })
      addToast(message, 'error')
    }
  }

  return (
    <Card
      title="Registrar Doctor"
      subtitle="Crear una nueva cuenta de doctor en la API"
      className="w-full max-w-md border-primary2/20"
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div>
          <label htmlFor="id_medico" className="mb-1 block text-sm font-semibold">
            ID del medico
          </label>
          <input
            id="id_medico"
            type="text"
            autoComplete="username"
            {...register('id_medico')}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />
          {errors.id_medico && (
            <p className="mt-1 text-xs text-rose-600">{errors.id_medico.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="nombre_completo" className="mb-1 block text-sm font-semibold">
            Nombre completo
          </label>
          <input
            id="nombre_completo"
            type="text"
            autoComplete="name"
            {...register('nombre_completo')}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />
          {errors.nombre_completo && (
            <p className="mt-1 text-xs text-rose-600">{errors.nombre_completo.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-semibold">
            Contrasena
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register('password')}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-semibold">
            Confirmar contrasena
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-rose-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        {errors.root && <p className="text-sm text-rose-600">{errors.root.message}</p>}

        <div className="flex flex-col gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-accentYellow px-4 py-2.5 text-sm font-bold text-primary disabled:opacity-70"
          >
            {isSubmitting ? 'Registrando...' : 'Crear Cuenta'}
          </button>
          <Link
            to="/login"
            className="w-full rounded-xl border border-primary px-4 py-2.5 text-center text-sm font-semibold text-primary"
          >
            Volver a Login
          </Link>
        </div>
      </form>
    </Card>
  )
}
