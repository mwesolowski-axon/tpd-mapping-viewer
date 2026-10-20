import { useEffect, useMemo, useState } from 'react'
import Sidebar from './components/Sidebar'
import ColumnList from './components/ColumnList'
import MappingCanvas from './components/MappingCanvas'
import InfoSidebar from './components/InfoSidebar'
import { useManifest } from './hooks/useManifest'
import { useTableData } from './hooks/useTableData'
import { sortColumns } from './utils/mapping'
import { ToastProvider } from './context/ToastContext'
import { TABLE_INFO } from './data/tableInfo'

function App() {
  const { tables, status: tablesStatus } = useManifest()

  const [selectedTableId, setSelectedTableId] = useState(null)
  const [tableSearch, setTableSearch] = useState('')
  const [columnSearch, setColumnSearch] = useState('')
  const [sortOrder, setSortOrder] = useState('default')
  const [focusRequest, setFocusRequest] = useState(null)

  // Auto-select the first table once the manifest loads.
  useEffect(() => {
    if (!selectedTableId && tables.length > 0) {
      setSelectedTableId(tables[0].id)
    }
  }, [tables, selectedTableId])

  const selectedTable = useMemo(
    () => tables.find((table) => table.id === selectedTableId) ?? null,
    [tables, selectedTableId]
  )

  const { columns, status: columnsStatus } = useTableData(selectedTable)

  const displayColumns = useMemo(() => {
    const sorted = sortColumns(columns, sortOrder)
    const overrides = selectedTable ? TABLE_INFO[selectedTable.id]?.columnNoteOverrides : null
    if (!overrides) return sorted

    // Some columns' full explanation now lives in the info sidebar instead
    // of the hover tooltip — swap in a short pointer to it for those.
    return sorted.map((col) =>
      overrides[col.snowflakeColumn] ? { ...col, notes: overrides[col.snowflakeColumn] } : col
    )
  }, [columns, sortOrder, selectedTable])

  const hasInfoSidebar = Boolean(selectedTable && TABLE_INFO[selectedTable.id])

  function handleSelectTable(tableId) {
    setSelectedTableId(tableId)
    setFocusRequest(null)
    setColumnSearch('')
  }

  function handleSelectColumn(column) {
    setFocusRequest({ id: column.id, token: Date.now() })
  }

  return (
    <ToastProvider>
      <div className={`app-shell${hasInfoSidebar ? ' has-info-sidebar' : ''}`}>
        <Sidebar
          tables={tables}
          tablesStatus={tablesStatus}
          selectedTableId={selectedTableId}
          onSelectTable={handleSelectTable}
          searchQuery={tableSearch}
          onSearchChange={setTableSearch}
        />
        <ColumnList
          table={selectedTable}
          columns={displayColumns}
          status={columnsStatus}
          selectedColumnId={focusRequest?.id ?? null}
          onSelectColumn={handleSelectColumn}
          searchQuery={columnSearch}
          onSearchChange={setColumnSearch}
        />
        <MappingCanvas
          table={selectedTable}
          columns={displayColumns}
          status={columnsStatus}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
          focusRequest={focusRequest}
        />
        <InfoSidebar table={selectedTable} />
      </div>
    </ToastProvider>
  )
}

export default App
