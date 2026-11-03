import NotesTooltip from './NotesTooltip'
import FieldCopyStack from './FieldCopyStack'

function SideNode({ variant, schema, column, connected, onContextMenu }) {
  const emptyLabel = variant === 'v1' ? 'No V1 mapping' : 'No V2 mapping'
  const variantLabel = variant === 'v1' ? 'V1' : 'V2'

  return (
    <div
      className={`mapping-node ${variant}${connected ? '' : ' empty'}`}
      onContextMenu={onContextMenu}
    >
      {connected ? (
        <FieldCopyStack variantLabel={variantLabel} schema={schema} column={column} />
      ) : (
        <div className="node-empty-label">{emptyLabel}</div>
      )}
    </div>
  )
}

function Connector({ connected }) {
  return (
    <div className={`connector${connected ? ' connected' : ' disconnected'}`} aria-hidden="true">
      <svg viewBox="0 0 100 40" preserveAspectRatio="none">
        <line x1="0" y1="20" x2="100" y2="20" />
      </svg>
    </div>
  )
}

function MappingRow({
  table,
  column,
  isFocused,
  registerRef,
  registerLeftZoneRef,
  registerRightZoneRef,
  rowWidth,
  onLinkContextMenu,
}) {
  const {
    snowflakeColumn,
    exampleData,
    v1Schema,
    v1Column,
    v2Schema,
    v2Column,
    notes,
    hasV1,
    hasV2,
  } = column

  const isSnowflakeSpecific = column.isSnowflakeSpecific
  const onRowLinkMenu =
    onLinkContextMenu && table
      ? (event) => onLinkContextMenu(event, table.id, column.id)
      : undefined

  return (
    <div
      className={`mapping-row${isFocused ? ' focused' : ''}${isSnowflakeSpecific ? ' is-snowflake-specific' : ''}`}
      data-column-id={column.id}
      style={rowWidth ? { width: `${rowWidth}px` } : undefined}
      onContextMenu={onRowLinkMenu}
    >
      <div className="row-zone row-zone-left" ref={registerLeftZoneRef}>
        <SideNode
          variant="v1"
          schema={v1Schema}
          column={v1Column}
          connected={hasV1}
          onContextMenu={onRowLinkMenu}
        />
        <Connector connected={hasV1} />
      </div>

      <NotesTooltip
        text={notes}
        className={`mapping-node snowflake${isSnowflakeSpecific ? ' snowflake-meta' : ''}${notes ? ' has-note' : ''}`}
        registerRef={registerRef}
        onContextMenu={onRowLinkMenu}
      >
        <div className="node-eyebrow">
          {isSnowflakeSpecific ? 'Snowflake metadata' : 'Snowflake Column'}
        </div>
        <FieldCopyStack
          variantLabel="Snowflake"
          column={snowflakeColumn}
          exampleData={exampleData}
          tableName={table?.name}
          snowflakeMode
        />
        {notes && (
          <span className="note-indicator" aria-hidden="true">
            i
          </span>
        )}
      </NotesTooltip>

      <div className="row-zone row-zone-right" ref={registerRightZoneRef}>
        <Connector connected={hasV2} />
        <SideNode
          variant="v2"
          schema={v2Schema}
          column={v2Column}
          connected={hasV2}
          onContextMenu={onRowLinkMenu}
        />
      </div>
    </div>
  )
}

export default MappingRow
