export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return ''
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return ''
  const s = Math.round(seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  const ss = String(sec).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

export function shortenPath(filepath: string, homedir: string, max = 60): string {
  const pretty = filepath.startsWith(homedir) ? `~${filepath.slice(homedir.length)}` : filepath
  if (pretty.length <= max) return pretty
  const ext = /\.\w{1,5}$/.exec(pretty)?.[0] ?? ''
  return `${pretty.slice(0, max - ext.length - 1)}…${ext}`
}

/**
 * Word-wrap into left-flush lines. Ink's own wrapping keeps the space at
 * each break (wrap-ansi with trim: false), which indents every continuation
 * line by one cell and makes multi-line text look off-center.
 */
export function wrapText(text: string, width: number): string[] {
  if (width <= 0) return [text]
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    let remaining = word
    while (remaining.length > width) {
      if (line) {
        lines.push(line)
        line = ''
      }
      lines.push(remaining.slice(0, width))
      remaining = remaining.slice(width)
    }
    if (!remaining) continue
    if (!line) line = remaining
    else if (line.length + 1 + remaining.length <= width) line += ` ${remaining}`
    else {
      lines.push(line)
      line = remaining
    }
  }
  if (line) lines.push(line)
  return lines
}

export function formatSpeed(bytesPerSecond: number): string {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return ''
  return `${formatBytes(bytesPerSecond)}/s`
}

export function formatEta(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return ''
  return formatDuration(seconds)
}
