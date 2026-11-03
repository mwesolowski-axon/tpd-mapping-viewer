/** Shared sidebar + tooltip overrides for ReportFriendlyId → EntIncident derivation. */

export const INCIDENT_NUMBER_NOTE =
  'Derive via ReportFriendlyId (ReportNumber): EntDocument → RelIncidentDocument → EntIncident.IncidentFriendlyId. See sidebar for query.'

export const INCIDENT_ID_NOTE =
  'Derive via ReportFriendlyId (ReportNumber): EntDocument → RelIncidentDocument → EntIncident.Id. See sidebar for query.'

export const INCIDENT_FROM_REPORT_OVERRIDES = {
  INCIDENTNUMBER: 'See sidebar →',
  OFFENSEINCIDENTNUMBER: 'See sidebar →',
  INCIDENTID: 'See sidebar →',
  INCIDENTEXTERNALID: 'See sidebar →',
}

export const INCIDENT_FROM_REPORT_DIAGRAM = {
  nodes: [
    {
      id: 'EntDocument',
      label: 'Records.EntDocument',
      hint: 'Id, ReportFriendlyId',
      connectorType: 'join',
      connectorText: 'EntDocument.Id = RelIncidentDocument.ToId',
    },
    {
      id: 'RelIncidentDocument',
      label: 'Records.RelIncidentDocument',
      hint: 'incident ↔ document junction',
      connectorType: 'join',
      connectorText: 'RelIncidentDocument.FromId = EntIncident.Id',
    },
    {
      id: 'EntIncident',
      label: 'Records.EntIncident',
      hint: 'Id, IncidentFriendlyId',
    },
  ],
}

export const INCIDENT_FROM_REPORT_SQL = {
  title: 'Example V2 query',
  items: [
    {
      title: 'IncidentFriendlyId from ReportFriendlyId',
      sql: `SELECT ei.IncidentFriendlyId
FROM Records.EntIncident AS ei
WHERE ei.Id IN (
  SELECT rid.FromId
  FROM Records.RelIncidentDocument AS rid
  WHERE rid.ToId IN (
    SELECT d.Id
    FROM Records.EntDocument AS d
    WHERE d.ReportFriendlyId = '<ReportNumber>'
  )
);`,
    },
    {
      title: 'EntIncident.Id from ReportFriendlyId',
      sql: `SELECT ei.Id
FROM Records.EntIncident AS ei
WHERE ei.Id IN (
  SELECT rid.FromId
  FROM Records.RelIncidentDocument AS rid
  WHERE rid.ToId IN (
    SELECT d.Id
    FROM Records.EntDocument AS d
    WHERE d.ReportFriendlyId = '<ReportNumber>'
  )
);`,
    },
  ],
}

export const INCIDENT_FROM_REPORT_SUMMARY =
  'When IncidentNumber or IncidentId is not on the row’s primary V2 view, use the row’s ReportFriendlyId (ReportNumber): resolve the document in Records.EntDocument, follow Records.RelIncidentDocument to the incident, then read IncidentFriendlyId or Id on Records.EntIncident.'

/** Table IDs that include the shared incident-from-report sidebar block. */
export const INCIDENT_FROM_REPORT_TABLE_IDS = new Set([
  'AXON_ARRESTS',
  'AXON_ARRESTSCHARGES',
  'AXON_BIASMOTIVATION',
  'AXON_CALLFORSERVICE_TUCSONPDAZ',
  'AXON_CASEFACTORS',
  'AXON_CHARGES',
  'AXON_CITATIONS',
  'AXON_CITATIONSCHARGES',
  'AXON_CONTACTINFORMATIONPHONENUMBERS',
  'AXON_DEFLECTION_TUCSONPDAZ',
  'AXON_FORM4C_TUCSONPDAZ',
  'AXON_IDENTITYDOCUMENTS',
  'AXON_MARKINGS',
  'AXON_MEDICAL_TUCSONPDAZ',
  'AXON_METHODOFTRANSPORTATION_TUCSONPDAZ',
  'AXON_NARRATIVES',
  'AXON_OFFENSES',
  'AXON_OFFENSEWEAPONSUSED',
  'AXON_ORGANIZATIONS',
  'AXON_ORGANIZATIONTOVEHICLE',
  'AXON_PERSONS',
  'AXON_PERSONTOARREST',
  'AXON_PERSONTOLOCATION',
  'AXON_PERSONTOOFFENSE',
  'AXON_PERSONTOPERSON',
  'AXON_PERSONTOPROPERTY',
  'AXON_PERSONTOVEHICLE',
  'AXON_PROPERTIES',
  'AXON_PROPERTIESRECOVERYDETAILS',
  'AXON_PROPERTYMANAGEMENTS',
  'AXON_PROPERTYTOOFFENSE',
  'AXON_RECORDSLOCATIONS',
  'AXON_REPORTS',
])

/** Tables with custom incident joins — do not apply report-from-document CSV notes. */
export const INCIDENT_FROM_REPORT_EXCLUDED_TABLE_IDS = new Set([
  'AXON_CASES',
  'AXON_INCIDENTS',
  'AXON_MOSTRECENTGENERALOFFENSE',
  'AXON_REJECTEDREPORT_TUCSONPDAZ',
])

const INCIDENT_SNOWFLAKE_COLS = new Set([
  'INCIDENTNUMBER',
  'OFFENSEINCIDENTNUMBER',
  'INCIDENTID',
  'INCIDENTEXTERNALID',
])

/** True when CSV rows use the standard EntDocument derive note on an incident column. */
export function csvRowsUseIncidentFromReport(columns) {
  if (!columns?.length) return false
  const marker = 'EntDocument → RelIncidentDocument'
  return columns.some(
    (col) =>
      INCIDENT_SNOWFLAKE_COLS.has((col.snowflakeColumn || '').trim().toUpperCase()) &&
      (col.notes || '').includes(marker),
  )
}
