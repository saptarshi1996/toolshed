export interface SanitizeResult {
  text: string
  /** Plain-language list of what was changed, empty when the file was already clean. */
  fixes: string[]
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function isJson(text: string) {
  try {
    JSON.parse(text)
    return true
  } catch {
    return false
  }
}

/**
 * Removes `//` and `/* *\/` comments and commas that sit right before a closing bracket.
 * String-aware, so a URL or a comma inside a string is never touched.
 */
function stripExtras(src: string): { text: string; comments: number; commas: number } {
  const cuts: Array<[number, number]> = []
  let comments = 0
  let commas = 0
  let lastSig = -1 // index of the last meaningful character outside strings and comments
  let inString = false

  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (inString) {
      if (c === '\\') i++
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') {
      inString = true
      lastSig = i
    } else if (c === '/' && src[i + 1] === '/') {
      let end = src.indexOf('\n', i)
      if (end === -1) end = src.length
      cuts.push([i, end]) // keep the newline so line numbers stay put
      comments++
      i = end - 1
    } else if (c === '/' && src[i + 1] === '*') {
      const close = src.indexOf('*/', i + 2)
      const end = close === -1 ? src.length : close + 2
      cuts.push([i, end])
      comments++
      i = end - 1
    } else if (c === '}' || c === ']') {
      if (lastSig >= 0 && src[lastSig] === ',') {
        cuts.push([lastSig, lastSig + 1])
        commas++
      }
      lastSig = i
    } else if (!/\s/.test(c)) {
      lastSig = i
    }
  }

  if (cuts.length === 0) return { text: src, comments, commas }
  cuts.sort((a, b) => a[0] - b[0])
  let out = ''
  let at = 0
  for (const [from, to] of cuts) {
    out += src.slice(at, from)
    at = to
  }
  return { text: out + src.slice(at), comments, commas }
}

/** Reads JSON Lines (one value per line) and returns it as a single array, or null if it is not that. */
function joinLines(src: string): { text: string; count: number } | null {
  const lines = src.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length < 2) return null
  for (const line of lines) if (!isJson(line)) return null
  return { text: `[${lines.join(',\n')}]`, count: lines.length }
}

/**
 * Decodes the bytes of an uploaded file. UTF-8 is assumed unless a UTF-16 byte-order mark says
 * otherwise (PowerShell and some Windows tools write UTF-16). The mark itself is kept in the
 * text so `sanitizeJson` can report removing it.
 */
export function decodeJsonFile(bytes: ArrayBuffer): SanitizeResult {
  const head = new Uint8Array(bytes, 0, Math.min(2, bytes.byteLength))
  const utf16 = head[0] === 0xff && head[1] === 0xfe ? 'utf-16le' : head[0] === 0xfe && head[1] === 0xff ? 'utf-16be' : null
  const text = new TextDecoder(utf16 ?? 'utf-8', { ignoreBOM: true }).decode(bytes)
  return { text, fixes: utf16 ? ['Read the file as UTF-16'] : [] }
}

/**
 * Cleans up a JSON file that came from somewhere else: byte-order mark, comments,
 * trailing commas, and JSON Lines. Anything it cannot fix is left as it was, so the
 * parser can still report it. Use on uploads, not on text the user is typing.
 */
export function sanitizeJson(raw: string): SanitizeResult {
  const fixes: string[] = []
  let text = raw
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1)
    fixes.push('Removed a byte-order mark')
  }

  const stripped = stripExtras(text)
  const extras: string[] = []
  if (stripped.comments) extras.push(`removed ${plural(stripped.comments, 'comment')}`)
  if (stripped.commas) extras.push(`removed ${plural(stripped.commas, 'trailing comma')}`)

  if (isJson(stripped.text)) {
    if (extras.length) fixes.push(extras.join(', ').replace(/^r/, 'R'))
    return { text: stripped.text, fixes }
  }

  const lines = joinLines(text)
  if (lines) {
    fixes.push(`Joined ${plural(lines.count, 'line')} of JSON Lines into one array`)
    return { text: lines.text, fixes }
  }

  // Not valid even after cleaning. Keep the cleaned text so the reported line is meaningful.
  if (extras.length) fixes.push(extras.join(', ').replace(/^r/, 'R'))
  return { text: stripped.text, fixes }
}
