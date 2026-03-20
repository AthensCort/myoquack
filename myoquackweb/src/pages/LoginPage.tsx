import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Card } from '../components/common/Card'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { getApiBaseUrl } from '../services/api'

const loginSchema = z.object({
  id_medico: z.string().min(1, 'El ID del medico es requerido.'),
  password: z.string().min(1, 'La contrasena es requerida.'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const { currentDoctor, login } = useAuth()
  const { addToast } = useToast()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      id_medico: 'DOC001',
      password: '',
    },
  })

  useEffect(() => {
    if (currentDoctor) {
      navigate('/records', { replace: true })
    }
  }, [currentDoctor, navigate])

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login(values.id_medico, values.password)
      addToast('Sesion iniciada correctamente.', 'success')
      navigate('/records', { replace: true })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No fue posible iniciar sesion con la API.'
      setError('root', { type: 'manual', message })
      addToast(message, 'error')
    }
  }

  return (
    <Card
      title="Login Doctor"
      subtitle="Autenticacion contra la API MyoQuack"
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
          <label htmlFor="password" className="mb-1 block text-sm font-semibold">
            Contrasena
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register('password')}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p>
          )}
        </div>

        {errors.root && <p className="text-sm text-rose-600">{errors.root.message}</p>}

        <div className="flex flex-col gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-accentYellow px-4 py-2.5 text-sm font-bold text-primary disabled:opacity-70"
          >
            {isSubmitting ? 'Validando...' : 'Ingresar'}
          </button>
          <Link
            to="/register"
            className="w-full rounded-xl border border-primary px-4 py-2.5 text-center text-sm font-semibold text-primary"
          >
            Registrar
          </Link>
        </div>
      </form>
      <p className="mt-4 text-xs text-slate-500">
        API base URL: <strong>{getApiBaseUrl()}</strong>
      </p>
      <p className="mt-2 text-xs text-slate-500">
        Si usaste el seed del backend, prueba <strong>DOC001</strong> / <strong>123456</strong>.
      </p>
    </Card>
  )
}
