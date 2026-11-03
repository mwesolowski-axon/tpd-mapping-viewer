// Matches two kinds of terms mentioned inline in prose (intro/footnote) so
// they can be rendered in a monospace "code" font instead of plain text:
//   - "CustomUs..." V2 column names -> styled like the chip list below them
//   - "Records.XxxYyy" view names    -> styled like the small teal pill used
//                                       for schema/view references elsewhere
const INLINE_TERM_PATTERN = /\b(CustomUs[A-Za-z0-9]+|Records\.[A-Za-z0-9]+)\b/g

function withInlineCode(text) {
  if (!text) return text

  const parts = []
  let lastIndex = 0
  let match

  const regex = new RegExp(INLINE_TERM_PATTERN)
  while ((match = regex.exec(text))) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    const term = match[0]
    const className = term.startsWith('Records.') ? 'column-fanout-code-view' : 'column-fanout-code-column'
    parts.push(
      <code className={className} key={match.index}>
        {term}
      </code>
    )
    lastIndex = match.index + term.length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))

  return parts
}

// Illustrates a "one V1 column -> many V2 columns" relationship: a single
// V1 column that packed multiple values into separate rows (e.g. CASEFACTOR)
// gets replaced in V2 by one dedicated column per value. Purely
// presentational — driven by the columnFanout data on a TABLE_INFO entry
// (see src/data/tableInfo.js).
function ColumnFanout({ title, intro, legend, columns, chipNotes, footnote }) {
  if (!columns?.length) return null

  return (
    <div className="column-fanout">
      {title && <h3 className="column-fanout-title">{title}</h3>}
      {intro && <p className="column-fanout-intro">{withInlineCode(intro)}</p>}

      {legend?.length > 0 && (
        <div className="column-fanout-legend">
          {legend.map((item) => (
            <span className="column-fanout-legend-item" key={item}>
              {item}
            </span>
          ))}
        </div>
      )}

      <ul className="column-fanout-list">
        {columns.map((column) => {
          const chipNote = chipNotes?.[column]
          return (
            <li className={`column-fanout-chip${chipNote ? ' has-chip-note' : ''}`} key={column}>
              <span className="column-fanout-chip-label">{column}</span>
              {chipNote && (
                <span
                  className="column-fanout-chip-note"
                  title={chipNote}
                  aria-label={chipNote}
                  role="img"
                >
                  i
                </span>
              )}
            </li>
          )
        })}
      </ul>

      {footnote && <p className="column-fanout-footnote">{withInlineCode(footnote)}</p>}
    </div>
  )
}

export default ColumnFanout
