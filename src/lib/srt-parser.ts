export interface SubtitleLine {
  index: number
  start: string
  end: string
  text: string
}

export function parseSRT(raw: string): SubtitleLine[] {
  const blocks = raw.trim().replace(/\r\n/g, '\n').split(/\n\n+/)
  return blocks.map((block) => {
    const lines = block.split('\n')
    const index = parseInt(lines[0], 10) || 0
    const timeMatch = lines[1]?.match(
      /(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/,
    )
    const start = timeMatch?.[1] ?? ''
    const end = timeMatch?.[2] ?? ''
    const text = lines.slice(2).join('\n')
    return { index, start, end, text }
  })
}

export function formatTime(t: string): string {
  return t.replace(',', '.')
}
