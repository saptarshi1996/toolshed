import { parseJson } from './jsonDiff'

export interface StringifyOptions {
  /** Strip whitespace between tokens before escaping. */
  minify: boolean
  /** Keep the surrounding double quotes, so the output is a complete JSON string. */
  quote: boolean
}

export type StringifyResult =
  | { ok: true; output: string }
  | { ok: false; empty: boolean; line: number; message: string }

/**
 * Removes whitespace outside strings from JSON that is already known to be valid.
 * Works on the text, not on parsed values, so key order and number precision are untouched.
 */
export function minifyJson(src: string): string {
  let out = ''
  let inString = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (inString) {
      out += c
      if (c === '\\') out += src[++i] ?? ''
      else if (c === '"') inString = false
    } else if (c === '"') {
      inString = true
      out += c
    } else if (!/\s/.test(c)) {
      out += c
    }
  }
  return out
}

/** Turns a JSON document into an escaped string, ready to paste inside code or another JSON value. */
export function stringifyJson(src: string, options: StringifyOptions): StringifyResult {
  const parsed = parseJson(src)
  if (!parsed.ok) return { ok: false, empty: parsed.empty, line: parsed.line, message: parsed.message }

  const text = options.minify ? minifyJson(src) : src.trim()
  const literal = JSON.stringify(text)
  return { ok: true, output: options.quote ? literal : literal.slice(1, -1) }
}
