import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { mockMatchMedia } from './matchMedia'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

// jsdom has no layout, which CodeMirror's measuring code expects.
const emptyRects = Object.assign([], { item: () => null }) as unknown as DOMRectList
Range.prototype.getClientRects = () => emptyRects
Range.prototype.getBoundingClientRect = () => new DOMRect()

beforeEach(() => mockMatchMedia(false))
