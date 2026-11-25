import { describe, expect, it } from 'vitest'
import { decodeJsonFile, sanitizeJson } from './jsonSanitize'

describe('sanitizeJson', () => {
  it('leaves clean JSON alone', () => {
    expect(sanitizeJson('{"a":1}')).toEqual({ text: '{"a":1}', fixes: [] })
  })

  it('removes a byte-order mark', () => {
    expect(sanitizeJson('﻿[1]')).toEqual({ text: '[1]', fixes: ['Removed a byte-order mark'] })
  })

  it('removes comments and trailing commas', () => {
    const r = sanitizeJson('{\n  // note\n  "a": [1, 2,], /* x */\n  "b": 3,\n}')
    expect(JSON.parse(r.text)).toEqual({ a: [1, 2], b: 3 })
    expect(r.fixes).toEqual(['Removed 2 comments, removed 2 trailing commas'])
  })

  it('does not touch comment-like text or commas inside strings', () => {
    const src = '{"url":"http://x.com/a","t":"a, ]"}'
    expect(sanitizeJson(src)).toEqual({ text: src, fixes: [] })
  })

  it('joins JSON Lines into an array', () => {
    const r = sanitizeJson('{"a":1}\n{"a":2}\n\n{"a":3}\n')
    expect(JSON.parse(r.text)).toEqual([{ a: 1 }, { a: 2 }, { a: 3 }])
    expect(r.fixes).toEqual(['Joined 3 lines of JSON Lines into one array'])
  })

  it('leaves what it cannot fix, so the parser can report it', () => {
    expect(sanitizeJson('{"a": }').text).toBe('{"a": }')
  })
})

describe('decodeJsonFile', () => {
  const bytes = (...b: number[]) => new Uint8Array(b).buffer

  it('reads UTF-8 and keeps the byte-order mark for sanitizeJson to report', () => {
    expect(decodeJsonFile(bytes(0xef, 0xbb, 0xbf, 0x5b, 0x5d))).toEqual({ text: '\uFEFF[]', fixes: [] })
  })

  it('reads UTF-16 with a byte-order mark', () => {
    const le = decodeJsonFile(bytes(0xff, 0xfe, 0x5b, 0x00, 0x31, 0x00, 0x5d, 0x00))
    expect(sanitizeJson(le.text).text).toBe('[1]')
    expect(le.fixes).toEqual(['Read the file as UTF-16'])
    expect(sanitizeJson(decodeJsonFile(bytes(0xfe, 0xff, 0x00, 0x5b, 0x00, 0x5d)).text).text).toBe('[]')
  })
})
