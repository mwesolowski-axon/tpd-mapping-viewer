// Renders a "hub and spoke" join: one central view/table that several other
// views each join to directly (rather than a chain where each view joins
// the next). The hub is rendered once at the top; each spoke branches off
// it below, connected by its own join condition, with a dashed guide line
// grouping all the spokes under the shared hub.
//
// A spoke can optionally continue through its own short `chain` of further
// hops (e.g. hub -> bridge view -> final view) when that particular link
// isn't a direct join to the hub. Driven entirely by data — see
// src/data/tableInfo.js — so it can illustrate any table's hub-shaped
// lineage, not just one specific table.
function JoinConnector({ text }) {
  return (
    <div className="join-connector join-connector-join join-hub-connector">
      <svg viewBox="0 0 24 36" className="join-connector-line" aria-hidden="true">
        <line x1="12" y1="0" x2="12" y2="26" />
        <path d="M5 20 L12 28 L19 20" fill="none" />
      </svg>
      <div className="join-connector-label">
        <code>{text}</code>
      </div>
    </div>
  )
}

function JoinHubDiagram({ hub, spokes }) {
  if (!hub || !spokes?.length) return null

  return (
    <div className="join-hub-diagram">
      <div className="join-node join-hub-node">
        <div className="join-node-label">{hub.label}</div>
        {hub.hint && <div className="join-node-hint">{hub.hint}</div>}
      </div>

      <div className="join-hub-spokes">
        {spokes.map((spoke) => {
          const chainNodes = [spoke, ...(spoke.chain ?? [])]

          return (
            <div className="join-hub-spoke" key={spoke.id}>
              {chainNodes.map((node) => (
                <div className="join-hub-chain-node" key={node.id}>
                  <JoinConnector text={node.connectorText} />
                  <div className="join-node">
                    <div className="join-node-label">{node.label}</div>
                    {node.hint && <div className="join-node-hint">{node.hint}</div>}
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default JoinHubDiagram
