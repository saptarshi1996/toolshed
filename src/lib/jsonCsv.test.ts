import { describe, expect, it } from 'vitest'
import { csvText, jsonToCsv } from './jsonCsv'

const csv = (json: string) => {
  const r = jsonToCsv(json)
  if (!r.ok) throw new Error(r.message)
  return csvText(r)
}

describe('jsonToCsv', () => {
  it('turns an array of objects into rows', () => {
    expect(csv('[{"a":1,"b":"x"},{"a":2,"b":"y"}]')).toBe('a,b\r\n1,x\r\n2,y')
  })

  it('uses the union of keys and leaves gaps empty', () => {
    expect(csv('[{"a":1},{"b":2},{"a":3,"b":4}]')).toBe('a,b\r\n1,\r\n,2\r\n3,4')
  })

  it('rejects nested objects and arrays, saying where', () => {
    expect(jsonToCsv('[{"a":1},{"u":{"x":1}}]')).toMatchObject({
      ok: false,
      nested: true,
      message: 'Nested JSON is not supported: "u" in row 2 holds an object or array. Rows must be flat.',
    })
    expect(jsonToCsv('[{"tags":["a"]}]')).toMatchObject({ ok: false, nested: true })
    expect(jsonToCsv('{"a":{}}')).toMatchObject({ ok: false, nested: true, message: expect.stringContaining('the row') })
  })

  it('quotes commas, quotes and line breaks', () => {
    expect(csv('[{"a":"x,y","b":"say \\"hi\\"","c":"l1\\nl2"}]')).toBe('a,b,c\r\n"x,y","say ""hi""","l1\nl2"')
  })

  it('writes null as empty and booleans as text', () => {
    expect(csv('[{"a":null,"b":true,"c":false}]')).toBe('a,b,c\r\n,true,false')
  })

  it('treats a single object as one row', () => {
    expect(csv('{"a":1,"b":2}')).toBe('a,b\r\n1,2')
  })

  it('uses the array when the document wraps it in one key', () => {
    const r = jsonToCsv('{"users":[{"id":1},{"id":2}]}')
    expect(r.ok && r.unwrapped).toBe('users')
    expect(csv('{"users":[{"id":1},{"id":2}]}')).toBe('id\r\n1\r\n2')
  })

  it('puts primitives in a value column and rejects array rows', () => {
    expect(csv('[1,"x",null]')).toBe('value\r\n1\r\nx\r\n')
    expect(jsonToCsv('[[1,2],[3,4]]')).toMatchObject({ ok: false, nested: true, message: expect.stringContaining('row 1 is an array') })
  })

  it('reports invalid JSON with its line', () => {
    expect(jsonToCsv('{\n"a": }')).toMatchObject({ ok: false, line: 2 })
  })

  it('reports empty input and empty arrays', () => {
    expect(jsonToCsv('  ')).toMatchObject({ ok: false, empty: true })
    expect(jsonToCsv('[]')).toMatchObject({ ok: false, empty: false, message: 'The array is empty, so there are no rows' })
  })

  it('handles key names that would collide with object internals', () => {
    expect(csv('[{"__proto__":1,"constructor":2}]')).toBe('__proto__,constructor\r\n1,2')
  })

  it('limits the rows when asked', () => {
    const r = jsonToCsv('[{"a":1},{"a":2},{"a":3}]')
    expect(r.ok && csvText(r, 2)).toBe('a\r\n1\r\n2')
  })

  it('converts text over the tracked-parse limit and still reports errors', () => {
    const big = '[' + Array.from({ length: 100_000 }, (_, i) => `{"id":${i},"pad":"${'x'.repeat(20)}"}`).join(',') + ']'
    const r = jsonToCsv(big)
    expect(r.ok && r.records.length).toBe(100_000)
    expect(jsonToCsv(big.slice(0, -1))).toMatchObject({ ok: false })
  })
})
