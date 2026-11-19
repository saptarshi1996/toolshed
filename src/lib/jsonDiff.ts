export type ChangeKind = 'add' | 'del' | 'chg'

export interface Change {
  kind: ChangeKind
  /** Path such as `scripts.test` or `tags[2]`. Empty string is the root. */
  path: string
  before?: unknown
  after?: unknown
}

/** First and last line (1-based) a value occupies in the source text. */
export interface Span {
  start: number
  end: number
}

export type ParseResult =
  | { ok: true; value: unknown; spans: Map<string, Span> }
  | { ok: false; empty: boolean; line: number; message: string }

class ParseError extends Error {
  line: number
  constructor(message: string, line: number) {
    super(message)
    this.line = line
  }
}

const IDENT = /^[A-Za-z_$][\w$]*$/

function keyPath(parent: string, key: string) {
  if (IDENT.test(key)) return parent ? `${parent}.${key}` : key
  return `${parent}[${JSON.stringify(key)}]`
}

/** Parses JSON and records which lines each value occupies. Errors carry the line they occurred on. */
export function parseJson(src: string): ParseResult {
  if (src.trim() === '') return { ok: false, empty: true, line: 1, message: 'Empty' }

  let i = 0
  let line = 1
  const spans = new Map<string, Span>()
  const fail = (message: string): never => {
    throw new ParseError(message, line)
  }
  const skipSpace = () => {
    while (i < src.length && /\s/.test(src[i])) {
      if (src[i] === '\n') line++
      i++
    }
  }

  function readString(): string {
    const from = i
    i++
    while (i < src.length && src[i] !== '"') {
      if (src[i] === '\\') i++
      if (src[i] === '\n') fail('Unterminated string')
      i++
    }
    if (i >= src.length) fail('Unterminated string')
    i++
    try {
      return JSON.parse(src.slice(from, i)) as string
    } catch {
      return fail('Invalid escape in string')
    }
  }

  function readValue(path: string): unknown {
    skipSpace()
    const start = line
    const c = src[i]
    let value: unknown

    if (c === '{') {
      i++
      const obj: Record<string, unknown> = Object.create(null)
      skipSpace()
      if (src[i] === '}') i++
      else
        for (;;) {
          skipSpace()
          if (src[i] !== '"') fail('Expected a quoted key')
          const key = readString()
          skipSpace()
          if (src[i] !== ':') fail('Expected ":" after key')
          i++
          obj[key] = readValue(keyPath(path, key))
          skipSpace()
          if (src[i] === ',') {
            i++
            continue
          }
          if (src[i] === '}') {
            i++
            break
          }
          fail('Expected "," or "}"')
        }
      value = obj
    } else if (c === '[') {
      i++
      const arr: unknown[] = []
      skipSpace()
      if (src[i] === ']') i++
      else
        for (;;) {
          arr.push(readValue(`${path}[${arr.length}]`))
          skipSpace()
          if (src[i] === ',') {
            i++
            continue
          }
          if (src[i] === ']') {
            i++
            break
          }
          fail('Expected "," or "]"')
        }
      value = arr
    } else if (c === '"') {
      value = readString()
    } else {
      const m = /^(-?\d+(\.\d+)?([eE][+-]?\d+)?|true|false|null)/.exec(src.slice(i))
      if (!m) fail(i >= src.length ? 'Unexpected end of input' : `Unexpected character "${c}"`)
      const token = m![0]
      i += token.length
      value = JSON.parse(token)
    }

    spans.set(path, { start, end: line })
    return value
  }

  try {
    const value = readValue('')
    skipSpace()
    if (i < src.length) fail('Unexpected content after the document')
    return { ok: true, value, spans }
  } catch (e) {
    if (e instanceof ParseError) return { ok: false, empty: false, line: e.line, message: e.message }
    throw e
  }
}

const typeOf = (v: unknown) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v)

/** Compares two parsed documents by path. Key order never matters. */
export function diffJson(a: unknown, b: unknown, path = '', out: Change[] = []): Change[] {
  const ta = typeOf(a)
  if (ta !== typeOf(b)) {
    out.push({ kind: 'chg', path, before: a, after: b })
  } else if (ta === 'object') {
    const x = a as Record<string, unknown>
    const y = b as Record<string, unknown>
    for (const k of Object.keys(x)) {
      if (k in y) diffJson(x[k], y[k], keyPath(path, k), out)
      else out.push({ kind: 'del', path: keyPath(path, k), before: x[k] })
    }
    for (const k of Object.keys(y)) {
      if (!(k in x)) out.push({ kind: 'add', path: keyPath(path, k), after: y[k] })
    }
  } else if (ta === 'array') {
    const x = a as unknown[]
    const y = b as unknown[]
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
      const p = `${path}[${i}]`
      if (i >= x.length) out.push({ kind: 'add', path: p, after: y[i] })
      else if (i >= y.length) out.push({ kind: 'del', path: p, before: x[i] })
      else diffJson(x[i], y[i], p, out)
    }
  } else if (a !== b) {
    out.push({ kind: 'chg', path, before: a, after: b })
  }
  return out
}

/** Sorts every array by its serialised elements, so order stops mattering. */
export function sortArrays(v: unknown): unknown {
  if (Array.isArray(v)) {
    return v.map(sortArrays).sort((p, q) => (JSON.stringify(p) < JSON.stringify(q) ? -1 : 1))
  }
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, sortArrays(x)]))
  }
  return v
}

export type LineMarks = Record<number, ChangeKind | 'err'>

export interface SideResult {
  /** Set when this side has invalid, non-empty JSON. */
  error?: { line: number; message: string }
  empty: boolean
  marks: LineMarks
  lineCount: number
}

export interface CompareResult {
  left: SideResult
  right: SideResult
  /** Null until both sides are valid JSON. */
  changes: Change[] | null
}

function side(text: string, parsed: ParseResult): SideResult {
  const lineCount = text.split('\n').length
  if (parsed.ok) return { empty: false, marks: {}, lineCount }
  if (parsed.empty) return { empty: true, marks: {}, lineCount }
  return {
    empty: false,
    error: { line: parsed.line, message: parsed.message },
    marks: { [parsed.line]: 'err' },
    lineCount,
  }
}

export function compareJson(leftText: string, rightText: string, options: { sortArrays: boolean }): CompareResult {
  const l = parseJson(leftText)
  const r = parseJson(rightText)
  const left = side(leftText, l)
  const right = side(rightText, r)
  if (!l.ok || !r.ok) return { left, right, changes: null }

  const a = options.sortArrays ? sortArrays(l.value) : l.value
  const b = options.sortArrays ? sortArrays(r.value) : r.value
  const changes = diffJson(a, b)

  for (const c of changes) {
    const from = c.kind !== 'add' ? l.spans.get(c.path) : undefined
    const to = c.kind !== 'del' ? r.spans.get(c.path) : undefined
    if (from) for (let n = from.start; n <= from.end; n++) left.marks[n] = c.kind
    if (to) for (let n = to.start; n <= to.end; n++) right.marks[n] = c.kind
  }
  return { left, right, changes }
}
