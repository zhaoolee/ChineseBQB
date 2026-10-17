export function imageFileFromClipboard(data: DataTransfer | null): File | null {
  if (!data) return null
  for (const item of data.items) {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) continue
    const file = item.getAsFile()
    if (file) return file
  }
  for (const file of data.files) {
    if (file.type.startsWith('image/')) return file
  }
  return null
}
