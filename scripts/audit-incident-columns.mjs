import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import { fileURLToPath } from 'url'
import {
  INCIDENT_FROM_REPORT_EXCLUDED_TABLE_IDS,
  INCIDENT_FROM_REPORT_TABLE_IDS,
} from '../src/data/incidentFromReport.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.join(__dirname, '../public/data')
const manifest = JSON.parse(fs.readFileSync(path.join(DATA, 'manifest.json'), 'utf8'))

const EXPECT = {
  number: { schema: 'Records.EntIncident', col: 'IncidentFriendlyId' },
  id: { schema: 'Records.EntIncident', col: 'Id' },
}

function classify(sf) {
  const u = (sf || '').trim().toUpperCase()
  if (u === 'INCIDENTID' || u === 'INCIDENTEXTERNALID') return 'id'
  if (u === 'INCIDENTNUMBER' || u === 'OFFENSEINCIDENTNUMBER') return 'number'
  if (/INCIDENT/.test(u) && /NUMBER/.test(u)) return 'number'
  if (/INCIDENT/.test(u) && /ID/.test(u) && !/NUMBER/.test(u)) return 'id'
  return null
}

const gaps = []
const reportNoIncident = []
const wrongV2 = []
const notInRegistry = []

for (const t of manifest.tables) {
  const fp = path.join(DATA, `${t.id}.csv`)
  if (!fs.existsSync(fp)) {
    gaps.push({ table: t.id, issue: 'missing CSV' })
    continue
  }
  const parsed = Papa.parse(fs.readFileSync(fp, 'utf8'), {
    header: true,
    skipEmptyLines: false,
  })
  const rows = parsed.data.filter((r) => r && Object.keys(r).some((k) => r[k]?.trim?.()))

  const hasReport = rows.some((r) =>
    /^(REPORTNUMBER|REPORTFRIENDLYID)$/i.test((r['Snowflake Column'] || '').trim()),
  )
  const incidentRows = rows.filter((r) => classify(r['Snowflake Column']))

  if (hasReport && incidentRows.length === 0) {
    reportNoIncident.push(t.id)
  }

  for (const r of incidentRows) {
    const kind = classify(r['Snowflake Column'])
    const exp = EXPECT[kind]
    const v2s = (r['V2 Schema/View'] || '').trim()
    const v2c = (r['V2 Column'] || '').trim()
    const empty = !v2s || !v2c
    const wrong = v2s !== exp.schema || v2c !== exp.col

    if (empty || wrong) {
      wrongV2.push({
        table: t.id,
        column: r['Snowflake Column'],
        v2: `${v2s || '(empty)'}/${v2c || '(empty)'}`,
        expected: `${exp.schema}/${exp.col}`,
      })
    }
    if (
      !INCIDENT_FROM_REPORT_TABLE_IDS.has(t.id) &&
      !INCIDENT_FROM_REPORT_EXCLUDED_TABLE_IDS.has(t.id)
    ) {
      notInRegistry.push({ table: t.id, column: r['Snowflake Column'] })
    }
  }
}

console.log('Tables with REPORTNUMBER but no IncidentNumber/IncidentId column:')
console.log(reportNoIncident.length ? reportNoIncident.join('\n') : '(none)')

console.log('\nIncident columns with missing or non-standard V2 mapping:')
console.log(wrongV2.length ? JSON.stringify(wrongV2, null, 2) : '(none)')

console.log('\nTables with incident columns NOT in incident-from-report registry (excl. AXON_INCIDENTS):')
const uniq = [...new Set(notInRegistry.map((x) => x.table))]
console.log(uniq.length ? uniq.join('\n') : '(none)')
