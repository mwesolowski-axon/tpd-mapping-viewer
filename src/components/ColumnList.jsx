import { SNOWFLAKE_SPECIFIC_STATUS_META, STATUS_META, matchesSearch } from '../utils/mapping'

function ColumnList({
  table,
  columns,
  totalColumnCount,
  status,
  selectedColumnId,
  onSelectColumn,
  onLinkContextMenu,
  searchQuery,
  onSearchChange,
}) {
  const filtered = columns.filter((col) => matchesSearch(col, searchQuery))
  const total = totalColumnCount ?? columns.length

  return (
    <section className="column-list-pane">
      <div
        className="pane-header"
        onContextMenu={(event) =>
          table && onLinkContextMenu?.(event, table.id, null)
        }
      >
        <h2>{table ? table.name : 'Select a table'}</h2>
        {table && status === 'success' && (
          <span className="column-count">
            {filtered.length} / {total} columns
          </span>
        )}
      </div>

      {table && (
        <div className="pane-search">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search columns, schemas, notes..."
            aria-label="Search columns"
          />
        </div>
      )}

      <div className="column-list">
        {!table && <p className="empty-hint">Choose a table from the left to get started.</p>}
        {table && status === 'loading' && <p className="empty-hint">Loading columns...</p>}
        {table && status === 'error' && (
          <p className="empty-hint error">Failed to load this table&apos;s data.</p>
        )}
        {table && status === 'success' && filtered.length === 0 && (
          <p className="empty-hint">No columns match &quot;{searchQuery}&quot;.</p>
        )}
        {table &&
          status === 'success' &&
          filtered.map((col) => {
            const meta = col.isSnowflakeSpecific
              ? SNOWFLAKE_SPECIFIC_STATUS_META
              : STATUS_META[col.status]
            const isActive = col.id === selectedColumnId
            return (
              <button
                key={col.id}
                type="button"
                className={`column-item${isActive ? ' active' : ''}${col.isSnowflakeSpecific ? ' is-snowflake-specific' : ''}`}
                onClick={() => onSelectColumn(col)}
                onContextMenu={(event) =>
                  table && onLinkContextMenu?.(event, table.id, col.id)
                }
              >
                <div className="column-item-row">
                  <span className="column-name">{col.snowflakeColumn}</span>
                  <span className={`status-badge ${meta.className}`}>{meta.label}</span>
                </div>
                {col.exampleData && (
                  <div className="column-example" title={col.exampleData}>
                    {col.exampleData}
                  </div>
                )}
              </button>
            )
          })}
      </div>
    </section>
  )
}

export default ColumnList
