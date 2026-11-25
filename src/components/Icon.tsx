const paths = {
  // Two arrows pointing opposite ways: two documents set side by side.
  compare: (
    <>
      <path d="M3 5h9.5M10 2.5 12.5 5 10 7.5" />
      <path d="M13 11H3.5M6 8.5 3.5 11 6 13.5" />
    </>
  ),
  // Opening quote marks: text turned into a string.
  stringify: (
    <>
      <path d="M3 7.5V11h3.5V7.5H4.5c0-1.4.7-2.2 2-2.5" />
      <path d="M9.5 7.5V11H13V7.5h-2c0-1.4.7-2.2 2-2.5" />
    </>
  ),
  // Closing quote marks: a string turned back into a document.
  parse: (
    <>
      <path d="M3 5h3.5v3.5H4.5c0 1.4.7 2.2 2 2.5" />
      <path d="M9.5 5H13v3.5h-2c0 1.4.7 2.2 2 2.5" />
    </>
  ),
  // A small table: rows and columns.
  csv: (
    <>
      <rect x="2.5" y="3" width="11" height="10" rx="1.5" />
      <path d="M2.5 6.5h11M6.5 3v10" />
    </>
  ),
}

export type IconName = keyof typeof paths

export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}
