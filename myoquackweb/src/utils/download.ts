export function downloadTextFile(
  fileName: string,
  content: string,
  mimeType = 'text/plain;charset=utf-8',
) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function downloadJson(fileName: string, payload: unknown) {
  downloadTextFile(
    fileName,
    JSON.stringify(payload, null, 2),
    'application/json;charset=utf-8',
  )
}
