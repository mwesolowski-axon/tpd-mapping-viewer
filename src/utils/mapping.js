// Normalizes a raw PapaParse row (keyed by the CSV headers) into a clean
// shape the UI components can rely on, and derives the V1/V2 mapping status.

const FIELD = {
  snowflakeColumn: 'Snowflake Column',
  exampleData: 'Snowflake Example Data',
  v1Schema: 'V1 Schema/View',
  v1Column: 'V1 Column',
  v2Schema: 'V2 Schema/View',
  v2Column: 'V2 Column',
  notes: 'Notes',
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : ''
}

/** Rows whose Notes cell is tagged as pipeline / ETL metadata (not business mappings). */
export function isSnowflakeSpecificNotes(notes) {
  if (!notes) return false
  const firstLine = notes.split(/\r?\n/)[0].trim().replace(/^"+|"+$/g, '')
  return /^snowflake specific/i.test(firstLine)
}

export const SHOW_SNOWFLAKE_SPECIFIC_STORAGE_KEY = 'mapping-viewer.showSnowflakeSpecific'

export function filterSnowflakeSpecificColumns(columns, showSnowflakeSpecific, focusColumnId) {
  if (showSnowflakeSpecific) return columns
  return columns.filter(
    (col) => !col.isSnowflakeSpecific || col.id === focusColumnId,
  )
}

export function normalizeRow(row, index) {
  const snowflakeColumn = clean(row[FIELD.snowflakeColumn])
  const exampleData = clean(row[FIELD.exampleData])
  const v1Schema = clean(row[FIELD.v1Schema])
  const v1Column = clean(row[FIELD.v1Column])
  const v2Schema = clean(row[FIELD.v2Schema])
  const v2Column = clean(row[FIELD.v2Column])
  const notes = clean(row[FIELD.notes])
  const isSnowflakeSpecific = isSnowflakeSpecificNotes(notes)

  const hasV1 = Boolean(v1Schema || v1Column)
  const hasV2 = Boolean(v2Schema || v2Column)

  let status = 'unmapped'
  if (hasV1 && hasV2) status = 'both'
  else if (hasV1) status = 'v1-only'
  else if (hasV2) status = 'v2-only'

  return {
    id: snowflakeColumn || `row-${index}`,
    snowflakeColumn,
    exampleData,
    v1Schema,
    v1Column,
    v2Schema,
    v2Column,
    notes,
    isSnowflakeSpecific,
    hasV1,
    hasV2,
    status,
  }
}

export const STATUS_META = {
  both: { label: 'V1 + V2', className: 'status-both' },
  'v1-only': { label: 'V1 only', className: 'status-v1' },
  'v2-only': { label: 'V2 only', className: 'status-v2' },
  unmapped: { label: 'Unmapped', className: 'status-none' },
}

export const SNOWFLAKE_SPECIFIC_STATUS_META = {
  label: 'Snowflake',
  className: 'status-snowflake-specific',
}

export function sortColumns(columns, order) {
  if (order === 'asc') {
    return [...columns].sort((a, b) => a.snowflakeColumn.localeCompare(b.snowflakeColumn))
  }
  if (order === 'desc') {
    return [...columns].sort((a, b) => b.snowflakeColumn.localeCompare(a.snowflakeColumn))
  }
  // 'default' — the order columns appear in the source CSV.
  return columns
}

export function matchesSearch(col, query) {
  if (!query) return true
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return columnSearchFields(col).some((field) => field.toLowerCase().includes(needle))
}

/** All searchable text on a normalized column row (per-table and global search). */
export function columnSearchFields(col) {
  const qualifiedV1 = qualifiedSchemaColumn(col.v1Schema, col.v1Column)
  const qualifiedV2 = qualifiedSchemaColumn(col.v2Schema, col.v2Column)
  return [
    col.snowflakeColumn,
    col.exampleData,
    col.v1Schema,
    col.v1Column,
    qualifiedV1,
    col.v2Schema,
    col.v2Column,
    qualifiedV2,
    col.notes,
  ].filter(Boolean)
}

/** Standard `schema.column` copy target used on V1/V2 mapping nodes. */
export function qualifiedSchemaColumn(schema, column) {
  if (schema && column) return `${schema}.${column}`
  return column || schema || ''
}

const GLOBAL_RESULT_LIMIT = 40

/**
 * Search the pre-built global index (all tables). Returns hits sorted table
 * name, then snowflake column name.
 */
export function searchGlobalIndex(index, query, limit = GLOBAL_RESULT_LIMIT) {
  const needle = query.trim().toLowerCase()
  if (!needle || !index.length) return []

  const hits = []
  for (const entry of index) {
    const { table, column } = entry
    const haystack = [table.name, ...columnSearchFields(column)]
    if (!haystack.some((field) => field.toLowerCase().includes(needle))) continue

    hits.push({
      tableId: table.id,
      tableName: table.name,
      columnId: column.id,
      snowflakeColumn: column.snowflakeColumn,
      exampleData: column.exampleData,
      column,
    })
  }

  return hits
    .sort((a, b) => {
      const byTable = a.tableName.localeCompare(b.tableName)
      if (byTable !== 0) return byTable
      return a.snowflakeColumn.localeCompare(b.snowflakeColumn)
    })
    .slice(0, limit)
}
