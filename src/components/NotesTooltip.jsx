import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const VIEWPORT_MARGIN = 12
const TOOLTIP_MAX_WIDTH = 340

// Wraps children with a hover/focus-triggered tooltip that is positioned via
// JS (rendered in a portal, position: fixed) and clamped so it always stays
// fully within the viewport, flipping above/below and sliding horizontally
// as needed instead of being cut off at the screen edge.
function NotesTooltip({ text, children, className = '', registerRef }) {
  const anchorRef = useRef(null)
  const [placement, setPlacement] = useState(null)

  function setRefs(el) {
    anchorRef.current = el
    if (registerRef) registerRef(el)
  }

  function updatePlacement() {
    const anchor = anchorRef.current
    if (!anchor || !text) return

    const rect = anchor.getBoundingClientRect()
    const width = Math.min(TOOLTIP_MAX_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2)

    let left = rect.left + rect.width / 2
    const minLeft = VIEWPORT_MARGIN + width / 2
    const maxLeft = window.innerWidth - VIEWPORT_MARGIN - width / 2
    left = Math.min(Math.max(left, minLeft), maxLeft)

    const spaceAbove = rect.top
    const estimatedTooltipHeight = 140
    const showAbove = spaceAbove >= estimatedTooltipHeight + VIEWPORT_MARGIN

    const top = showAbove ? rect.top - VIEWPORT_MARGIN : rect.bottom + VIEWPORT_MARGIN

    // Offset of the arrow from the tooltip box's left edge, so it still
    // points at the anchor even when the box itself gets slid sideways to
    // stay on-screen. Clamped so the arrow never pokes outside the box.
    const boxLeftEdge = left - width / 2
    const anchorCenterX = rect.left + rect.width / 2
    const arrowLeft = Math.min(Math.max(anchorCenterX - boxLeftEdge, 16), width - 16)

    setPlacement({
      left,
      top,
      width,
      vertical: showAbove ? 'top' : 'bottom',
      arrowLeft,
    })
  }

  function hide() {
    setPlacement(null)
  }

  if (!text) {
    return (
      <div ref={setRefs} className={className}>
        {children}
      </div>
    )
  }

  return (
    <div
      ref={setRefs}
      className={`${className} has-tooltip`}
      tabIndex={0}
      onMouseEnter={updatePlacement}
      onMouseLeave={hide}
      onFocus={updatePlacement}
      onBlur={hide}
    >
      {children}
      {placement &&
        createPortal(
          <div
            className={`notes-tooltip notes-tooltip-${placement.vertical}`}
            role="tooltip"
            style={{
              left: placement.left,
              top: placement.top,
              width: placement.width,
              transform: `translate(-50%, ${placement.vertical === 'top' ? '-100%' : '0'})`,
            }}
          >
            <span className="notes-tooltip-arrow" style={{ left: placement.arrowLeft }} />
            {text}
          </div>,
          document.body
        )}
    </div>
  )
}

export default NotesTooltip
