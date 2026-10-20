import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import MappingRow from './MappingRow'

const MIN_ZOOM = 0.35
const MAX_ZOOM = 2
const ZOOM_STEP = 0.15
const DEFAULT_TRANSFORM = { x: 56, y: 32, scale: 1 }

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

const SORT_OPTIONS = [
  { id: 'default', label: 'Default' },
  { id: 'asc', label: 'A → Z' },
  { id: 'desc', label: 'Z → A' },
]

function MappingCanvas({ table, columns, status, sortOrder, onSortChange, focusRequest }) {
  const viewportRef = useRef(null)
  const rowRefs = useRef({})
  const leftZoneRefs = useRef({})
  const rightZoneRefs = useRef({})
  const [transform, setTransform] = useState(DEFAULT_TRANSFORM)
  const [isPanning, setIsPanning] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [rowWidth, setRowWidth] = useState(null)

  // Reset the view whenever the table changes so a new table always starts
  // from a predictable, fully-visible-from-the-top position.
  useEffect(() => {
    setTransform(DEFAULT_TRANSFORM)
  }, [table?.id])

  // Every row needs the SAME total width for the V1/V2 zones to center the
  // Snowflake column consistently (two equal-width flex zones either side
  // of it) without stretching any individual box. Measure each row's own
  // natural (unconstrained) zone/Snowflake widths — using offsetWidth so
  // pan/zoom's CSS transform doesn't skew the numbers — and take the widest
  // needs across all rows as the shared width every row should use.
  useLayoutEffect(() => {
    setRowWidth(null)
  }, [table?.id, columns])

  useLayoutEffect(() => {
    if (rowWidth !== null) return
    if (!columns.length) return

    let maxZone = 0
    let maxSnowflake = 0
    columns.forEach((column) => {
      const left = leftZoneRefs.current[column.id]
      const right = rightZoneRefs.current[column.id]
      const sf = rowRefs.current[column.id]
      if (left) maxZone = Math.max(maxZone, left.offsetWidth)
      if (right) maxZone = Math.max(maxZone, right.offsetWidth)
      if (sf) maxSnowflake = Math.max(maxSnowflake, sf.offsetWidth)
    })

    if (maxZone > 0 && maxSnowflake > 0) {
      setRowWidth(maxZone * 2 + maxSnowflake)
    }
  }, [columns, rowWidth])

  const zoomBy = useCallback((clientX, clientY, factor) => {
    const viewportEl = viewportRef.current
    if (!viewportEl) return
    const rect = viewportEl.getBoundingClientRect()
    const originX = clientX - rect.left
    const originY = clientY - rect.top

    setTransform((prev) => {
      const nextScale = clamp(prev.scale * factor, MIN_ZOOM, MAX_ZOOM)
      const ratio = nextScale / prev.scale
      return {
        scale: nextScale,
        x: originX - (originX - prev.x) * ratio,
        y: originY - (originY - prev.y) * ratio,
      }
    })
  }, [])

  const setZoomAtCenter = useCallback(
    (nextScale) => {
      const viewportEl = viewportRef.current
      const rect = viewportEl?.getBoundingClientRect()
      const centerX = rect ? rect.left + rect.width / 2 : 0
      const centerY = rect ? rect.top + rect.height / 2 : 0
      const originX = centerX - (rect?.left ?? 0)
      const originY = centerY - (rect?.top ?? 0)

      setTransform((prev) => {
        const scale = clamp(nextScale, MIN_ZOOM, MAX_ZOOM)
        const ratio = scale / prev.scale
        return {
          scale,
          x: originX - (originX - prev.x) * ratio,
          y: originY - (originY - prev.y) * ratio,
        }
      })
    },
    []
  )

  // Wheel handling. Attached as a native listener (not React's onWheel) so
  // preventDefault reliably stops page/pane scrolling. Ctrl/Cmd+scroll (and
  // trackpad pinch gestures, which browsers report the same way) zooms;
  // plain scrolling pans instead, with both axes following the wheel so
  // horizontal scroll (e.g. a trackpad or shift+wheel) pans left/right.
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return undefined

    function handleWheel(event) {
      event.preventDefault()

      if (event.ctrlKey || event.metaKey) {
        const factor = Math.exp(-event.deltaY * 0.0015)
        zoomBy(event.clientX, event.clientY, factor)
        return
      }

      setTransform((prev) => ({
        ...prev,
        x: prev.x - event.deltaX,
        y: prev.y - event.deltaY,
      }))
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [zoomBy, table?.id, status])

  // Click-and-drag panning. Window-level listeners so dragging keeps working
  // even if the cursor leaves the viewport mid-drag.
  function handleMouseDown(event) {
    if (event.button !== 0) return
    if (event.target.closest('button, input, a, [data-no-pan]')) return
    event.preventDefault()

    const start = {
      startX: event.clientX,
      startY: event.clientY,
      originX: transform.x,
      originY: transform.y,
    }
    setIsPanning(true)

    function handleMove(moveEvent) {
      setTransform((prev) => ({
        ...prev,
        x: start.originX + (moveEvent.clientX - start.startX),
        y: start.originY + (moveEvent.clientY - start.startY),
      }))
    }

    function handleUp() {
      setIsPanning(false)
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }

  // Pan (with a smooth animated transition) so the requested column's row is
  // centered in the viewport at 100% zoom, whenever the sidebar list
  // requests a jump — resetting zoom guards against being too far
  // zoomed in/out to actually see the row land in view.
  useEffect(() => {
    if (!focusRequest?.id) return undefined
    const rowEl = rowRefs.current[focusRequest.id]
    const viewportEl = viewportRef.current
    if (!rowEl || !viewportEl) return undefined

    const rowRect = rowEl.getBoundingClientRect()
    const viewportRect = viewportEl.getBoundingClientRect()

    setIsAnimating(true)
    setTransform((prev) => {
      // Convert the row's current on-screen center back into untransformed
      // canvas-content coordinates, then re-center on it at scale 1.
      const localCenterX = (rowRect.left + rowRect.width / 2 - viewportRect.left - prev.x) / prev.scale
      const localCenterY = (rowRect.top + rowRect.height / 2 - viewportRect.top - prev.y) / prev.scale

      return {
        scale: 1,
        x: viewportRect.width / 2 - localCenterX,
        y: viewportRect.height / 2 - localCenterY,
      }
    })

    const timeout = setTimeout(() => setIsAnimating(false), 350)
    return () => clearTimeout(timeout)
  }, [focusRequest])

  if (!table) {
    return (
      <section className="mapping-canvas is-empty">
        <div className="empty-state">
          <span className="empty-state-icon" aria-hidden="true">
            ⇄
          </span>
          <p>Choose a table from the left to see its column mappings.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="mapping-canvas">
      <header className="canvas-toolbar">
        <div className="canvas-toolbar-title">
          <p className="canvas-eyebrow">Column mappings</p>
          <h2>{table.name}</h2>
        </div>
        <div className="sort-controls" role="group" aria-label="Sort columns">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={sortOrder === option.id ? 'active' : ''}
              onClick={() => onSortChange(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      {status === 'loading' && <p className="empty-hint">Loading columns...</p>}
      {status === 'error' && <p className="empty-hint error">Failed to load this table&apos;s data.</p>}

      {status === 'success' && (
        <div
          className={`canvas-viewport${isPanning ? ' is-panning' : ''}`}
          ref={viewportRef}
          onMouseDown={handleMouseDown}
        >
          <div
            className={`canvas-content${isAnimating ? ' animated' : ''}`}
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            }}
          >
            {columns.map((column) => (
              <MappingRow
                key={column.id}
                column={column}
                isFocused={column.id === focusRequest?.id}
                rowWidth={rowWidth}
                registerRef={(el) => {
                  if (el) rowRefs.current[column.id] = el
                  else delete rowRefs.current[column.id]
                }}
                registerLeftZoneRef={(el) => {
                  if (el) leftZoneRefs.current[column.id] = el
                  else delete leftZoneRefs.current[column.id]
                }}
                registerRightZoneRef={(el) => {
                  if (el) rightZoneRefs.current[column.id] = el
                  else delete rightZoneRefs.current[column.id]
                }}
              />
            ))}
          </div>

          <div className="zoom-bar" data-no-pan>
            <button
              type="button"
              onClick={() => setZoomAtCenter(transform.scale - ZOOM_STEP)}
              aria-label="Zoom out"
            >
              −
            </button>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.05}
              value={transform.scale}
              onChange={(event) => setZoomAtCenter(Number(event.target.value))}
              aria-label="Zoom level"
            />
            <button
              type="button"
              onClick={() => setZoomAtCenter(transform.scale + ZOOM_STEP)}
              aria-label="Zoom in"
            >
              +
            </button>
            <span className="zoom-level">{Math.round(transform.scale * 100)}%</span>
          </div>
        </div>
      )}
    </section>
  )
}

export default MappingCanvas
