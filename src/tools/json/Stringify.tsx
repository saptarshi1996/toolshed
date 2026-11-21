import { useMemo, useRef, useState } from 'react'
import { Editor } from '../../components/Editor'
import { stringifyJson } from '../../lib/jsonStringify'
import '../../components/ToolPage.css'
import './Stringify.css'

const SAMPLE = `{
  "name": "toolshed",
  "version": "1.5.0",
  "scripts": {
    "build": "vite build",
    "test": "vitest run"
  },
  "tags": ["json", "diff", "cli"],
  "note": "He said \\"hello\\"\\nand left."
}`

function prettify(text: string) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return text
  }
}

export function Stringify() {
  const [input, setInput] = useState(SAMPLE)
  const [minify, setMinify] = useState(true)
  const [quote, setQuote] = useState(true)
  const [copied, setCopied] = useState(false)
  const timer = useRef<number>(undefined)

  const result = useMemo(() => stringifyJson(input, { minify, quote }), [input, minify, quote])
  const error = !result.ok && !result.empty ? result : null
  const output = result.ok ? result.output : ''

  async function copy() {
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard access can be refused; the output stays selectable in its editor.
    }
  }

  return (
    <div className="tool-page">
      <div className="tool-head">
        <h1>Stringify JSON</h1>
        <div className="tool-options">
          <label className="switch">
            <input type="checkbox" checked={minify} onChange={(e) => setMinify(e.target.checked)} />
            Minify first
          </label>
          <label className="switch">
            <input type="checkbox" checked={quote} onChange={(e) => setQuote(e.target.checked)} />
            Wrap in quotes
          </label>
        </div>
      </div>
      <p className="tool-sub">
        Turn a JSON document into an escaped string, ready to paste into code or into another JSON value.
      </p>

      <div className="tool-work">
        <div className="panes">
          <section className="pane">
            <header className="pane-head">
              <h2>JSON</h2>
              <span className={error ? 'pane-status pane-status-bad' : 'pane-status'}>
                {error ? `Line ${error.line} · ${error.message}` : `${input.split('\n').length} lines`}
              </span>
              <button className="link" disabled={!result.ok} onClick={() => setInput(prettify(input))}>
                Format
              </button>
              <button className="link" disabled={input === ''} onClick={() => setInput('')}>
                Clear
              </button>
            </header>
            <Editor
              value={input}
              onChange={setInput}
              marks={error ? { [error.line]: 'err' } : {}}
              label="JSON input"
              placeholderText="Paste JSON here"
            />
          </section>

          <section className="pane">
            <header className="pane-head">
              <h2>String</h2>
              <span className="pane-status">{output ? `${output.length} characters` : ''}</span>
              <button className="link" disabled={!output} onClick={copy}>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </header>
            <Editor
              value={output}
              onChange={() => {}}
              marks={{}}
              label="Stringified output"
              placeholderText={error ? 'Fix the JSON to see the string' : 'The string appears here'}
              readOnly
              wrap
            />
          </section>
        </div>
      </div>
    </div>
  )
}
