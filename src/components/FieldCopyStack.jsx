import CopyButton from './CopyButton'
import { qualifiedSchemaColumn } from '../utils/mapping'

// Default copy affordances for schema/view + column mapping nodes (V1, V2,
// and Snowflake). V1/V2 reuse node-eyebrow + node-title styling from the
// original cards; Snowflake keeps node-title for the column name.
function FieldCopyStack({
  variantLabel,
  schema,
  column,
  exampleData,
  tableName,
  snowflakeMode = false,
}) {
  const qualified = snowflakeMode
    ? tableName && column
      ? `${tableName}.${column}`
      : column
    : qualifiedSchemaColumn(schema, column)

  const hasSchema = Boolean(schema)
  const hasColumn = Boolean(column)
  const hasExample = Boolean(exampleData) && snowflakeMode

  if (!hasSchema && !hasColumn && !hasExample && !qualified) return null

  return (
    <>
      {qualified && (
        <div className="field-copy-top-right" data-no-pan>
          <CopyButton
            value={qualified}
            label={`Copy full ${variantLabel} field (${qualified})`}
            title={`Copy ${qualified}`}
          />
        </div>
      )}

      <div className="field-copy-stack">
        {snowflakeMode ? (
          hasColumn && (
            <div className="node-title-row field-copy-row">
              <div className="node-title">{column}</div>
              <CopyButton value={column} label={`Copy ${variantLabel} column`} title={`Copy ${column}`} />
            </div>
          )
        ) : (
          <>
            {hasSchema ? (
              <div className="node-title-row field-copy-row field-copy-schema-row">
                <span className="node-eyebrow">{schema}</span>
                <CopyButton
                  value={schema}
                  label={`Copy ${variantLabel} schema/view`}
                  title={`Copy ${schema}`}
                />
              </div>
            ) : (
              <div className="node-eyebrow">{variantLabel}</div>
            )}

            {hasColumn && (
              <div className="node-title-row field-copy-row">
                <div className="node-title">{column}</div>
                <CopyButton value={column} label={`Copy ${variantLabel} column`} title={`Copy ${column}`} />
              </div>
            )}
          </>
        )}

        {hasExample && (
          <div className="node-example">
            <span className="example-label">Example data</span>
            <code>{exampleData}</code>
          </div>
        )}
      </div>
    </>
  )
}

export default FieldCopyStack
