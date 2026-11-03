import Papa from 'papaparse'
import { normalizeRow, sortColumns } from './mapping'
import { getTableInfo } from '../data/tableInfoHelpers'

export const MAPPING_HEADERS = [
  'Snowflake Table',
  'Snowflake Column',
  'Example Data',
  'V1 Schema/View',
  'V1 Column',
  'V2 Schema/View',
  'V2 Column',
  'Notes',
]

function paragraphBlock(title, body) {
  const text = typeof body === 'string' ? body.trim() : ''
  if (!text) return ''
  return title ? `${title}\n${text}` : text
}

function serializeSummaries(info) {
  const parts = []
  const summaries = Array.isArray(info.summary)
    ? info.summary
    : info.summary
      ? [info.summary]
      : []
  for (const s of summaries) {
    if (s?.trim()) parts.push(s.trim())
  }
  return parts.join('\n\n')
}

function serializeDiagram(nodes) {
  if (!nodes?.length) return ''
  const lines = []
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i]
    if (i > 0 && nodes[i - 1].connectorText) {
      lines.push(`Join: ${nodes[i - 1].connectorText}`)
    }
    const label = node.label || node.id || 'View'
    const hints = [node.hint, node.derived ? 'derived link (not a direct join)' : null]
      .filter(Boolean)
      .join('; ')
    lines.push(hints ? `${label} — ${hints}` : label)
  }
  return lines.join('\n')
}

function serializeJoinHub(hub, spokes) {
  if (!hub?.label || !spokes?.length) return ''
  const lines = [`Hub: ${hub.label}${hub.hint ? ` (${hub.hint})` : ''}`]
  for (const spoke of spokes) {
    const chain = [spoke, ...(spoke.chain ?? [])]
    lines.push('')
    lines.push(`Spoke: ${chain[0].label ?? chain[0].id}`)
    for (let i = 0; i < chain.length; i += 1) {
      const hop = chain[i]
      if (i > 0 && chain[i - 1].connectorText) {
        lines.push(`  Join: ${chain[i - 1].connectorText}`)
      }
      if (i > 0) {
        lines.push(`  → ${hop.label ?? hop.id}${hop.hint ? ` (${hop.hint})` : ''}`)
      }
    }
  }
  return lines.join('\n')
}

function serializeSqlExamples(block) {
  if (!block?.items?.length) return ''
  const lines = [block.title || 'Example queries']
  for (const item of block.items) {
    lines.push('')
    lines.push(item.title || 'Query')
    lines.push(item.sql || '')
  }
  return lines.join('\n')
}

function serializeColumnFanout(fanout) {
  if (!fanout?.columns?.length) return ''
  const lines = []
  if (fanout.title) lines.push(fanout.title)
  if (fanout.intro) lines.push(fanout.intro)
  if (fanout.legend?.length) {
    lines.push('Legend:')
    for (const item of fanout.legend) lines.push(`  • ${item}`)
  }
  lines.push('V2 columns:')
  for (const col of fanout.columns) {
    const chip = fanout.chipNotes?.[col]
    lines.push(chip ? `  • ${col} — ${chip}` : `  • ${col}`)
  }
  if (fanout.footnote) {
    lines.push('')
    lines.push(fanout.footnote)
  }
  return lines.join('\n')
}

export function serializeTableInfo(info) {
  if (!info) return ''

  const sections = []

  if (info.title) sections.push(paragraphBlock('Additional context', info.title))

  const summary = serializeSummaries(info)
  if (summary) sections.push(paragraphBlock('Summary', summary))

  if (info.sqlExamples) sections.push(serializeSqlExamples(info.sqlExamples))

  const fanouts = []
  if (info.columnFanout?.columns?.length) fanouts.push(info.columnFanout)
  if (info.columnFanouts?.length) fanouts.push(...info.columnFanouts)
  for (const fanout of fanouts) {
    const block = serializeColumnFanout(fanout)
    if (block) sections.push(block)
  }

  if (info.diagram?.nodes?.length) {
    sections.push(paragraphBlock('Join lineage', serializeDiagram(info.diagram.nodes)))
  }

  if (info.joinHub?.hub) {
    sections.push(
      paragraphBlock(
        'Join hub',
        serializeJoinHub(info.joinHub.hub, info.joinHub.spokes),
      ),
    )
  }

  if (info.notes?.length) {
    sections.push(paragraphBlock('Notes', info.notes.map((n) => `• ${n}`).join('\n')))
  }

  if (info.incidentFromReport) {
    const ifr = info.incidentFromReport
    const ifrParts = []
    if (ifr.sectionTitle) ifrParts.push(ifr.sectionTitle)
    if (ifr.summary) ifrParts.push(ifr.summary)
    if (ifr.diagram?.nodes?.length) {
      ifrParts.push(serializeDiagram(ifr.diagram.nodes))
    }
    if (ifr.sqlExamples) ifrParts.push(serializeSqlExamples(ifr.sqlExamples))
    sections.push(ifrParts.filter(Boolean).join('\n\n'))
  }

  return sections.filter(Boolean).join('\n\n---\n\n')
}

