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

export function normalizeRow(row, index) {
  const snowflakeColumn = clean(row[FIELD.snowflakeColumn])
  const exampleData = clean(row[FIELD.exampleData])
  const v1Schema = clean(row[FIELD.v1Schema])
  const v1Column = clean(row[FIELD.v1Column])
  const v2Schema = clean(row[FIELD.v2Schema])
  const v2Column = clean(row[FIELD.v2Column])
  const notes = clean(row[FIELD.notes])

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
  return [
    col.snowflakeColumn,
    col.exampleData,
    col.v1Schema,
    col.v1Column,
    col.v2Schema,
    col.v2Column,
    col.notes,
  ].some((field) => field && field.toLowerCase().includes(needle))
}
