import { useMemo, useState } from 'react'
import { CopyButton, PasteButton } from '../../components/ClipboardButtons'
import { Editor } from '../../components/Editor'
import { stringifyJson } from '../../lib/jsonStringify'
import '../../components/ToolPage.css'
import './Stringify.css'

function prettify(text: string) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return text
  }
}

export function Stringify() {
  const [input, setInput] = useState('')

  const result = useMemo(() => stringifyJson(input, { minify: true, quote: true }), [input])
  const error = !result.ok && !result.empty ? result : null
  const output = result.ok ? result.output : ''

  return (
    <div className="tool-page">
      <div className="tool-head">
        <h1>Stringify JSON</h1>
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
                {error ? `Line ${error.line} · ${error.message}` : input ? `${input.split('\n').length} lines` : ''}
              </span>
              <PasteButton onPaste={setInput} />
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
              <CopyButton text={output} />
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
