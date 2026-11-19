import { describe, expect, it } from 'vitest'
import { compareJson, diffJson, parseJson, sortArrays } from './jsonDiff'

function parsed(src: string) {
  const result = parseJson(src)
  if (!result.ok) throw new Error(`expected valid JSON, got: ${result.message}`)
  return result
}

describe('parseJson', () => {
  it('parses values and records the lines each one occupies', () => {
    const { value, spans } = parsed('{\n  "a": 1,\n  "b": {\n    "c": [1, 2]\n  }\n}')
    expect(value).toEqual({ a: 1, b: { c: [1, 2] } })
    expect(spans.get('')).toEqual({ start: 1, end: 6 })
    expect(spans.get('a')).toEqual({ start: 2, end: 2 })
    expect(spans.get('b')).toEqual({ start: 3, end: 5 })
    expect(spans.get('b.c')).toEqual({ start: 4, end: 4 })
    expect(spans.get('b.c[1]')).toEqual({ start: 4, end: 4 })
  })

  it('accepts every JSON value type at the root', () => {
    expect(parsed('42').value).toBe(42)
    expect(parsed('-1.5e3').value).toBe(-1500)
    expect(parsed('"hi"').value).toBe('hi')
    expect(parsed('true').value).toBe(true)
    expect(parsed('null').value).toBeNull()
    expect(parsed('[]').value).toEqual([])
    expect(Object.keys(parsed('{}').value as object)).toEqual([])
  })

  it('decodes string escapes', () => {
    expect(parsed('"a\\nb\\u0041"').value).toBe('a\nbA')
  })

  it('quotes keys that are not plain identifiers in paths', () => {
    const { spans } = parsed('{"a.b": 1, "x y": {"z": 2}}')
    expect(spans.has('["a.b"]')).toBe(true)
    expect(spans.has('["x y"].z')).toBe(true)
  })

  it('does not let a "__proto__" key change the prototype', () => {
    const { value } = parsed('{"__proto__": {"polluted": true}}')
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    expect(Object.keys(value as object)).toEqual(['__proto__'])
  })

  it('treats blank input as empty rather than as an error', () => {
    expect(parseJson('')).toMatchObject({ ok: false, empty: true })
    expect(parseJson('  \n\t ')).toMatchObject({ ok: false, empty: true })
  })

  it.each([
    ['{"a": 1,}', 1, 'Expected a quoted key'],
    ['{"a" 1}', 1, 'Expected ":" after key'],
    ['{"a": 1 "b": 2}', 1, 'Expected "," or "}"'],
    ['[1 2]', 1, 'Expected "," or "]"'],
    ['{"a": tru}', 1, 'Unexpected character "t"'],
    ['{"a": 1} x', 1, 'Unexpected content after the document'],
    ['{"a": 01}', 1, 'Expected "," or "}"'],
    ['[1.]', 1, 'Expected "," or "]"'],
    ['{"a": "open', 1, 'Unterminated string'],
    ['{"a": [1,', 1, 'Unexpected end of input'],
  ])('reports %j at line %i: %s', (src, line, message) => {
    expect(parseJson(src)).toEqual({ ok: false, empty: false, line, message })
  })

  it('reports the line an error is on in multi-line input', () => {
    const result = parseJson('{\n  "a": 1,\n  "b": 2\n  "c": 3\n}')
    expect(result).toMatchObject({ ok: false, line: 4, message: 'Expected "," or "}"' })
  })
})

describe('diffJson', () => {
  const diff = (a: string, b: string) => diffJson(parsed(a).value, parsed(b).value)

  it('finds nothing in identical documents', () => {
    expect(diff('{"a":[1,{"b":2}]}', '{"a":[1,{"b":2}]}')).toEqual([])
  })

  it('ignores key order and formatting', () => {
    expect(diff('{"a":1,"b":2}', '{\n  "b": 2,\n  "a": 1\n}')).toEqual([])
  })

  it('reports added, removed and changed keys with their paths', () => {
    expect(diff('{"keep":1,"gone":2,"edit":3}', '{"keep":1,"edit":4,"new":5}')).toEqual([
      { kind: 'del', path: 'gone', before: 2 },
      { kind: 'chg', path: 'edit', before: 3, after: 4 },
      { kind: 'add', path: 'new', after: 5 },
    ])
  })

  it('reports nested changes by their full path', () => {
    expect(diff('{"a":{"b":{"c":1}}}', '{"a":{"b":{"c":2}}}')).toEqual([
      { kind: 'chg', path: 'a.b.c', before: 1, after: 2 },
    ])
  })

  it('compares arrays by index', () => {
    expect(diff('{"t":[1,2]}', '{"t":[1,2,3]}')).toEqual([{ kind: 'add', path: 't[2]', after: 3 }])
    expect(diff('{"t":[1,2,3]}', '{"t":[1]}')).toEqual([
      { kind: 'del', path: 't[1]', before: 2 },
      { kind: 'del', path: 't[2]', before: 3 },
    ])
    expect(diff('[{"a":1}]', '[{"a":2}]')).toEqual([{ kind: 'chg', path: '[0].a', before: 1, after: 2 }])
  })

  it('treats a changed type as one change, even for 1 versus "1"', () => {
    expect(diff('{"a":1}', '{"a":"1"}')).toEqual([{ kind: 'chg', path: 'a', before: 1, after: '1' }])
    expect(diff('{"a":null}', '{"a":0}')).toHaveLength(1)
    expect(diff('{"a":[]}', '{"a":{}}')).toHaveLength(1)
  })

  it('does not descend into a value whose type changed', () => {
    const changes = diff('{"a":{"x":1,"y":2}}', '{"a":[1,2]}')
    expect(changes).toHaveLength(1)
    expect(changes[0]).toMatchObject({ kind: 'chg', path: 'a' })
  })

  it('reports an added object as one change, not one per key', () => {
    expect(diff('{}', '{"a":{"b":1,"c":2}}')).toEqual([{ kind: 'add', path: 'a', after: { b: 1, c: 2 } }])
  })

  it('compares primitives at the root', () => {
    expect(diff('1', '2')).toEqual([{ kind: 'chg', path: '', before: 1, after: 2 }])
    expect(diff('"x"', '"x"')).toEqual([])
  })

  it('tells null apart from a missing key', () => {
    expect(diff('{"a":null}', '{}')).toEqual([{ kind: 'del', path: 'a', before: null }])
  })
})

