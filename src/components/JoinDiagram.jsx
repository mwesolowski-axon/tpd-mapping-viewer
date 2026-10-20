// Renders a vertical chain of view/table nodes connected top-to-bottom by
// either a solid "join" connector (labeled with the actual ON condition) or
// a dashed "derived" connector (labeled with a plain-English explanation of
// an inferred, non-joined relationship). Driven entirely by data — see
// src/data/tableInfo.js — so the same component can illustrate any table's
// multi-view lineage, not just this one.
function JoinDiagram({ nodes }) {
  if (!nodes?.length) return null

  return (
    <div className="join-diagram">
      {nodes.map((node, index) => {
        const isLast = index === nodes.length - 1
        return (
          <div className="join-diagram-item" key={node.id}>
            <div className={`join-node${node.derived ? ' derived' : ''}`}>
              <div className="join-node-label">{node.label}</div>
              {node.hint && <div className="join-node-hint">{node.hint}</div>}
            </div>

            {!isLast && (
              <div className={`join-connector join-connector-${node.connectorType}`}>
                <svg viewBox="0 0 24 36" className="join-connector-line" aria-hidden="true">
                  <line x1="12" y1="0" x2="12" y2="26" />
                  <path d="M5 20 L12 28 L19 20" fill="none" />
                </svg>
                <div className="join-connector-label">
                  {node.connectorType === 'join' ? (
                    <code>{node.connectorText}</code>
                  ) : (
                    <span>{node.connectorText}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default JoinDiagram
