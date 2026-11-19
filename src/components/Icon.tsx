const paths = {
  // Two arrows pointing opposite ways: two documents set side by side.
  compare: (
    <>
      <path d="M3 5h9.5M10 2.5 12.5 5 10 7.5" />
      <path d="M13 11H3.5M6 8.5 3.5 11 6 13.5" />
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
