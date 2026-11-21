import { parseJson } from './jsonDiff'
import { minifyJson } from './jsonStringify'

export type ParseStringResult =
  | { ok: true; output: string }
  /** `line` is a line of the decoded text, not of the input, and is 0 when decoding itself failed. */
  | { ok: false; empty: boolean; line: number; message: string; decoded?: string }

/**
 * Re-indents JSON that is already known to be valid, working on the text so key order
 * and number precision are untouched. Empty objects and arrays stay on one line.
 */
export function prettyJson(src: string, indent = '  '): string {
  const min = minifyJson(src)
  let out = ''
  let depth = 0
  let inString = false
  for (let i = 0; i < min.length; i++) {
    const c = min[i]
    if (inString) {
      out += c
      if (c === '\\') out += min[++i] ?? ''
      else if (c === '"') inString = false
    } else if (c === '"') {
      inString = true
      out += c
    } else if (c === '{' || c === '[') {
      const close = c === '{' ? '}' : ']'
      if (min[i + 1] === close) {
        out += c + close
        i++
      } else {
        out += c + '\n' + indent.repeat(++depth)
      }
    } else if (c === '}' || c === ']') {
      out += '\n' + indent.repeat(--depth) + c
    } else if (c === ',') {
      out += ',\n' + indent.repeat(depth)
    } else if (c === ':') {
      out += ': '
    } else {
      out += c
    }
  }
  return out
}

/** Reads `src` as a JSON string literal, with or without its surrounding quotes. */
function decodeString(src: string): string | null {
  for (const candidate of [src, `"${src}"`]) {
    try {
      const value: unknown = JSON.parse(candidate)
      if (typeof value === 'string') return value
      // Already a JSON document rather than an escaped string: use it as written.
      if (candidate === src) return src
    } catch {
      // Try the next reading.
    }
  }
  return null
}

/** Undoes Stringify: turns an escaped string back into the JSON document it holds. */
export function parseJsonString(src: string): ParseStringResult {
  const trimmed = src.trim()
  if (trimmed === '') return { ok: false, empty: true, line: 0, message: '' }

  const decoded = decodeString(trimmed)
  if (decoded === null) {
    return { ok: false, empty: false, line: 0, message: 'Not a valid escaped string' }
  }

  const parsed = parseJson(decoded)
  if (!parsed.ok) {
    return {
      ok: false,
      empty: parsed.empty,
      line: parsed.line,
      message: `Decoded text is not JSON: ${parsed.message}`,
      decoded,
    }
  }
  return { ok: true, output: prettyJson(decoded) }
}
