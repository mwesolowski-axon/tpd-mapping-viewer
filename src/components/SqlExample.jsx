import { useState } from 'react'
import CopyButton from './CopyButton'

// A single collapsible, copyable SQL snippet block. Multiple instances are
// independent of each other (see InfoSidebar), so a table can show several
// alternative example queries side by side without cluttering the panel.
function SqlExample({ title, sql, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={`sql-example${isOpen ? ' open' : ''}`}>
      <button
        type="button"
        className="sql-example-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span className="sql-example-chevron" aria-hidden="true">
          ▸
        </span>
        <span className="sql-example-title">{title}</span>
      </button>

      {isOpen && (
        <div className="sql-example-body">
          <pre className="sql-example-code">
            <code>{sql}</code>
          </pre>
          <div className="sql-example-copy" data-no-pan>
            <CopyButton value={sql} label={`${title} SQL`} />
          </div>
        </div>
      )}
    </div>
  )
}

export default SqlExample
