import { useEffect, useMemo, useState } from 'react'
import { computeMappingProgress } from '../utils/mappingProgress'

const DETAILS_STORAGE_KEY = 'mapping-viewer.progressDetailsExpanded'

function ProgressTrack({ percent, variant = 'overall' }) {
  const clamped = Math.min(100, Math.max(0, percent))
  return (
    <div className={`mapping-progress-track mapping-progress-track--${variant}`} aria-hidden>
      <div className="mapping-progress-fill" style={{ width: `${clamped}%` }} />
    </div>
  )
}

function ProgressRow({ label, summary, variant = 'sub' }) {
  return (
    <div className={`mapping-progress-row mapping-progress-row--${variant}`}>
      <div className="mapping-progress-row-head">
        <span className="mapping-progress-label">{label}</span>
        <span className="mapping-progress-stats">
          {summary.done}/{summary.total} · {summary.percent}%
        </span>
      </div>
      <ProgressTrack percent={summary.percent} variant={variant} />
    </div>
  )
}

function MappingProgressBar({ tables, tablesStatus }) {
  const [detailsOpen, setDetailsOpen] = useState(() => {
    try {
      const stored = localStorage.getItem(DETAILS_STORAGE_KEY)
      if (stored === null) return true
      return stored === 'true'
    } catch {
      return true
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(DETAILS_STORAGE_KEY, String(detailsOpen))
    } catch {
      /* ignore */
    }
  }, [detailsOpen])

  const progress = useMemo(
    () => computeMappingProgress(tables.map((t) => t.id)),
    [tables],
  )

  const { overall } = progress
  const loading = tablesStatus === 'loading' || tablesStatus === 'idle'

  return (
    <aside className="mapping-progress" aria-label="Completion progress">
      <div className="mapping-progress-header">
        <span className="mapping-progress-title">Completion Progress</span>
        <button
          type="button"
          className="mapping-progress-toggle"
          onClick={() => setDetailsOpen((open) => !open)}
          aria-expanded={detailsOpen}
          aria-controls="mapping-progress-details"
        >
          {detailsOpen ? (
            <>
              Collapse
              <span className="mapping-progress-chevron" aria-hidden>
                ▲
              </span>
            </>
          ) : (
            <>
              Expand
              <span className="mapping-progress-chevron" aria-hidden>
                ▼
              </span>
            </>
          )}
        </button>
      </div>

      <ProgressRow label="All views" summary={overall} variant="overall" />

      {detailsOpen && (
        <div id="mapping-progress-details" className="mapping-progress-details">
          <ProgressRow label="AXON" summary={progress.axon} />
          <ProgressRow label="DT" summary={progress.dt} />
          <ProgressRow label="DW" summary={progress.dw} />
        </div>
      )}

      {loading && (
        <span className="mapping-progress-loading">Updating…</span>
      )}
    </aside>
  )
}

export default MappingProgressBar
