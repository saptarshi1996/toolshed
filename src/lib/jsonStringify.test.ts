import { describe, expect, it } from 'vitest'
import { minifyJson, stringifyJson } from './jsonStringify'

const on = { minify: true, quote: true }

describe('minifyJson', () => {
  it('removes whitespace between tokens', () => {
    expect(minifyJson('{\n  "a": [1, 2],\n  "b": true\n}')).toBe('{"a":[1,2],"b":true}')
  })

  it('keeps whitespace and escapes inside strings', () => {
    expect(minifyJson('{ "a": "x  y", "b": "q\\" z" }')).toBe('{"a":"x  y","b":"q\\" z"}')
  })

  it('keeps key order and number text as written', () => {
    expect(minifyJson('{ "2": 1, "1": 12345678901234567890 }')).toBe('{"2":1,"1":12345678901234567890}')
  })
})

describe('stringifyJson', () => {
  it('produces a quoted, escaped string', () => {
    expect(stringifyJson('{ "a": "b" }', on)).toEqual({ ok: true, output: '"{\\"a\\":\\"b\\"}"' })
  })

  it('round-trips back to the minified document', () => {
    const r = stringifyJson('{\n  "a": "line\\nbreak",\n  "b": [1, 2]\n}', on)
    expect(r.ok && JSON.parse(r.output)).toBe('{"a":"line\\nbreak","b":[1,2]}')
  })

  it('can leave whitespace alone', () => {
    const r = stringifyJson('{\n  "a": 1\n}\n', { minify: false, quote: true })
    expect(r).toEqual({ ok: true, output: '"{\\n  \\"a\\": 1\\n}"' })
  })

  it('can drop the surrounding quotes', () => {
    expect(stringifyJson('[1]', { minify: true, quote: false })).toEqual({ ok: true, output: '[1]' })
    expect(stringifyJson('{"a":1}', { minify: true, quote: false })).toEqual({ ok: true, output: '{\\"a\\":1}' })
  })

  it('reports invalid JSON with its line', () => {
    expect(stringifyJson('{\n  "a": 1\n  "b": 2\n}', on)).toEqual({
      ok: false,
      empty: false,
      line: 3,
      message: 'Expected "," or "}"',
    })
  })

  it('treats empty input as empty, not as an error', () => {
    expect(stringifyJson('  \n', on)).toMatchObject({ ok: false, empty: true })
  })
})
