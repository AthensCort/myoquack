export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
  }).format(date)
}

export function formatNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat('es-MX', {
    maximumFractionDigits,
  }).format(value)
}
