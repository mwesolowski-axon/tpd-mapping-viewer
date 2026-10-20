// Optional per-table "additional context" shown in the collapsible right
// sidebar (see InfoSidebar.jsx). Most tables don't need an entry here — this
// is only for tables whose V2 side is made of several Records views that
// have to be joined together to reconstruct one row, which isn't obvious
// from the flat V1 -> V2 column mapping alone.
//
// Shape:
//   {
//     title: string
//     summary: string
//     diagram: { nodes: JoinDiagramNode[] }   // see JoinDiagram.jsx
//     notes: string[]                          // extra prose, rendered below the diagram
//     sqlExamples: {                           // optional collapsible "example query" section
//       title: string
//       items: { title: string, sql: string }[] // each item is its own collapsible block
//     }
//     columnFanout: {                           // optional "one V1 column -> many V2 columns" callout
//       title: string
//       intro: string
//       legend: string[]                        // short value-meaning pairs, e.g. "'1' = Yes"
//       columns: string[]                       // the V2 column names, rendered as chips
//       footnote: string
//     }
//     columnNoteOverrides: {                    // optional: replace a column's hover-tooltip
//       [snowflakeColumnName]: string            // note with short text pointing at this sidebar,
//     }                                          // for columns whose full note is covered here instead
//     joinHub: {                                 // optional "one central view, several spokes" diagram
//       hub: { label: string, hint?: string }     // (use `diagram` instead for a straight chain)
//       spokes: {                                 // each spoke joins the hub directly...
//         id, label, hint?, connectorText,
//         chain?: { id, label, hint?, connectorText }[]  // ...unless it needs further hops, e.g.
//       }[]                                        //    hub -> bridge view -> final view
//     }
//   }
export const TABLE_INFO = {
  AXON_CALLFORSERVICE_TUCSONPDAZ: {
    title: 'How the V2 views join together',
    summary:
      "This table's V2 columns aren't one flat view — they come from four separate Records views. Three of them chain together through real joins; IncidentReport sits off to the side and is only related by a derived value, not a join.",
    diagram: {
      nodes: [
        {
          id: 'IncidentReport',
          label: 'Records.IncidentReport',
          hint: 'ReportId, ReportFriendlyId',
          derived: true,
          connectorType: 'derived',
          connectorText:
            'Not joined. IncidentReport.ReportFriendlyId and EntIncident.IncidentFriendlyId are both derived from the same report number (e.g. "P2411270009-1" vs. "P2411270009").',
        },
        {
          id: 'EntIncident',
          label: 'Records.EntIncident',
          hint: 'Id, IncidentFriendlyId',
          connectorType: 'join',
          connectorText: 'IncidentReport.Id = RelIncidentCallForService.FromId',
        },
        {
          id: 'RelIncidentCallForService',
          label: 'Records.RelIncidentCallForService',
          hint: 'junction view',
          connectorType: 'join',
          connectorText: 'RelIncidentCallForService.ToId = EntCallForService.Id',
        },
        {
          id: 'EntCallForService',
          label: 'Records.EntCallForService',
          hint: 'Id, AxonCfsId, AxonCallType, AxonDisposition',
          connectorType: 'join',
          connectorText: 'EntCallForService.Id = EntCallForService_AxonLocation.CallForServiceId',
        },
        {
          id: 'EntCallForService_AxonLocation',
          label: 'Records.EntCallForService_AxonLocation',
          hint: 'AxonLat, AxonLon',
        },
      ],
    },
    notes: [
      'Records.IncidentReport does not directly join to any of the other three views used by this table. Its link is inferred rather than joined: the incident number embedded in ReportFriendlyId (e.g. the "P2411270009" in "P2411270009-1") matches EntIncident.IncidentFriendlyId.',
    ],
    sqlExamples: {
      title: 'Example V2 query',
      items: [
        {
          title: 'Using Snowflake column names',
          sql: `-- Using Snowflake Column Names

SELECT
    ir.ReportId                          AS EXTERNALID,
    ei.Id                                AS INCIDENTID,
    ei.IncidentFriendlyId                AS INCIDENTNUMBER,
    ir.ReportFriendlyId                  AS REPORTNUMBER,
    ir.CustomUsCfsLocation               AS CALLFORSERVICELOCATION,
    cfs.AxonCreatedOn                    AS CALLFORSERVICECREATEDDATE,
    cfs.AxonCfsId                        AS CFSID,
    cfs.AxonCallType                     AS CALLTYPE,
    cfs.AxonDisposition                  AS DISPOSITION,
    loc.AxonLat                          AS LATITUDE,
    loc.AxonLon                          AS LONGITUDE
FROM Records.EntIncident AS ei
INNER JOIN Records.RelIncidentCallForService AS ric
    ON ei.Id = ric.FromId
INNER JOIN Records.EntCallForService AS cfs
    ON ric.ToId = cfs.Id
INNER JOIN Records.EntCallForService_AxonLocation AS loc
    ON cfs.Id = loc.CallForServiceId
-- IncidentReport isn't joined by a real FK — it's matched by the derived
-- report-number relationship (ReportFriendlyId = IncidentFriendlyId + "-N")
LEFT JOIN Records.IncidentReport AS ir
    ON ir.ReportFriendlyId LIKE ei.IncidentFriendlyId + '-%'
WHERE ei.IncidentFriendlyId = '<Incident Number>';`,
        },
        {
          title: 'Using V2 column names',
          sql: `-- Using V2 Column Names
SELECT
    ir.ReportId                  AS ReportId,
    ei.Id                        AS Id,
    ei.IncidentFriendlyId        AS IncidentFriendlyId,
    ir.ReportFriendlyId          AS ReportFriendlyId,
    ir.CustomUsCfsLocation       AS CustomUsCfsLocation,
    cfs.AxonCreatedOn            AS AxonCreatedOn,
    cfs.AxonCfsId                AS AxonCfsId,
    cfs.AxonCallType             AS AxonCallType,
    cfs.AxonDisposition          AS AxonDisposition,
    loc.AxonLat                  AS AxonLat,
    loc.AxonLon                  AS AxonLon
FROM Records.EntIncident AS ei
INNER JOIN Records.RelIncidentCallForService AS ric
    ON ei.Id = ric.FromId
INNER JOIN Records.EntCallForService AS cfs
    ON ric.ToId = cfs.Id
INNER JOIN Records.EntCallForService_AxonLocation AS loc
    ON cfs.Id = loc.CallForServiceId
-- IncidentReport isn't joined by a real FK — it's matched by the derived
-- report-number relationship (ReportFriendlyId = IncidentFriendlyId + "-N")
LEFT JOIN Records.IncidentReport AS ir
    ON ir.ReportFriendlyId LIKE ei.IncidentFriendlyId + '-%'
WHERE ei.IncidentFriendlyId = '<Incident Number>';`,
        },
      ],
    },
  },
  AXON_CASEFACTORS: {
    title: 'V1 → V2: one column becomes many',
    summary:
      "V1's CASEFACTOR column holds one case factor per row, so a report with several factors ends up as several Snowflake rows. V2 drops that entirely in favor of one dedicated binary column per factor on Records.IncidentReport — a single report row already tells you which factors apply, no extra rows needed.",
    columnFanout: {
      intro: 'Each column below lives on Records.IncidentReport and holds:',
      legend: ["'1' = Yes", "'0' = No"],
      columns: [
        'CustomUsCaseFactorsOnlineReportCount',
        'CustomUsCaseFactorsK9DeploymentCount',
        'CustomUsCaseFactorsNonFatalshootingCount',
        'CustomUsCaseFactorsOfficerInvolvedShootingCount',
      ],
      footnote:
        'For K9 deployments specifically, whether it was a K9 Bite or a K9 Show of Force requires also checking the value of CustomUsCaseFactorsK9DeploymentList.',
    },
    columnNoteOverrides: {
      CASEFACTOR: 'See sidebar →',
    },
  },
  AXON_CITATIONS: {
    title: 'Why CitationTime shows a 1970-01-01 date',
    summary:
      "CITATIONTIME and its timezone variants (CITATIONTIME_EASTERN, _CENTRAL, _MOUNTAIN, _ARIZONA, _PACIFIC) show a '1970-01-01' date in the Snowflake example data — that is how Snowflake is currently representing the time-only values. V1 stores these as true time-only fields (hh:mm:ss, no date component at all). V2 doesn't track time-only values separately: CitationTime, CitationDate, ReportedAt, and all of their timezone variants are all derived from the same single field, Records.IncidentReport_SubCitation.AxonReportedAt.",
  },
  AXON_CONTACTINFORMATIONPHONENUMBERS: {
    title: 'Two V2 views are needed for complete contact info',
    summary:
      "This table's V2 columns are split across two views — name fields come from one, phone number fields come from the other. Join them on BOTH PersonFriendlyId and ReportFriendlyId, not PersonFriendlyId alone, so you only pull the values captured on this specific report. The same person can appear on multiple reports, so a PersonFriendlyId-only join could pull contact info from the wrong report.",
    diagram: {
      nodes: [
        {
          id: 'IncidentReport_EntPerson',
          label: 'Records.IncidentReport_EntPerson',
          hint: 'AxonFirstName, AxonMiddleName, AxonLastName',
          connectorType: 'join',
          connectorText:
            'IncidentReport_EntPerson.PersonFriendlyId = IncidentReport_EntPerson_AxonContactPhoneNumbers.PersonFriendlyId AND IncidentReport_EntPerson.ReportFriendlyId = IncidentReport_EntPerson_AxonContactPhoneNumbers.ReportFriendlyId',
        },
        {
          id: 'IncidentReport_EntPerson_AxonContactPhoneNumbers',
          label: 'Records.IncidentReport_EntPerson_AxonContactPhoneNumbers',
          hint: 'Value, Type, PersonFriendlyId, ReportFriendlyId',
        },
      ],
    },
  },
  AXON_DEFLECTION_TUCSONPDAZ: {
    title: 'Records.Deflection is the hub three other views join to',
    summary:
      "This table's V2 columns come from four separate Records views, but they aren't chained together — Records.Officer, Records.Deflection_EntPerson, and Records.Deflection_CustomUsParties_IndividualRole each join directly to the central Records.Deflection view, not to each other.",
    joinHub: {
      hub: {
        label: 'Records.Deflection',
        hint: 'ReportFriendlyId, AuthorId, Custom...',
      },
      spokes: [
        {
          id: 'Officer',
          label: 'Records.Officer',
          hint: 'Id, Username',
          connectorText: 'Deflection.AuthorId = Officer.Id',
        },
        {
          id: 'Deflection_EntPerson',
          label: 'Records.Deflection_EntPerson',
          hint: 'AxonFirstName, AxonLastName',
          connectorText: 'Deflection.ReportFriendlyId = Deflection_EntPerson.ReportFriendlyId',
        },
        {
          id: 'Deflection_CustomUsParties_IndividualRole',
          label: 'Records.Deflection_CustomUsParties_IndividualRole',
          hint: 'AxonInvolvement',
          connectorText:
            'Deflection.ReportFriendlyId = Deflection_CustomUsParties_IndividualRole.ReportFriendlyId',
        },
      ],
    },
  },
  AXON_FORM4C_TUCSONPDAZ: {
    title: 'Records.Form4C is the hub for the Officer and Incident links',
    summary:
      "Most of this table's V2 columns live on Records.Form4C. Records.Officer joins directly to it for the author's username, while reaching Records.EntIncident for the Incident Number takes an extra hop through the Records.RelIncidentDocument bridge view instead of a direct join.",
    joinHub: {
      hub: {
        label: 'Records.Form4C',
        hint: 'Id, ReportFriendlyId, AuthorId, Custom...',
      },
      spokes: [
        {
          id: 'Officer',
          label: 'Records.Officer',
          hint: 'Id, Username',
          connectorText: 'Form4C.AuthorId = Officer.Id',
        },
        {
          id: 'RelIncidentDocument',
          label: 'Records.RelIncidentDocument',
          hint: 'junction view',
          connectorText: 'Form4C.Id = RelIncidentDocument.ToId',
          chain: [
            {
              id: 'EntIncident',
              label: 'Records.EntIncident',
              hint: 'IncidentFriendlyId',
              connectorText: 'RelIncidentDocument.FromId = EntIncident.Id',
            },
          ],
        },
      ],
    },
    notes: [
      "REPORTSTATUS isn't a direct value conversion to Form4C.IsDraft: V1/Snowflake stores NULL or INDELIBLE, while V2's IsDraft is a plain boolean (0 or 1).",
    ],
  },
}