function findChipNoteForV2Column(info, v2Column) {
  if (!v2Column || !info) return ''
  const fanouts = []
  if (info.columnFanout?.columns) fanouts.push(info.columnFanout)
  if (info.columnFanouts?.length) fanouts.push(...info.columnFanouts)
  for (const fanout of fanouts) {
    const note = fanout.chipNotes?.[v2Column]
    if (note) return note
  }
  return ''
}

function columnSidebarSnippet(info, column) {
  if (!info || !column) return ''
  const parts = []
  const chip = findChipNoteForV2Column(info, column.v2Column)
  if (chip) parts.push(chip)

  const fanouts = []
  if (info.columnFanout?.columns) fanouts.push(info.columnFanout)
  if (info.columnFanouts?.length) fanouts.push(...info.columnFanouts)
  for (const fanout of fanouts) {
    if (fanout.columns?.includes(column.v2Column) && !chip) {
      const title = fanout.title ? `${fanout.title} — ` : ''
      parts.push(`${title}V2 column ${column.v2Column} (see table-wide fan-out section).`)
    }
  }

  return parts.join('\n')
}

export async function fetchTableColumns(table) {
  const url = `${import.meta.env.BASE_URL}${table.file}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load ${table.file} (${res.status})`)
  const csvText = await res.text()
  const result = Papa.parse(csvText, { header: true, skipEmptyLines: true })
  return result.data.map(normalizeRow).filter((col) => col.snowflakeColumn)
}

export function buildMappingRows(table, columns) {
  const sorted = sortColumns(columns, 'default')
  const tableName = table.name || table.id

  return sorted.map((col) => ({
    'Snowflake Table': tableName,
    'Snowflake Column': col.snowflakeColumn,
    'Example Data': col.exampleData,
    'V1 Schema/View': col.v1Schema,
    'V1 Column': col.v1Column,
    'V2 Schema/View': col.v2Schema,
    'V2 Column': col.v2Column,
    Notes: col.notes,
  }))
}

export function buildColumnSidebarRows(columns, tableInfoMap, tableId) {
  const sorted = sortColumns(columns, 'default')
  const info = getTableInfo(tableId, tableInfoMap, sorted)
  const rows = []

  for (const col of sorted) {
    const note = columnSidebarSnippet(info, col)
    if (!note) continue
    rows.push({
      'Snowflake Column': col.snowflakeColumn,
      'V2 Column': col.v2Column,
      'Sidebar notes': note,
    })
  }

  return rows
}

/** Second sheet: table-wide sidebar prose + optional per-column notes table. */
export function buildAdditionalContextSheetAoa(table, columns, tableInfoMap) {
  const sorted = sortColumns(columns, 'default')
  const info = getTableInfo(table.id, tableInfoMap, sorted)
  const tableSidebar = serializeTableInfo(info)
  const columnRows = buildColumnSidebarRows(columns, tableInfoMap, table.id)

  const aoa = [
    ['Snowflake Table', table.name || table.id],
    [],
    ['Table-wide additional context'],
    [tableSidebar || '(No additional context panel for this table.)'],
    [],
  ]

  if (columnRows.length > 0) {
    aoa.push(['Column-specific sidebar notes'])
    aoa.push(['Snowflake Column', 'V2 Column', 'Sidebar notes'])
    for (const row of columnRows) {
      aoa.push([row['Snowflake Column'], row['V2 Column'], row['Sidebar notes']])
    }
  }

  return aoa
}

/** Single CSV: mapping rows, blank row, then sidebar block below (for tools that only read CSV). */
export function buildStackedCsvExport(table, columns, tableInfoMap) {
  const mappingRows = buildMappingRows(table, columns)
  const mappingCsv = Papa.unparse(mappingRows, { columns: MAPPING_HEADERS })
  const contextAoa = buildAdditionalContextSheetAoa(table, columns, tableInfoMap)
  const contextLines = contextAoa.map((row) =>
    Papa.unparse([row], { header: false, quotes: true }),
  )
  return `\uFEFF${mappingCsv}\n\n${contextLines.join('\n')}`
}

const WRAP_TOP = { wrapText: true, vertical: 'top', horizontal: 'left' }

/** Excel column width (approx. characters) from longest line of text. */
function columnWidthForText(text, { min = 12, max = 100 } = {}) {
  if (!text) return min
  const lines = String(text).split(/\r?\n/)
  const longest = Math.max(...lines.map((line) => line.length), 0)
  return Math.min(max, Math.max(min, Math.ceil(longest * 0.9) + 2))
}

/** Row height from wrapped line count at a given column width (character units). */
function rowHeightForWrappedText(text, colWidthChars, lineHeight = 15) {
  if (!text) return lineHeight
  const lines = String(text).split(/\r?\n/)
  let wrappedLines = 0
  for (const line of lines) {
    wrappedLines += Math.max(1, Math.ceil(line.length / Math.max(colWidthChars, 1)))
  }
  return Math.min(wrappedLines * lineHeight, 409)
}

