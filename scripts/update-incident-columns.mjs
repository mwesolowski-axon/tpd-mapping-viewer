import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import { fileURLToPath } from 'url'

import { INCIDENT_FROM_REPORT_EXCLUDED_TABLE_IDS } from '../src/data/incidentFromReport.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const VIEWER = path.resolve(__dirname, '..')
const ROOT = path.resolve(VIEWER, '..')
const PUBLIC = path.join(VIEWER, 'public/data')

const manifest = JSON.parse(
  fs.readFileSync(path.join(PUBLIC, 'manifest.json'), 'utf8'),
)
const TABLES = manifest.tables
  .map((t) => t.id)
  .filter((id) => !INCIDENT_FROM_REPORT_EXCLUDED_TABLE_IDS.has(id))

const NUMBER_NOTE =
  'Derive via ReportFriendlyId (ReportNumber): EntDocument → RelIncidentDocument → EntIncident.IncidentFriendlyId. See sidebar for query.'
const ID_NOTE =
  'Derive via ReportFriendlyId (ReportNumber): EntDocument → RelIncidentDocument → EntIncident.Id. See sidebar for query.'

const NUMBER_COLS = new Set(['INCIDENTNUMBER', 'OFFENSEINCIDENTNUMBER'])
const ID_COLS = new Set(['INCIDENTID', 'INCIDENTEXTERNALID'])

function updateRow(row) {
  const sf = (row['Snowflake Column'] || '').trim().toUpperCase()
  if (NUMBER_COLS.has(sf)) {
    row['V2 Schema/View'] = 'Records.EntIncident'
    row['V2 Column'] = 'IncidentFriendlyId'
    row.Notes = NUMBER_NOTE
  } else if (ID_COLS.has(sf)) {
    row['V2 Schema/View'] = 'Records.EntIncident'
    row['V2 Column'] = 'Id'
    row.Notes = ID_NOTE
  }
  return row
}

for (const table of TABLES) {
  const file = `${table}.csv`
  for (const dir of [ROOT, PUBLIC]) {
    const filePath = path.join(dir, file)
    if (!fs.existsSync(filePath)) {
      continue
    }
    const text = fs.readFileSync(filePath, 'utf8')
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: false })
    let touched = false
    const updated = parsed.data.map((row) => {
      const sf = (row['Snowflake Column'] || '').trim().toUpperCase()
      if (!NUMBER_COLS.has(sf) && !ID_COLS.has(sf)) return row
      touched = true
      return updateRow({ ...row })
    })
    if (!touched) continue
    const out = Papa.unparse(updated, { columns: parsed.meta.fields })
    fs.writeFileSync(filePath, `${out}\n`, 'utf8')
    console.log('updated', filePath)
  }
}
