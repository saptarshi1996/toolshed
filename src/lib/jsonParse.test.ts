import { describe, expect, it } from 'vitest'
import { parseJsonString, prettyJson } from './jsonParse'
import { stringifyJson } from './jsonStringify'

describe('prettyJson', () => {
  it('indents nested values', () => {
    expect(prettyJson('{"a":[1,2],"b":{"c":null}}')).toBe('{\n  "a": [\n    1,\n    2\n  ],\n  "b": {\n    "c": null\n  }\n}')
  })

  it('keeps empty containers on one line', () => {
    expect(prettyJson('{"a":{},"b":[]}')).toBe('{\n  "a": {},\n  "b": []\n}')
  })

  it('leaves string contents and number text alone', () => {
    expect(prettyJson('{"a":"x, y: {z}","n":12345678901234567890}')).toBe(
      '{\n  "a": "x, y: {z}",\n  "n": 12345678901234567890\n}',
    )
  })
})

describe('parseJsonString', () => {
  it('decodes a quoted string', () => {
    expect(parseJsonString('"{\\"a\\":1}"')).toEqual({ ok: true, output: '{\n  "a": 1\n}' })
  })

  it('decodes a string without its quotes', () => {
    expect(parseJsonString('{\\"a\\":1}')).toEqual({ ok: true, output: '{\n  "a": 1\n}' })
  })

  it('formats plain JSON that was never escaped', () => {
    expect(parseJsonString('{"a":1}')).toEqual({ ok: true, output: '{\n  "a": 1\n}' })
  })

  it('undoes stringifyJson', () => {
    const doc = '{\n  "a": "line\\nbreak",\n  "b": [1, 2]\n}'
    const s = stringifyJson(doc, { minify: true, quote: true })
    const r = s.ok && parseJsonString(s.output)
    expect(r && r.ok && JSON.parse(r.output)).toEqual({ a: 'line\nbreak', b: [1, 2] })
  })

  it('reports empty input', () => {
    expect(parseJsonString('  \n')).toMatchObject({ ok: false, empty: true })
  })

  it('reports text that is not an escaped string', () => {
    expect(parseJsonString('{"a": "unescaped "quote""}')).toMatchObject({
      ok: false,
      empty: false,
      line: 0,
      message: 'Not a valid escaped string',
    })
  })

  it('reports a decoded string that is not JSON, keeping the decoded text', () => {
    const r = parseJsonString('"{\\n  \\"a\\": 1\\n  \\"b\\": 2\\n}"')
    expect(r).toMatchObject({ ok: false, line: 3, decoded: '{\n  "a": 1\n  "b": 2\n}' })
  })
})