function autoSizeWorksheetColumns(worksheet, fromRow = 1, toRow = worksheet.rowCount) {
  const colCount = worksheet.columnCount
  for (let c = 1; c <= colCount; c += 1) {
    let maxLen = 0
    for (let r = fromRow; r <= toRow; r += 1) {
      const cell = worksheet.getRow(r).getCell(c)
      const val = cell.value
      if (val == null) continue
      const text = typeof val === 'object' && val.richText ? val.richText.map((t) => t.text).join('') : String(val)
      for (const line of text.split(/\r?\n/)) {
        maxLen = Math.max(maxLen, line.length)
      }
    }
    if (maxLen > 0) {
      worksheet.getColumn(c).width = Math.min(Math.max(maxLen + 2, 10), 72)
    }
  }
}

export async function buildTableExportWorkbook(ExcelJS, table, columns, tableInfoMap) {
  const workbook = new ExcelJS.Workbook()
  const mappingRows = buildMappingRows(table, columns)

  const mappingsSheet = workbook.addWorksheet('Mappings')
  mappingsSheet.addRow(MAPPING_HEADERS)
  mappingsSheet.getRow(1).font = { bold: true }
  for (const row of mappingRows) {
    const added = mappingsSheet.addRow(MAPPING_HEADERS.map((h) => row[h] ?? ''))
    const notes = row.Notes ?? ''
    if (notes.includes('\n')) {
      added.getCell(8).alignment = WRAP_TOP
    }
  }
  autoSizeWorksheetColumns(mappingsSheet)

  const sorted = sortColumns(columns, 'default')
  const info = getTableInfo(table.id, tableInfoMap, sorted)
  const tableSidebar = serializeTableInfo(info)
  const columnRows = buildColumnSidebarRows(columns, tableInfoMap, table.id)

  const contextSheet = workbook.addWorksheet('Additional context')
  contextSheet.getCell(1, 1).value = 'Snowflake Table'
  contextSheet.getCell(1, 2).value = table.name || table.id

  contextSheet.getCell(3, 1).value = 'Table-wide additional context'
  contextSheet.getCell(3, 1).font = { bold: true }

  const sidebarText = tableSidebar || '(No additional context panel for this table.)'
  const sidebarWidth = columnWidthForText(sidebarText, { min: 48, max: 120 })
  contextSheet.mergeCells(4, 1, 4, 3)
  const sidebarCell = contextSheet.getCell(4, 1)
  sidebarCell.value = sidebarText
  sidebarCell.alignment = WRAP_TOP
  contextSheet.getColumn(1).width = sidebarWidth
  contextSheet.getColumn(2).width = Math.min(sidebarWidth * 0.35, 40)
  contextSheet.getColumn(3).width = Math.min(sidebarWidth * 0.35, 40)
  contextSheet.getRow(4).height = rowHeightForWrappedText(sidebarText, sidebarWidth)

  let nextRow = 6
  if (columnRows.length > 0) {
    contextSheet.getCell(nextRow, 1).value = 'Column-specific sidebar notes'
    contextSheet.getCell(nextRow, 1).font = { bold: true }
    nextRow += 1
    const headerRow = contextSheet.getRow(nextRow)
    headerRow.values = [null, 'Snowflake Column', 'V2 Column', 'Sidebar notes']
    headerRow.font = { bold: true }
    nextRow += 1

    for (const row of columnRows) {
      const added = contextSheet.getRow(nextRow)
      added.getCell(1).value = row['Snowflake Column']
      added.getCell(2).value = row['V2 Column']
      const noteCell = added.getCell(3)
      noteCell.value = row['Sidebar notes']
      noteCell.alignment = WRAP_TOP
      const noteWidth = columnWidthForText(row['Sidebar notes'], { min: 24, max: 90 })
      contextSheet.getColumn(3).width = Math.max(contextSheet.getColumn(3).width ?? 0, noteWidth)
      added.height = rowHeightForWrappedText(row['Sidebar notes'], noteWidth)
      nextRow += 1
    }

    autoSizeWorksheetColumns(contextSheet, nextRow - columnRows.length, nextRow - 1)
    contextSheet.getColumn(3).width = Math.max(
      contextSheet.getColumn(3).width ?? 0,
      ...columnRows.map((r) => columnWidthForText(r['Sidebar notes'], { min: 24, max: 90 })),
    )
  }

  return workbook
}

export async function downloadTableExport(table, tableInfoMap) {
  const [columns, ExcelJSModule] = await Promise.all([
    fetchTableColumns(table),
    import('exceljs'),
  ])
  const ExcelJS = ExcelJSModule.default
  const workbook = await buildTableExportWorkbook(ExcelJS, table, columns, tableInfoMap)
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = `${table.id}_mapping.xlsx`
  anchor.click()
  URL.revokeObjectURL(objectUrl)
}
