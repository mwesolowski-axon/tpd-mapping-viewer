import {
  INCIDENT_FROM_REPORT_DIAGRAM,
  INCIDENT_FROM_REPORT_EXCLUDED_TABLE_IDS,
  INCIDENT_FROM_REPORT_OVERRIDES,
  INCIDENT_FROM_REPORT_SQL,
  INCIDENT_FROM_REPORT_SUMMARY,
  INCIDENT_FROM_REPORT_TABLE_IDS,
  csvRowsUseIncidentFromReport,
} from './incidentFromReport'

function tableUsesIncidentFromReport(tableId, base, columns) {
  if (INCIDENT_FROM_REPORT_EXCLUDED_TABLE_IDS.has(tableId)) return false
  if (base?.incidentFromReport === true) return true
  if (INCIDENT_FROM_REPORT_TABLE_IDS.has(tableId)) return true
  return csvRowsUseIncidentFromReport(columns)
}

export function tableHasInfoSidebar(info, tableId, columns) {
  if (tableUsesIncidentFromReport(tableId, info, columns)) return true
  if (info) {
    return Boolean(
      info.title ||
        info.summary ||
        info.diagram?.nodes?.length ||
        info.joinHub ||
        info.columnFanout ||
        info.columnFanouts?.length ||
        info.sqlExamples ||
        info.bulletSections?.length ||
        info.notes?.length,
    )
  }
  return false
}

export function resolveTableInfo(tableId, base, columns) {
  const useIncident = tableUsesIncidentFromReport(tableId, base, columns)
  if (!base && !useIncident) return null

  const info = { ...(base || {}) }

  if (!useIncident) return info

  info.incidentFromReport = {
    sectionTitle: 'Incident Number / Id from Report Number',
    summary: INCIDENT_FROM_REPORT_SUMMARY,
    diagram: INCIDENT_FROM_REPORT_DIAGRAM,
    sqlExamples: INCIDENT_FROM_REPORT_SQL,
  }

  info.columnNoteOverrides = {
    ...INCIDENT_FROM_REPORT_OVERRIDES,
    ...info.columnNoteOverrides,
  }

  if (!info.title && !info.summary && !info.diagram && !info.joinHub && !info.columnFanout) {
    info.title = info.title || 'Additional context'
  }

  return info
}

export function getTableInfo(tableId, tableInfoMap, columns) {
  return resolveTableInfo(tableId, tableInfoMap[tableId], columns)
}
