import { useMemo, useState } from 'react'
import { CopyButton, PasteButton } from '../../components/ClipboardButtons'
import { Editor } from '../../components/Editor'
import { parseJsonString } from '../../lib/jsonParse'
import '../../components/ToolPage.css'
import './Parse.css'

export function Parse() {
  const [input, setInput] = useState('')

  const result = useMemo(() => parseJsonString(input), [input])
  const error = !result.ok && !result.empty ? result : null
  const output = result.ok ? result.output : (result.decoded ?? '')

  return (
    <div className="tool-page">
      <div className="tool-head">
        <h1>Parse JSON</h1>
      </div>
      <p className="tool-sub">
        Turn an escaped JSON string back into the document it holds. The surrounding quotes are optional.
      </p>

      <div className="tool-work">
        <div className="panes">
          <section className="pane">
            <header className="pane-head">
              <h2>String</h2>
              <span className={error ? 'pane-status pane-status-bad' : 'pane-status'}>
                {error ? 'Not a valid escaped string' : input ? `${input.length} characters` : ''}
              </span>
              <PasteButton onPaste={setInput} />
              <button className="link" disabled={input === ''} onClick={() => setInput('')}>
                Clear
              </button>
            </header>
            <Editor
              value={input}
              onChange={setInput}
              marks={{}}
              label="String input"
              placeholderText="Paste an escaped JSON string here"
              wrap
            />
          </section>

          <section className="pane">
            <header className="pane-head">
              <h2>JSON</h2>
              <span className={error && error.line > 0 ? 'pane-status pane-status-bad' : 'pane-status'}>
                {error && error.line > 0
                  ? `Line ${error.line} · ${error.message}`
                  : output
                    ? `${output.split('\n').length} lines`
                    : ''}
              </span>
              <CopyButton text={result.ok ? output : ''} />
            </header>
            <Editor
              value={output}
              onChange={() => {}}
              marks={error && error.line > 0 ? { [error.line]: 'err' } : {}}
              label="Parsed output"
              placeholderText={error ? 'Fix the string to see the JSON' : 'The JSON appears here'}
              readOnly
            />
          </section>
        </div>
      </div>
    </div>
  )
}
