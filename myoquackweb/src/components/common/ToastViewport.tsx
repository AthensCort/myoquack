import { useToast } from '../../context/ToastContext'

const toastStyles = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-rose-200 bg-rose-50 text-rose-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
}

export function ToastViewport() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="pointer-events-none fixed left-3 right-3 top-20 z-50 flex flex-col gap-2 sm:left-auto sm:right-4 sm:w-full sm:max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-sm ${
            toastStyles[toast.type]
          }`}
          role="alert"
        >
          <div className="flex items-start justify-between gap-3">
            <p>{toast.message}</p>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-xs font-semibold"
              aria-label="Cerrar notificacion"
            >
              Cerrar
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
