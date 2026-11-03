import { useEffect, useState } from 'react'
import JoinDiagram from './JoinDiagram'
import JoinHubDiagram from './JoinHubDiagram'
import SqlExample from './SqlExample'
import ColumnFanout from './ColumnFanout'
import { TABLE_INFO } from '../data/tableInfo'
import { getTableInfo } from '../data/tableInfoHelpers'

// A collapsible right-hand sidebar that surfaces extra, table-specific
// context (multi-view join lineage, one-column-becomes-many explanations,
// example queries, ...) that doesn't fit into the flat Snowflake -> V1 -> V2
// row format. Renders nothing for tables that have no entry in TABLE_INFO,
// so it stays out of the way for the common case of a simple mapping.
function InfoSidebar({ table, columns }) {
  const info = table ? getTableInfo(table.id, TABLE_INFO, columns) : null
  const [isOpen, setIsOpen] = useState(true)

  // Default to open every time the user navigates to a (different) table
  // that has extra context, rather than remembering a global collapsed state.
  useEffect(() => {
    setIsOpen(true)
  }, [table?.id])

  if (!info) return null

  return (
    <aside className={`info-sidebar${isOpen ? '' : ' collapsed'}`}>
      <button
        type="button"
        className="info-sidebar-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Collapse additional context panel' : 'Expand additional context panel'}
        title={isOpen ? 'Collapse' : 'Expand'}
      >
        <span className="info-toggle-icon" aria-hidden="true">
          {isOpen ? '›' : '‹'}
        </span>
        {!isOpen && <span className="info-toggle-label">Additional context</span>}
      </button>

      {isOpen && (
        <div className="info-sidebar-content">
          <div className="info-sidebar-header">
            <p className="canvas-eyebrow">Additional context</p>
            <h2>{info.title}</h2>
          </div>

          <div className="info-sidebar-body">
            {info.sqlExamples && (
              <div className="info-section info-section-first">
                <h3 className="info-section-title">{info.sqlExamples.title}</h3>
                <div className="sql-example-list">
                  {info.sqlExamples.items.map((item) => (
                    <SqlExample key={item.title} title={item.title} sql={item.sql} />
                  ))}
                </div>
              </div>
            )}

            {(Array.isArray(info.summary) ? info.summary : info.summary ? [info.summary] : []).map(
              (paragraph) => (
                <p className="info-summary" key={paragraph}>
                  {paragraph}
                </p>
              )
            )}

            <ColumnFanout {...info.columnFanout} />

            {info.columnFanouts?.map((fanout) => (
              <ColumnFanout key={fanout.title ?? fanout.columns[0]} {...fanout} />
            ))}

            <JoinDiagram nodes={info.diagram?.nodes} />

            <JoinHubDiagram hub={info.joinHub?.hub} spokes={info.joinHub?.spokes} />

            {info.notes?.map((note) => (
              <p className="info-note" key={note}>
                {note}
              </p>
            ))}

            {info.incidentFromReport && (
              <div className="info-section">
                <h3 className="info-section-title">{info.incidentFromReport.sectionTitle}</h3>
                <p className="info-summary">{info.incidentFromReport.summary}</p>
                <JoinDiagram nodes={info.incidentFromReport.diagram?.nodes} />
                {info.incidentFromReport.sqlExamples && (
                  <div className="sql-example-list">
                    {info.incidentFromReport.sqlExamples.items.map((item) => (
                      <SqlExample key={item.title} title={item.title} sql={item.sql} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}

export default InfoSidebar
