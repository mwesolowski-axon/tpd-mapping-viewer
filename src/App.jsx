import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Sidebar from './components/Sidebar'
import ColumnList from './components/ColumnList'
import MappingCanvas from './components/MappingCanvas'
import InfoSidebar from './components/InfoSidebar'
import GlobalSearchBar from './components/GlobalSearchBar'
import MappingProgressBar from './components/MappingProgressBar'
import LinkContextMenu from './components/LinkContextMenu'
import { useManifest } from './hooks/useManifest'
import { useTableData } from './hooks/useTableData'
import { useGlobalSearchIndex } from './hooks/useGlobalSearchIndex'
import {
  SHOW_SNOWFLAKE_SPECIFIC_STORAGE_KEY,
  filterSnowflakeSpecificColumns,
  sortColumns,
} from './utils/mapping'
import { buildDeepLink, parseDeepLink, syncDeepLinkToAddressBar } from './utils/deepLink'
import { ToastProvider, useToast } from './context/ToastContext'
import { TABLE_INFO } from './data/tableInfo'
import { getTableInfo, tableHasInfoSidebar } from './data/tableInfoHelpers'
import { downloadTableExport } from './utils/tableExport'

function AppContent() {
  const { showToast } = useToast()
  const { tables, status: tablesStatus } = useManifest()
  const { index: globalIndex, status: globalIndexStatus } = useGlobalSearchIndex(tables)

  const initialDeepLink = useRef(parseDeepLink())

  const [selectedTableId, setSelectedTableId] = useState(null)
  const [tableSearch, setTableSearch] = useState('')
  const [columnSearch, setColumnSearch] = useState('')
  const [sortOrder, setSortOrder] = useState('default')
  const [showSnowflakeSpecific, setShowSnowflakeSpecific] = useState(() => {
    try {
      const stored = localStorage.getItem(SHOW_SNOWFLAKE_SPECIFIC_STORAGE_KEY)
      if (stored === null) return false
      return stored === 'true'
    } catch {
      return false
    }
  })
  const [focusRequest, setFocusRequest] = useState(null)
  const [linkMenu, setLinkMenu] = useState(null)

  useEffect(() => {
    try {
      localStorage.setItem(SHOW_SNOWFLAKE_SPECIFIC_STORAGE_KEY, String(showSnowflakeSpecific))
    } catch {
      /* ignore quota / private mode */
    }
  }, [showSnowflakeSpecific])

  useEffect(() => {
    if (!selectedTableId && tables.length > 0) {
      const { tableId } = initialDeepLink.current
      if (tableId && tables.some((table) => table.id === tableId)) {
        setSelectedTableId(tableId)
        return
      }
      setSelectedTableId(tables[0].id)
    }
  }, [tables, selectedTableId])

  const selectedTable = useMemo(
    () => tables.find((table) => table.id === selectedTableId) ?? null,
    [tables, selectedTableId],
  )

  const { columns, status: columnsStatus } = useTableData(selectedTable)

  useEffect(() => {
    const { tableId, columnId } = initialDeepLink.current
    if (!columnId || selectedTableId !== tableId || columnsStatus !== 'success') return

    const col = columns.find(
      (c) => c.id === columnId || c.snowflakeColumn === columnId,
    )
    if (!col) return

    if (col.isSnowflakeSpecific) {
      setShowSnowflakeSpecific(true)
    }
    setFocusRequest({ id: col.id, token: Date.now() })
    initialDeepLink.current = { tableId: null, columnId: null }
  }, [columns, columnsStatus, selectedTableId])

  useEffect(() => {
    if (!selectedTableId) return
    syncDeepLinkToAddressBar(selectedTableId, focusRequest?.id ?? null)
  }, [selectedTableId, focusRequest?.id])

  useEffect(() => {
    function handlePopState() {
      const { tableId, columnId } = parseDeepLink()
      if (tableId && tables.some((t) => t.id === tableId)) {
        setSelectedTableId(tableId)
      }
      if (columnId && tableId) {
        initialDeepLink.current = { tableId, columnId }
      } else {
        setFocusRequest(null)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [tables])

  const displayColumns = useMemo(() => {
    const sorted = sortColumns(columns, sortOrder)
    const overrides = selectedTable
      ? getTableInfo(selectedTable.id, TABLE_INFO, columns)?.columnNoteOverrides
      : null
    const withNotes = !overrides
      ? sorted
      : sorted.map((col) =>
          overrides[col.snowflakeColumn] ? { ...col, notes: overrides[col.snowflakeColumn] } : col,
        )

    return filterSnowflakeSpecificColumns(
      withNotes,
      showSnowflakeSpecific,
      focusRequest?.id ?? null,
    )
  }, [columns, sortOrder, selectedTable, showSnowflakeSpecific, focusRequest?.id])

  const hasInfoSidebar = Boolean(
    selectedTable &&
      tableHasInfoSidebar(TABLE_INFO[selectedTable.id], selectedTable.id, columns),
  )

  const openLinkMenu = useCallback((event, tableId, columnId, options = {}) => {
    if (!tableId) return
    event.preventDefault()
    event.stopPropagation()
    setLinkMenu({
      x: event.clientX,
      y: event.clientY,
      href: buildDeepLink({ tableId, columnId: columnId || null }),
      tableId,
      showTableDownload: Boolean(options.showTableDownload),
    })
  }, [])

  const handleCopyLink = useCallback(
    async (href) => {
      setLinkMenu(null)
      try {
        await navigator.clipboard.writeText(href)
        showToast('Link copied to clipboard')
      } catch {
        showToast('Could not copy link')
      }
    },
    [showToast],
  )

  const handleDownloadTable = useCallback(
    async (tableId) => {
      setLinkMenu(null)
      const table = tables.find((t) => t.id === tableId)
      if (!table) {
        showToast('Table not found')
        return
      }
      showToast('Preparing export…')
      try {
        await downloadTableExport(table, TABLE_INFO)
        showToast('Spreadsheet downloaded')
      } catch {
        showToast('Could not download export')
      }
    },
    [tables, showToast],
  )

  function handleSelectTable(tableId) {
    setSelectedTableId(tableId)
    setFocusRequest(null)
    setColumnSearch('')
  }

  function handleSelectColumn(column) {
    setFocusRequest({ id: column.id, token: Date.now() })
  }

  const handleGlobalSearchSelect = useCallback((hit) => {
    if (hit.column?.isSnowflakeSpecific) {
      setShowSnowflakeSpecific(true)
    }
    setSelectedTableId(hit.tableId)
    setColumnSearch('')
    setFocusRequest({ id: hit.columnId, token: Date.now() })
  }, [])

  return (
    <div className="app-frame">
      <div className="app-top-bar">
        <GlobalSearchBar
          index={globalIndex}
          indexStatus={globalIndexStatus}
          onSelectResult={handleGlobalSearchSelect}
        />
        <MappingProgressBar tables={tables} tablesStatus={tablesStatus} />
      </div>
      <div className={`app-shell${hasInfoSidebar ? ' has-info-sidebar' : ''}`}>
        <Sidebar
          tables={tables}
          tablesStatus={tablesStatus}
          selectedTableId={selectedTableId}
          onSelectTable={handleSelectTable}
          onLinkContextMenu={openLinkMenu}
          searchQuery={tableSearch}
          onSearchChange={setTableSearch}
        />
        <ColumnList
          table={selectedTable}
          columns={displayColumns}
          totalColumnCount={columns.length}
          status={columnsStatus}
          selectedColumnId={focusRequest?.id ?? null}
          onSelectColumn={handleSelectColumn}
          onLinkContextMenu={openLinkMenu}
          searchQuery={columnSearch}
          onSearchChange={setColumnSearch}
        />
        <MappingCanvas
          table={selectedTable}
          columns={displayColumns}
          totalColumnCount={columns.length}
          status={columnsStatus}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
          showSnowflakeSpecific={showSnowflakeSpecific}
          onShowSnowflakeSpecificChange={setShowSnowflakeSpecific}
          focusRequest={focusRequest}
          onLinkContextMenu={openLinkMenu}
        />
        <InfoSidebar table={selectedTable} columns={columns} />
      </div>
      <LinkContextMenu
        menu={linkMenu}
        onClose={() => setLinkMenu(null)}
        onCopy={handleCopyLink}
        onDownloadTable={handleDownloadTable}
      />
    </div>
  )
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}

export default App
