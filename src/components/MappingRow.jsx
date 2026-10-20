import NotesTooltip from './NotesTooltip'
import CopyButton from './CopyButton'

function SideNode({ variant, label, column, connected }) {
  const emptyLabel = variant === 'v1' ? 'No V1 mapping' : 'No V2 mapping'

  return (
    <div className={`mapping-node ${variant}${connected ? '' : ' empty'}`}>
      {connected ? (
        <>
          <div className="node-eyebrow">{label}</div>
          <div className="node-title-row">
            <div className="node-title">{column}</div>
            <CopyButton value={column} label={`${variant.toUpperCase()} column name`} />
          </div>
        </>
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

function MappingRow({ column, isFocused, registerRef, registerLeftZoneRef, registerRightZoneRef, rowWidth }) {
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

  return (
    <div
      className={`mapping-row${isFocused ? ' focused' : ''}`}
      data-column-id={column.id}
      style={rowWidth ? { width: `${rowWidth}px` } : undefined}
    >
      <div className="row-zone row-zone-left" ref={registerLeftZoneRef}>
        <SideNode variant="v1" label={v1Schema || 'V1'} column={v1Column} connected={hasV1} />
        <Connector connected={hasV1} />
      </div>

      <NotesTooltip text={notes} className="mapping-node snowflake" registerRef={registerRef}>
        <div className="node-eyebrow">Snowflake Column</div>
        <div className="node-title-row">
          <div className="node-title">{snowflakeColumn}</div>
          <CopyButton value={snowflakeColumn} label="Snowflake column name" />
        </div>
        {exampleData && (
          <div className="node-example">
            <span className="example-label">Example data</span>
            <code>{exampleData}</code>
          </div>
        )}
        {notes && (
          <span className="note-indicator" aria-hidden="true">
            i
          </span>
        )}
      </NotesTooltip>

      <div className="row-zone row-zone-right" ref={registerRightZoneRef}>
        <Connector connected={hasV2} />
        <SideNode variant="v2" label={v2Schema || 'V2'} column={v2Column} connected={hasV2} />
      </div>
    </div>
  )
}

export default MappingRow
