import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Card } from '../components/common/Card'
import { useAppState } from '../context/AppStateContext'

const preGameSchema = z
  .object({
    config_gain: z.number().min(1, 'Rango: 1-500').max(500, 'Rango: 1-500'),
    config_offset_mv: z.number().min(-50, 'Rango: -50 a 50 mV').max(50, 'Rango: -50 a 50 mV'),
    config_threshold_uv: z.number().min(0, 'Rango: 0-5000 uV').max(5000, 'Rango: 0-5000 uV'),
    minutos: z.number().int().min(0, 'Minimo 0').max(10, 'Maximo 10'),
    segundos: z.number().int().min(0, 'Minimo 0').max(59, 'Maximo 59'),
  })
  .refine(
    (data) => {
      const total = data.minutos * 60 + data.segundos
      return total >= 10 && total <= 600
    },
    {
      message: 'Tiempo total debe estar entre 10 y 600 segundos.',
      path: ['segundos'],
    },
  )

type PreGameFormValues = z.infer<typeof preGameSchema>

export function PreGamePage() {
  const navigate = useNavigate()
  const { currentSessionDraft, setPreGameConfigDraft, selectedPatient } = useAppState()

  const calibration = currentSessionDraft?.calibration
  const existingConfig = currentSessionDraft?.config
  const defaultSeconds = existingConfig?.tiempo_juego_segundos ?? 60
  const defaultMinutes = Math.floor(defaultSeconds / 60)
  const defaultExtraSeconds = defaultSeconds % 60

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PreGameFormValues>({
    resolver: zodResolver(preGameSchema),
    defaultValues: {
      config_gain: existingConfig?.config_gain ?? 100,
      config_offset_mv: existingConfig?.config_offset_mv ?? 0,
      config_threshold_uv:
        existingConfig?.config_threshold_uv ?? calibration?.threshold_uv ?? 150,
      minutos: defaultMinutes,
      segundos: defaultExtraSeconds,
    },
  })

  const minutes = Number(watch('minutos') ?? 0)
  const seconds = Number(watch('segundos') ?? 0)
  const totalSeconds = minutes * 60 + seconds

  if (!selectedPatient || !currentSessionDraft) {
    return (
      <Card title="Pre-Game Configuration" subtitle="RF-05">
        <p className="text-sm text-slate-600">
          No hay paciente o sesion seleccionada. Inicie una sesion desde Registros.
        </p>
        <button
          type="button"
          onClick={() => navigate('/records')}
          className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          Ir a Registros
        </button>
      </Card>
    )
  }

  if (!calibration) {
    return (
      <Card title="Pre-Game Configuration" subtitle="RF-05">
        <p className="text-sm text-slate-600">
          Debe completar calibracion antes de configurar pre-game.
        </p>
        <button
          type="button"
          onClick={() => navigate('/calibration')}
          className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          Ir a Calibracion
        </button>
      </Card>
    )
  }

  const onSubmit = (values: PreGameFormValues) => {
    const tiempo_juego_segundos = values.minutos * 60 + values.segundos
    setPreGameConfigDraft({
      config_gain: values.config_gain,
      config_offset_mv: values.config_offset_mv,
      config_threshold_uv: values.config_threshold_uv,
      tiempo_juego_segundos,
    })
    navigate('/game')
  }

  return (
    <Card
      title="Pre-Game Configuration"
      subtitle={`Paciente: ${selectedPatient.nombre} ${selectedPatient.apellidos} | Musculo: ${calibration.musculo}`}
      className="w-full"
    >
      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label htmlFor="config_gain" className="mb-1 block text-sm font-semibold">
            Gain (1-500)
          </label>
          <input
            id="config_gain"
            type="number"
            {...register('config_gain', { valueAsNumber: true })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />
          {errors.config_gain && (
            <p className="mt-1 text-xs text-rose-600">{errors.config_gain.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="config_offset_mv" className="mb-1 block text-sm font-semibold">
            Offset (mV)
          </label>
          <input
            id="config_offset_mv"
            type="number"
            step="0.1"
            {...register('config_offset_mv', { valueAsNumber: true })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />
          {errors.config_offset_mv && (
            <p className="mt-1 text-xs text-rose-600">{errors.config_offset_mv.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="config_threshold_uv" className="mb-1 block text-sm font-semibold">
            Threshold (uV)
          </label>
          <input
            id="config_threshold_uv"
            type="number"
            step="0.1"
            {...register('config_threshold_uv', { valueAsNumber: true })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />
          {errors.config_threshold_uv && (
            <p className="mt-1 text-xs text-rose-600">
              {errors.config_threshold_uv.message}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-blue-100 bg-softBlue p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Threshold de calibracion
          </p>
          <p className="mt-1 text-lg font-bold text-primary">
            {calibration.threshold_uv.toFixed(2)} uV
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Puede ajustar manualmente el threshold final.
          </p>
        </div>

        <div>
          <label htmlFor="minutos" className="mb-1 block text-sm font-semibold">
            Tiempo - Minutos
          </label>
          <input
            id="minutos"
            type="number"
            {...register('minutos', { valueAsNumber: true })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="segundos" className="mb-1 block text-sm font-semibold">
            Tiempo - Segundos
          </label>
          <input
            id="segundos"
            type="number"
            {...register('segundos', { valueAsNumber: true })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />
          {errors.segundos && (
            <p className="mt-1 text-xs text-rose-600">{errors.segundos.message}</p>
          )}
        </div>

        <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          Tiempo total del juego: <strong>{totalSeconds}</strong> segundos
        </div>

        <div className="md:col-span-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate('/calibration')}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold"
          >
            Volver
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-accentYellow px-4 py-2 text-sm font-bold text-primary"
          >
            Confirmar y continuar a Game
          </button>
        </div>
      </form>
    </Card>
  )
}
