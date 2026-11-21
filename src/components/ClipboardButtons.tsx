import { useEffect, useRef, useState } from 'react'

/** Copies `text` to the clipboard and says "Copied" for a moment. */
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard access can be refused; the text stays selectable in its editor.
    }
  }

  return (
    <button className="link" disabled={!text} onClick={copy}>
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

/** Replaces the editor's content with whatever is on the clipboard. */
export function PasteButton({ onPaste }: { onPaste: (text: string) => void }) {
  async function paste() {
    try {
      onPaste(await navigator.clipboard.readText())
    } catch {
      // Reading can be refused; pasting with the keyboard still works.
    }
  }

  return (
    <button className="link" onClick={paste}>
      Paste
    </button>
  )
}
