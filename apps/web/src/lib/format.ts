export function relativeTime(iso: string): string {
  const d = new Date(iso).getTime()
  const diff = Math.max(1, Math.round((Date.now() - d) / 1000))
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  if (diff < 86400 * 30) return `${Math.round(diff / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}
