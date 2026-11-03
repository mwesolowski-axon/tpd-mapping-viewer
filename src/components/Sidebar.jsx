function Sidebar({
  tables,
  tablesStatus,
  selectedTableId,
  onSelectTable,
  onLinkContextMenu,
  searchQuery,
  onSearchChange,
}) {
  const filtered = tables.filter((table) =>
    table.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  )

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="brand-mark" aria-hidden="true">
          ❄
        </span>
        <div>
          <h1 className="app-title">Mapping Explorer</h1>
          <p className="app-subtitle">Snowflake &rarr; V1 / V2 lineage</p>
        </div>
      </div>

      <div className="sidebar-search">
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search tables..."
          aria-label="Search tables"
        />
      </div>

      <nav className="table-list" aria-label="Tables">
        {tablesStatus === 'loading' && <p className="empty-hint">Loading tables...</p>}
        {tablesStatus === 'error' && (
          <p className="empty-hint error">Couldn&apos;t load the table list.</p>
        )}
        {tablesStatus === 'success' && filtered.length === 0 && (
          <p className="empty-hint">No tables match &quot;{searchQuery}&quot;.</p>
        )}
        {tablesStatus === 'success' &&
          filtered.map((table) => (
            <button
              key={table.id}
              type="button"
              className={`table-item${table.id === selectedTableId ? ' active' : ''}`}
              onClick={() => onSelectTable(table.id)}
              onContextMenu={(event) => onLinkContextMenu?.(event, table.id, null)}
            >
              <span className="table-icon" aria-hidden="true">
                ▤
              </span>
              <span className="table-name">{table.name}</span>
            </button>
          ))}
      </nav>

      <div className="sidebar-footer">
        <p>{tables.length} table{tables.length === 1 ? '' : 's'} loaded</p>
      </div>
    </aside>
  )
}

export default Sidebar
