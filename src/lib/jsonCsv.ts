import { parseJson } from './jsonDiff'

export type CsvResult =
  | {
      ok: true
      /** Column names, then one entry per row. Joined with CRLF this is the whole file. */
      header: string
      records: string[]
      columns: number
      /** Set when the document was `{ "key": [...] }` and the array under `key` was used as the rows. */
      unwrapped?: string
    }
  | { ok: false; empty: boolean; line: number; message: string; nested?: true }

/** Above this many characters the line-tracking parser is too heavy, so the built-in one is used. */
const TRACKED_PARSE_LIMIT = 2_000_000

type Parsed = { ok: true; value: unknown } | { ok: false; empty: boolean; line: number; message: string }

function readJson(text: string): Parsed {
  if (text.length <= TRACKED_PARSE_LIMIT) return parseJson(text)
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Invalid JSON'
    const at = /line (\d+)/.exec(message)
    const pos = /position (\d+)/.exec(message)
    const line = at ? Number(at[1]) : pos ? text.slice(0, Number(pos[1])).split('\n').length : 0
    return { ok: false, empty: false, line, message }
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function cell(s: string) {
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Only one dimension is supported: rows of plain values. Anything nested is turned away. */
function nested(row: number, total: number, key: string): CsvResult {
  const where = total === 1 ? 'the row' : `row ${row + 1}`
  const what = key ? `"${key}" in ${where} holds an object or array` : `${where} is an array`
  return { ok: false, empty: false, line: 0, nested: true, message: `Nested JSON is not supported: ${what}. Rows must be flat.` }
}

/**
 * Turns flat JSON into CSV rows. Rows are the items of an array, or the one object if it is not an array.
 * Rows with different keys share the union of all columns.
 */
export function jsonToCsv(text: string): CsvResult {
  const parsed = readJson(text)
  if (!parsed.ok) return { ok: false, empty: parsed.empty, line: parsed.line, message: parsed.message }

  let value = parsed.value
  let unwrapped: string | undefined
  if (isObject(value)) {
    const keys = Object.keys(value)
    if (keys.length === 1 && Array.isArray(value[keys[0]])) {
      unwrapped = keys[0]
      value = value[keys[0]]
    }
  }

  const items = Array.isArray(value) ? value : [value]
  if (items.length === 0) return { ok: false, empty: false, line: 0, message: 'The array is empty, so there are no rows' }

  const columns = new Map<string, number>()
  const rows: Array<Map<string, string>> = []
  for (let n = 0; n < items.length; n++) {
    const item = items[n]
    const row = new Map<string, string>()
    if (isObject(item)) {
      for (const key of Object.keys(item)) {
        const v = item[key]
        if (typeof v === 'object' && v !== null) return nested(n, items.length, key)
        row.set(key, v === null ? '' : String(v))
      }
    } else if (Array.isArray(item)) return nested(n, items.length, '')
    else row.set('value', item === null ? '' : String(item))
    for (const name of row.keys()) if (!columns.has(name)) columns.set(name, columns.size)
    rows.push(row)
  }
  if (columns.size === 0) return { ok: false, empty: false, line: 0, message: 'No fields found to turn into columns' }

  const names = [...columns.keys()]
  return {
    ok: true,
    header: names.map(cell).join(','),
    records: rows.map((row) => names.map((n) => cell(row.get(n) ?? '')).join(',')),
    columns: names.length,
    unwrapped,
  }
}

/** The CSV file as text, using CRLF line endings as RFC 4180 asks. */
export function csvText(result: { header: string; records: string[] }, maxRows = Infinity): string {
  return [result.header, ...(maxRows < result.records.length ? result.records.slice(0, maxRows) : result.records)].join('\r\n')
}
