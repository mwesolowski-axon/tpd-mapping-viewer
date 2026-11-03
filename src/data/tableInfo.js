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
//     columnFanouts: { title?, intro?, chipNotes?, ... }[]  // chipNotes: { [columnChipName]: string } adds an “i” hint on that chip
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
  AXON_ARRESTS: {
    title: 'Arrest mappings',
    summary:
      'Most columns map to Records.IncidentReport_EntArrest on the report where the arrest was captured. IncidentNumber and IncidentId are not on that view — use the shared incident-from-report section below with this row’s ReportFriendlyId (ReportNumber).',
    incidentFromReport: true,
    notes: [
      'Do not use LatestIncidentReport_EntArrest to infer incident number — only the latest report revision is included (e.g. if -3 exists, arrests tied to -1 may not appear).',
    ],
  },
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
    incidentFromReport: true,
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
    notes: [
      'Use this row’s ReportFriendlyId (ReportNumber, e.g. 2507-DEF-00005) as `<ReportNumber>` in the incident-from-report query below — not the P-prefixed IncidentNumber value from Snowflake.',
    ],
  },
  AXON_FORM4C_TUCSONPDAZ: {
    title: 'Records.Form4C is the hub for the Officer and Incident links',
    summary:
      "Most of this table's V2 columns live on Records.Form4C. Records.Officer joins directly to it for the author's username. IncidentNumber is not on Form4C — derive it from ReportFriendlyId via the incident-from-report section below (confirmed with Form4C report ids such as 2610-FORM4C-00037).",
    incidentFromReport: true,
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
      'Use ReportFriendlyId (ReportNumber, e.g. 2610-FORM4C-00037) as `<ReportNumber>` in the incident-from-report query — not the P-prefixed IncidentNumber from Snowflake unless it matches that report id.',
    ],
  },
  AXON_INCIDENTS: {
    title: 'Use V2 relationship tables, not direct ID joins',
    summary:
      "Snowflake's Incidents row pulls fields from many V2 views at once — call-for-service, incident, report, location, and case disposition. In V2 those links are not \"match the same business ID on every table.\" They are wired through Records.Rel* relationship views that preserve entity, document, and child-array structure.",
    diagram: {
      nodes: [
        {
          id: 'EntCallForService',
          label: 'Records.EntCallForService',
          hint: 'AxonCfsId, AxonCallType, AxonDisposition',
          connectorType: 'join',
          connectorText: 'EntCallForService.Id = RelIncidentCallForService.ToId',
        },
        {
          id: 'RelIncidentCallForService',
          label: 'Records.RelIncidentCallForService',
          hint: 'incident ↔ CFS junction',
          connectorType: 'join',
          connectorText: 'RelIncidentCallForService.FromId = EntIncident.Id',
        },
        {
          id: 'EntIncident',
          label: 'Records.EntIncident',
          hint: 'Id, IncidentFriendlyId',
          connectorType: 'join',
          connectorText: 'EntIncident.Id = RelIncidentDocument.FromId',
        },
        {
          id: 'RelIncidentDocument',
          label: 'Records.RelIncidentDocument',
          hint: 'incident ↔ report junction',
          connectorType: 'join',
          connectorText: 'RelIncidentDocument.ToId = IncidentReport.Id',
        },
        {
          id: 'IncidentReport',
          label: 'Records.IncidentReport',
          hint: 'CreatedAt, AxonPurpose, AxonDomesticViolenceFlag',
        },
      ],
    },
    notes: [
      'Records.IncidentReport_EntLocation (e.g. ZipCode) attaches to its parent report with a composite key: match both ReportId and Id on Records.IncidentReport — not ReportId alone.',
      'Case disposition fields (clearance dates, UCR disposition, etc.) live on Records.EntCase_AxonDispositions. Reach the case through Records.RelCaseIncident, then join EntCase_AxonDispositions.ParentId to Records.EntCase.Id.',
      'Joining similarly named IDs directly across these views can attach the wrong CFS, report, location row, or disposition. Follow the Rel* paths above so each column comes from the correct related entity.',
    ],
  },
  AXON_MARKINGS: {
    title: 'V1 is one view; V2 splits by report type and entity',
    summary:
      'In V1, every marking row maps to axon.Markings — one place for person and vehicle markings regardless of which report captured them. In V2, the same fields are modeled on many separate Records.*_AxonMarkings views: one variant per report type (Person vs Vehicle), plus entity-level views that are not tied to a specific report. Pick the view that matches how the marking is scoped in your query (report type, latest report only, or entity).',
    columnFanouts: [
      {
        title: 'Person',
        intro: 'Each chip is a Records view (Records.<name>) with the same marking column set for that report or entity context.',
        columns: [
          'ColdCaseSummary_EntPerson_AxonMarkings',
          'CourtDispositionReport_EntPerson_AxonMarkings',
          'Deflection_EntPerson_AxonMarkings',
          'EntPerson_AxonMarkings',
          'FieldInterview_EntPerson_AxonMarkings',
          'Form4C_EntPerson_AxonMarkings',
          'GangMemberEval_EntPerson_AxonMarkings',
          'ImpoundReleaseForm_EntPerson_AxonMarkings',
          'IncidentReport_EntPerson_AxonMarkings',
          'LatestIncidentReport_EntPerson_AxonMarkings',
          'LeadSheet_EntPerson_AxonMarkings',
          'LivescanNameCheck_EntPerson_AxonMarkings',
          'RecordsOnlyTWXForm_EntPerson_AxonMarkings',
          'RunawayJuvenile_EntPerson_AxonMarkings',
          'SexTrafficking_EntPerson_AxonMarkings',
          'SocialMedia_EntPerson_AxonMarkings',
          'SpecialCircumstancesCanvass_EntPerson_AxonMarkings',
          'TRACSCitation_EntPerson_AxonMarkings',
          'TRACSCollision_EntPerson_AxonMarkings',
          'Warrant_EntPerson_AxonMarkings',
          'WarrantSupplement_EntPerson_AxonMarkings',
        ],
        chipNotes: {
          EntPerson_AxonMarkings: 'Tied to the Person entity, not a specific report.',
        },
        footnote:
          'Records.LatestIncidentReport_EntPerson_AxonMarkings only includes markings on the latest incident report version (e.g. if -3 exists, -1 will not appear).',
      },
      {
        title: 'Vehicle',
        intro: 'Same pattern as Person — one Records view per report type or entity context.',
        columns: [
          'CourtDispositionReport_EntVehicle_AxonMarkings',
          'EntVehicle_AxonMarkings',
          'FieldInterview_EntVehicle_AxonMarkings',
          'Form4C_EntVehicle_AxonMarkings',
          'GangMemberEval_EntVehicle_AxonMarkings',
          'ImpoundReleaseForm_EntVehicle_AxonMarkings',
          'IncidentReport_EntVehicle_AxonMarkings',
          'LatestIncidentReport_EntVehicle_AxonMarkings',
          'LeadSheet_EntVehicle_AxonMarkings',
          'RecordsOnlyTWXForm_EntVehicle_AxonMarkings',
          'RunawayJuvenile_EntVehicle_AxonMarkings',
          'SocialMedia_EntVehicle_AxonMarkings',
          'SpecialCircumstancesCanvass_EntVehicle_AxonMarkings',
          'TRACSCitation_EntVehicle_AxonMarkings',
          'TRACSCollision_EntVehicle_AxonMarkings',
          'WarrantSupplement_EntVehicle_AxonMarkings',
        ],
        chipNotes: {
          EntVehicle_AxonMarkings: 'Tied to the Vehicle entity, not a specific report.',
        },
        footnote:
          'Records.LatestIncidentReport_EntVehicle_AxonMarkings follows the same latest-version rule as the Person variant.',
      },
    ],
    notes: [
      'The flat mapping rows in this table show one example V2 target (often Records.IncidentReport_EntPerson_AxonMarkings). Other columns may map to the same field names on a different *_AxonMarkings view when the parent entity or report type differs — use ParentEntityType and report context to choose the correct view from the lists above.',
    ],
  },
  AXON_NARRATIVES: {
    title: 'Incident report narratives in V2',
    summary: [
      'Most mapped V2 fields live on Records.IncidentReport_EntNarrative — one narrative per report revision. Do not use Records.LatestIncidentReport_EntNarrative for this table: that view only reflects the latest report sequence for an incident (e.g. if -3 exists, narratives tied to -1 are omitted).',
      'In V2, narrative body text (AxonContent) is stored as HTML-formatted rich text rather than plain text. When queried directly from the database, the raw HTML markup is returned because it is not automatically rendered or converted to plain text.',
      'If a human-readable narrative is required for reporting, exports, or downstream integrations, the preferred solution is to expose a supported plain-text or rendered-text version of the field at the application or data-model level. If that is not available, the HTML can be converted during extraction, provided the database platform supports an HTML-to-text function.',
    ],
    joinHub: {
      hub: {
        label: 'Records.IncidentReport_EntNarrative',
        hint: 'NarrativeFriendlyId, ReportId, AuthorId, AxonContent, …',
      },
      spokes: [
        {
          id: 'Officer',
          label: 'Records.Officer',
          hint: 'Username',
          connectorText: 'IncidentReport_EntNarrative.AuthorId = Officer.Id',
        },
      ],
    },
    columnNoteOverrides: {
      NARRATIVES: 'See sidebar →',
    },
  },
  AXON_PROPERTYMANAGEMENTS: {
    title: 'PEP property records and storage locations',
    summary:
      'V1 axon.PropertyManagements maps to Records.EntProperty for custody fields (status, retention, notes, author). Home and current storage location names/types come from Records.RefStorageLocation via the Id columns on EntProperty. IncidentNumber and IncidentId are not stored on EntProperty — use the incident-from-report section when you have a ReportFriendlyId from the related incident report.',
    joinHub: {
      hub: {
        label: 'Records.EntProperty',
        hint: 'Id, PropertyFriendlyId, HomeLocationId, CurrentLocationStorageLocationId, …',
      },
      spokes: [
        {
          id: 'RefStorageLocation',
          label: 'Records.RefStorageLocation',
          hint: 'Name, Type, CreatedAt, UpdatedAt, Deleted',
          connectorText:
            'EntProperty.HomeLocationId or CurrentLocationStorageLocationId = RefStorageLocation.Id',
        },
      ],
    },
    notes: [
      'This export has no ReportNumber column. Use ReportFriendlyId from the linked incident report as `<ReportNumber>` in the sidebar SQL when deriving EntIncident.',
    ],
  },
  AXON_REPORTS: {
    title: 'Report type drives the V2 document view',
    summary: [
      'V1 axon.Reports is a single view for all report kinds. V2 splits documents by form: most column mappings in this CSV use Records.IncidentReport because the sample row is GENERAL_OFFENSE (Incident Report). For any other row, use ReportType and ReportTypeName below to pick the correct Records.* view before joining report-scoped fields or ExternalId.',
      'IncidentNumber and IncidentId are not on those document views as a pair — derive them from this row’s ReportNumber (ReportFriendlyId) via EntDocument → RelIncidentDocument → EntIncident, as in the incident section below. Use ReportNumber (e.g. P2606260176-1) as `<ReportNumber>` in the query, not the bare P-number unless it matches that report id.',
    ],
    incidentFromReport: true,
    joinHub: {
      hub: {
        label: 'Records.IncidentReport',
        hint: 'GENERAL_OFFENSE sample — Id, ReportFriendlyId, Axon…',
      },
      spokes: [
        {
          id: 'EntDocument',
          label: 'Records.EntDocument',
          hint: 'ReportFriendlyId',
          connectorText: 'ReportNumber → EntDocument.ReportFriendlyId',
          chain: [
            {
              id: 'RelIncidentDocument',
              label: 'Records.RelIncidentDocument',
              hint: 'document ↔ incident',
              connectorText: 'EntDocument.Id = RelIncidentDocument.ToId',
            },
            {
              id: 'EntIncident',
              label: 'Records.EntIncident',
              hint: 'IncidentFriendlyId, Id',
              connectorText: 'RelIncidentDocument.FromId = EntIncident.Id',
            },
          ],
        },
        {
          id: 'Officer',
          label: 'Records.Officer',
          hint: 'Username',
          connectorText: 'IncidentReport.AuthorId = Officer.Id (author on GO reports)',
        },
      ],
    },
    notes: [
      'Standard ReportType → V2 view:',
      'GENERAL_OFFENSE (ReportTypeName: Incident Report) → Records.IncidentReport',
      'FIELD_INTERVIEW → Records.FieldInterview',
      'NARRATIVE → Records.NarrativeOnly',
      'WARRANT → Records.Warrant',
      'Custom ReportTypeName → V2 view:',
      'ATF Crime Gun → Records.ATFCrimeGun',
      'Cold Case Summary → Records.CaseSummary',
      'Court Disposition Report → Records.CourtDispositionReport',
      'Deflection → Records.Deflection',
      'Detectives Only - Closing Supplement → Records.DetectivesOnlyClosingSupplement',
      'Form 4C → Records.Form4C',
      'Gang Member Eval → Records.GangMemberEval',
      'IFAK Replacement → Records.IFAKReplacement',
      'Livescan - Name Check → Records.LivescanNameCheck',
      'Motor Vehicle Fatalities → Records.MotorVehicleFatalities',
      'Records Only - TWX Form → Records.RecordsOnlyTWXForm',
      'Runaway Juvenile → Records.RunawayJuvenile',
      'Sex Trafficking → Records.SexTrafficking',
      'TRACS Citation → Records.TRACSCitation',
      'TRACS Collision → Records.TRACSCollision',
      'RESTRICTED has no direct V2 column on the document view — restrictions are noted by entries on Records.Restriction.',
    ],
    columnNoteOverrides: {
      REPORTTYPE: 'See sidebar →',
      REPORTTYPENAME: 'See sidebar →',
      EXTERNALID: 'See sidebar →',
      INCIDENTNUMBER: 'See sidebar →',
      INCIDENTID: 'See sidebar →',
      REPORTNUMBER: 'See sidebar →',
    },
  },
  AXON_REJECTEDREPORT_TUCSONPDAZ: {
    title: 'Rejected reports — V1 TaskActions slice vs V2 TaskAction query',
    summary: [
      'The V1 Data Store view axon.RejectedReport_TucsonPdAz was a Tucson-specific subset of dw.TaskActions: backward workflow transitions on draft reports where the user who rejected the report is not the report owner. V1 pulled owner, rejector, and comment text from TaskActions.RawData JSON.',
      'In V2, typed columns on Records.TaskAction replace most JSON_VALUE paths. Records.TaskActionComment holds comment text and often IncidentId; parent report ids and incident number stay on TaskAction so rows still appear when there is no comment. COALESCE(TaskActionComment.IncidentId, EntIncident.Id) matches V1 when the comment row lacks an incident id.',
      'The CROSS APPLY on Records.EntTask_AxonActions picks the embedded backward action (Direction = 2) that best matches the TaskAction row — see the V2 query below. Per-column CSV mappings are simplified; the sidebar queries are the source of truth for filters and joins.',
    ],
    joinHub: {
      hub: {
        label: 'Records.TaskAction',
        hint: 'UserId, LastTransitionedById, ParentId, IncidentNumber, WorkflowStateId',
      },
      spokes: [
        {
          id: 'TaskActionComment',
          label: 'Records.TaskActionComment',
          hint: 'Comments, IncidentId',
          connectorText: 'TaskActionComment.TaskActionId = TaskAction.Id (LEFT JOIN)',
        },
        {
          id: 'EntIncident',
          label: 'Records.EntIncident',
          hint: 'Id, IncidentFriendlyId',
          connectorText:
            'EntIncident.IncidentFriendlyId = TaskAction.IncidentNumber when TaskActionComment.IncidentId IS NULL',
        },
        {
          id: 'EntTask_AxonActions',
          label: 'Records.EntTask_AxonActions',
          hint: 'Direction, OwnerId, StateId, CreatedAt#1',
          connectorText:
            'EntTask_AxonActions.TaskId = TaskAction.TaskId AND Direction = 2 (backward); see V2 CROSS APPLY',
        },
      ],
    },
    sqlExamples: {
      title: 'V1 create script vs V2 equivalent',
      items: [
        {
          title: 'V1 — Tucson subset of dw.TaskActions',
          sql: `SELECT
    ta.IncidentId,
    ta.IncidentNumber,
    ta.Parentid AS ReportId,
    ta.ParentNumber AS ReportNumber,
    JSON_VALUE(ta.rawdata, '$.owner.id') AS ReportAuthorID,
    JSON_VALUE(ta.rawdata, '$.owner.username') AS ReportAuthor,
    JSON_VALUE(ta.rawdata, '$.lastTransitionedBy.id') AS RejectedByID,
    JSON_VALUE(ta.rawdata, '$.lastTransitionedBy.username') AS RejectedBy,
    JSON_VALUE(c.[value], '$.comment') AS Comment,
    TRY_CONVERT(DATETIMEOFFSET, ta.TaskActionCreatedAt)
        AT TIME ZONE 'US Mountain Standard Time' AS TaskActionArizonaTime
FROM dw.TaskActions ta
    OUTER APPLY OPENJSON(RawData, '$.comments') AS c
WHERE JSON_VALUE(ta.rawdata, '$.direction') = 'BACKWARDS'
    AND JSON_VALUE(ta.rawdata, '$.workflowState.type') = 'DRAFT'
    AND JSON_VALUE(ta.rawdata, '$.lastTransitionedBy.username')
        <> JSON_VALUE(ta.rawdata, '$.owner.username');`,
        },
        {
          title: 'V2 — Records.TaskAction equivalent',
          sql: `SELECT
    COALESCE(tac.IncidentId, ei.Id) AS IncidentId,
    ta.IncidentNumber,
    ta.ParentId AS ReportId,
    ta.ParentNumber AS ReportNumber,
    ta.UserId AS ReportAuthorID,
    ta.UserName AS ReportAuthor,
    ta.LastTransitionedById AS RejectedByID,
    ta.LastTransitionedByUserName AS RejectedBy,
    tac.Comments AS Comment,
    CONVERT(
        datetime2,
        ta.TaskActionCreatedAt
            AT TIME ZONE 'UTC'
            AT TIME ZONE 'US Mountain Standard Time'
    ) AS TaskActionArizonaTime
FROM Records.TaskAction ta
CROSS APPLY
(
    SELECT TOP (1)
        etaa.Id AS MatchedActionId,
        etaa.TaskId,
        etaa.Direction,
        etaa.OwnerId,
        etaa.StateId,
        etaa.LastTransitionedById,
        etaa.CreatedAt,
        etaa.CreatedAt#1
    FROM Records.EntTask_AxonActions etaa
    WHERE
        etaa.TaskId = ta.TaskId
        AND etaa.Direction = 2
        AND etaa.LastTransitionedById = ta.LastTransitionedById
        AND etaa.OwnerId = ta.UserId
        AND etaa.StateId = ta.WorkflowStateId
    ORDER BY
        ABS(
            DATEDIFF_BIG(
                millisecond,
                etaa.CreatedAt#1,
                ta.TaskActionCreatedAt
            )
        ),
        etaa.Id
) matched
LEFT JOIN Records.TaskActionComment tac
    ON tac.TaskActionId = ta.Id
LEFT JOIN Records.EntIncident ei
    ON tac.IncidentId IS NULL
   AND ei.IncidentFriendlyId = ta.IncidentNumber
WHERE
    ta.WorkflowStateId = 'DRAFT'
    AND ta.LastTransitionedByUserName <> ta.UserName;`,
        },
      ],
    },
    notes: [
      'V1 filter direction = BACKWARDS maps to EntTask_AxonActions.Direction = 2 in V2 (0 = null/unspecified, 1 = forwards, 2 = backwards).',
      'V1 workflowState.type = DRAFT maps to TaskAction.WorkflowStateId = \'DRAFT\'.',
      'V1 compared lastTransitionedBy.username to owner.username; V2 uses LastTransitionedByUserName <> UserName on TaskAction.',
    ],
    columnNoteOverrides: {
      INCIDENTID: 'See sidebar →',
      INCIDENTNUMBER: 'See sidebar →',
      REPORTID: 'See sidebar →',
      REPORTNUMBER: 'See sidebar →',
      REJECTEDBYID: 'See sidebar →',
      REJECTEDBY: 'See sidebar →',
      COMMENT: 'See sidebar →',
      TASKACTIONARIZONATIME: 'See sidebar →',
    },
  },
  AXON_PROPERTIESRECOVERYDETAILS: {
    title: 'Recovery fields on AxonProperties, friendly id on EntProperty',
    summary:
      'V1 axon.PropertiesRecoveryDetails combines recovery metadata with property identifiers. In V2, recovery note, date, location, and officer fields live on Records.IncidentReport_AxonProperties. PropertyFriendlyId is on Records.IncidentReport_EntProperty — tie the two together with AxonProperties.Property = EntProperty.Id (same link as the Property / PropertyExternalId / ExternalId columns in this mapping).',
    joinHub: {
      hub: {
        label: 'Records.IncidentReport_AxonProperties',
        hint: 'Property, RecoveryDetailsRecoveryDate, RecoveryDetailsNote, …',
      },
      spokes: [
        {
          id: 'EntProperty',
          label: 'Records.IncidentReport_EntProperty',
          hint: 'Id, PropertyFriendlyId',
          connectorText: 'AxonProperties.Property = EntProperty.Id',
        },
      ],
    },
    notes: [
      'RecoveryDate timezone variants (Arizona, Central, Eastern, Mountain, Pacific) exist in V1/Snowflake only; V2 exposes UTC via RecoveryDetailsRecoveryDate on AxonProperties.',
    ],
    columnNoteOverrides: {
      PROPERTYFRIENDLYID: 'See sidebar →',
    },
  },
  AXON_PERSONSENTITYRELATIONS: {
    title: 'Document–person links and canonical EntPerson',
    summary:
      'V1 axon.PersonsEntityRelations rows describe how a person entity relates to a document. In V2, the relationship keys live on Records.RelDocumentPerson (FromId, ToId, RelationId, RelationType). Canonical person identifiers on this table resolve through RelDocumentPerson.ToId joined to Records.EntPerson.',
    joinHub: {
      hub: {
        label: 'Records.RelDocumentPerson',
        hint: 'FromId, ToId, RelationId, RelationType',
      },
      spokes: [
        {
          id: 'EntPerson',
          label: 'Records.EntPerson',
          hint: 'Id, PersonFriendlyId',
          connectorText: 'RelDocumentPerson.ToId = EntPerson.Id',
        },
      ],
    },
    notes: [
      'CanonicalExternalId and CanonicalPersonNumber map to Records.EntPerson (Id and PersonFriendlyId). FromExternalId and ToExternalId map to FromId and ToId on RelDocumentPerson.',
    ],
  },
  AXON_PERSONS: {
    title: 'Canonical vs transactional person records',
    summary:
      'Most descriptive fields on this table map to Records.IncidentReport_EntPerson for the person as captured on that incident report. When Axon links a transactional person to a canonical (deduplicated) person, that relationship is modeled in Records.RelCanonicalDuplicate — not as extra columns on the same EntPerson row.',
    diagram: {
      nodes: [
        {
          id: 'CanonicalEntPerson',
          label: 'Records.IncidentReport_EntPerson (canonical)',
          hint: 'Id, PersonFriendlyId',
          connectorType: 'join',
          connectorText: 'RelCanonicalDuplicate.FromId = canonical EntPerson.Id',
        },
        {
          id: 'RelCanonicalDuplicate',
          label: 'Records.RelCanonicalDuplicate',
          hint: 'FromId, ToId',
          connectorType: 'join',
          connectorText: 'RelCanonicalDuplicate.ToId = transactional EntPerson.Id',
        },
        {
          id: 'TransactionalEntPerson',
          label: 'Records.IncidentReport_EntPerson (transactional)',
          hint: 'Id, PersonFriendlyId, AxonLastName, …',
        },
      ],
    },
    notes: [
      'CanonicalExternalId and CanonicalPersonNumber (marked * in the mapping) refer to the canonical side of the link. PersonExternalId maps to RelCanonicalDuplicate.ToId; the canonical person’s Id is FromId.',
    ],
    columnNoteOverrides: {
      CANONICALEXTERNALID: 'See sidebar →',
      CANONICALPERSONNUMBER: 'See sidebar →',
      PERSONEXTERNALID: 'See sidebar →',
    },
  },
  AXON_PERSONALIASES: {
    title: 'PersonId vs PersonFriendlyId',
    summary:
      'V1/Snowflake PersonId (numeric Axon person identifier on axon.PersonAliases) has no direct column on Records.IncidentReport_EntPerson_AxonAliases. In V2, the human-facing person key is PersonFriendlyId on the Person entity (for example PER220110328), which you can reach through Records.IncidentReport_EntPerson and related EntPerson views — not as a field on the alias row itself.',
    columnNoteOverrides: {
      PERSONID: 'See sidebar →',
    },
  },
  AXON_OFFENSES: {
    title: 'Offense rows pull from several V2 views',
    summary:
      'V1 axon.Offenses flattened offense, charge, location, and incident-report fields into one Snowflake row. In V2 those values are split across Records.IncidentReport_EntOffense (core offense identity and NIBRS flags), Records.IncidentReport_AxonOffenses (UCR/severity), Records.IncidentReport_EntCharge (charge description), Records.IncidentReport_EntLocation (address/geo), and Records.IncidentReport (incident-level dates, clearance, domestic-violence flag, location type/note).',
    joinHub: {
      hub: {
        label: 'Records.IncidentReport_EntOffense',
        hint: 'Id, ReportFriendlyId, AxonCompletion, AxonNibrsUcrCode, …',
      },
      spokes: [
        {
          id: 'AxonOffenses',
          label: 'Records.IncidentReport_AxonOffenses',
          hint: 'AxonUcr, AxonSeverity',
          connectorText: 'Linked to the same offense entity as EntOffense',
        },
        {
          id: 'EntCharge',
          label: 'Records.IncidentReport_EntCharge',
          hint: 'AxonShortDescription',
          connectorText: 'Offense-to-charge relationship (see OffenseRawData OffenseToCharge in V1)',
        },
        {
          id: 'EntLocation',
          label: 'Records.IncidentReport_EntLocation',
          hint: 'AxonLat, AxonLon, AxonStreetName, …',
          connectorText:
            'Attach to the parent report with both ReportId and Id on Records.IncidentReport — not ReportId alone',
        },
        {
          id: 'IncidentReport',
          label: 'Records.IncidentReport',
          hint: 'AxonIncidentFromDate, AxonClearedExceptionally, AxonDomesticViolenceFlag, …',
          connectorText: 'ReportFriendlyId / report keys shared with EntOffense',
        },
      ],
    },
    notes: [
      'Timezone-specific Occurred* columns exist in V1/Snowflake only; V2 exposes UTC incident dates on Records.IncidentReport.',
    ],
  },
  AXON_NARRATIVEONLY: {
    title: 'V2 narrative is HTML rich text',
    summary: [
      'In V2, the narrative is stored as HTML-formatted rich text rather than plain text. When queried directly from the database, the raw HTML markup is returned because it is not automatically rendered or converted to plain text.',
      'If a human-readable narrative is required for reporting, exports, or downstream integrations, the preferred solution is to expose a supported plain-text or rendered-text version of the field at the application or data-model level. If that is not available, the HTML can be converted during extraction, provided the database platform supports an HTML-to-text function.',
    ],
    columnNoteOverrides: {
      FORMNARRATIVE: 'See sidebar →',
    },
  },
  AXON_MOSTRECENTGENERALOFFENSE: {
    title: 'Latest incident report + related V2 views',
    summary:
      'V1 axon.MostRecentGeneralOffense surfaces one row per incident’s latest general-offense report. Most V2 columns live on Records.LatestIncidentReport (only the newest report revision for that incident — older sequence numbers such as -1 do not appear when a newer version exists). Author username comes from Records.Officer; cleared-exceptionally comes from Records.EntIncident.',
    joinHub: {
      hub: {
        label: 'Records.LatestIncidentReport',
        hint: 'ReportFriendlyId, IncidentFriendlyId, AuthorId, AxonPurpose, …',
      },
      spokes: [
        {
          id: 'Officer',
          label: 'Records.Officer',
          hint: 'Username',
          connectorText: 'LatestIncidentReport.AuthorId = Officer.Id',
        },
        {
          id: 'EntIncident',
          label: 'Records.EntIncident',
          hint: 'AxonClearedExceptionally',
          connectorText: 'LatestIncidentReport.IncidentId = EntIncident.Id',
        },
      ],
    },
    notes: [
      'Timezone-specific CreatedAt and Occurred* columns (Arizona, Central, Eastern, Mountain, Pacific) exist in V1/Snowflake only — V2 exposes the UTC fields on LatestIncidentReport.',
      'ISDRAFT and ReportDateIndicator use boolean strings in V1 (TRUE/FALSE) but 0/1 in V2 (IsDraft, AxonReportDateIndicator).',
      'RESTRICTED has no direct V2 column on the document view — restrictions are noted by entries on Records.Restriction.',
    ],
  },
  AXON_METHODOFTRANSPORTATION_TUCSONPDAZ: {
    title: 'How the V2 views relate',
    summary:
      'Most identifiers for this table live on Records.IncidentReport_AxonParties_MethodofTransportation. Person involvement comes from Records.IncidentReport_RelPersonToOffense, and the aggregated method-of-transportation list can also be read from Records.IncidentReport_AxonParties.',
    diagram: {
      nodes: [
        {
          id: 'MethodofTransportation',
          label: 'Records.IncidentReport_AxonParties_MethodofTransportation',
          hint: 'ReportFriendlyId, ParentId',
          connectorType: 'join',
          connectorText:
            'MethodofTransportation.ReportFriendlyId = RelPersonToOffense.ReportFriendlyId AND MethodofTransportation.ParentId = RelPersonToOffense.IncidentReport_FromEntPersonId',
        },
        {
          id: 'RelPersonToOffense',
          label: 'Records.IncidentReport_RelPersonToOffense',
          hint: 'AxonInvolvement',
          connectorType: 'join',
          connectorText:
            'Same report + person keys tie back to Records.IncidentReport_AxonParties for MethodofTransportationList',
        },
        {
          id: 'AxonParties',
          label: 'Records.IncidentReport_AxonParties',
          hint: 'MethodofTransportationList',
        },
      ],
    },
    notes: [
      'METHODOFTRANSPORTATION in this mapping targets MethodofTransportationList on Records.IncidentReport_AxonParties. The same values can also appear as individual rows on Records.IncidentReport_AxonParties_MethodofTransportation.',
    ],
  },
}