describe('sortArrays', () => {
  it('sorts arrays at every depth and leaves key order alone', () => {
    expect(sortArrays({ a: [3, 1, 2], b: { c: ['z', 'a'] } })).toEqual({ a: [1, 2, 3], b: { c: ['a', 'z'] } })
  })

  it('orders objects inside arrays by their content', () => {
    expect(sortArrays([{ n: 2 }, { n: 1 }])).toEqual([{ n: 1 }, { n: 2 }])
  })

  it('returns primitives unchanged', () => {
    expect(sortArrays(5)).toBe(5)
    expect(sortArrays(null)).toBeNull()
  })
})

describe('compareJson', () => {
  const off = { sortArrays: false }

  it('marks changed lines on each side', () => {
    const left = '{\n  "a": 1,\n  "b": 2\n}'
    const right = '{\n  "a": 1,\n  "b": 3,\n  "c": 4\n}'
    const result = compareJson(left, right, off)
    expect(result.changes).toHaveLength(2)
    expect(result.left.marks).toEqual({ 3: 'chg' })
    expect(result.right.marks).toEqual({ 3: 'chg', 4: 'add' })
  })

  it('marks every line of a removed or added block', () => {
    const left = '{\n  "a": {\n    "x": 1\n  }\n}'
    const result = compareJson(left, '{}', off)
    expect(result.left.marks).toEqual({ 2: 'del', 3: 'del', 4: 'del' })
    expect(result.right.marks).toEqual({})
  })

  it('returns no changes and a clean result for identical documents', () => {
    const result = compareJson('{"a":1}', '{ "a": 1 }', off)
    expect(result.changes).toEqual([])
    expect(result.left.marks).toEqual({})
  })

  it('does not diff while either side is invalid, and marks the bad line', () => {
    const result = compareJson('{"a":1}', '{\n  "a": 1,\n}', off)
    expect(result.changes).toBeNull()
    expect(result.right.error).toEqual({ line: 3, message: 'Expected a quoted key' })
    expect(result.right.marks).toEqual({ 3: 'err' })
    expect(result.left.error).toBeUndefined()
  })

  it('flags an empty side without calling it an error', () => {
    const result = compareJson('', '{"a":1}', off)
    expect(result.changes).toBeNull()
    expect(result.left.empty).toBe(true)
    expect(result.left.error).toBeUndefined()
  })

  it('counts lines', () => {
    expect(compareJson('{\n}\n', '{}', off).left.lineCount).toBe(3)
  })

  it('can ignore array order', () => {
    const [a, b] = ['{"t":[1,2,3]}', '{"t":[3,1,2]}']
    expect(compareJson(a, b, { sortArrays: false }).changes).not.toHaveLength(0)
    expect(compareJson(a, b, { sortArrays: true }).changes).toEqual([])
  })

  it('marks the original lines when ignoring array order', () => {
    const left = '{\n  "t": [\n    3,\n    1,\n    2\n  ]\n}'
    const right = '{\n  "t": [\n    2,\n    9,\n    1\n  ]\n}'
    const r = compareJson(left, right, { sortArrays: true })
    // 3 (left line 3) was removed; 9 (right line 4) was added
    expect(r.left.marks).toEqual({ 3: 'chg' })
    expect(r.right.marks).toEqual({ 4: 'chg' })
  })

  it('does not treat inherited names as keys when ignoring array order', () => {
    const r = compareJson('{"a":[1]}', '{"a":[1],"constructor":1}', { sortArrays: true })
    expect(r.changes).toEqual([expect.objectContaining({ kind: 'add', path: 'constructor' })])
  })
})
