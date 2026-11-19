import { vi } from 'vitest'

/** Fakes `matchMedia`. Every query matches when `matches` is true. */
export function mockMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    (media: string) =>
      ({
        matches,
        media,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  )
}
