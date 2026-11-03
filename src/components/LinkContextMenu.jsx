import { useEffect } from 'react'
import { createPortal } from 'react-dom'

function LinkContextMenu({ menu, onClose, onCopy }) {
  useEffect(() => {
    if (!menu) return undefined

    function handleDismiss(event) {
      if (event.target.closest?.('.link-context-menu')) return
      onClose()
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('pointerdown', handleDismiss, true)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleDismiss, true)
    window.addEventListener('resize', handleDismiss)

    return () => {
      window.removeEventListener('pointerdown', handleDismiss, true)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleDismiss, true)
      window.removeEventListener('resize', handleDismiss)
    }
  }, [menu, onClose])

  if (!menu) return null

  return createPortal(
    <div
      className="link-context-menu"
      style={{ top: menu.y, left: menu.x }}
      role="menu"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        role="menuitem"
        className="link-context-menu-item"
        onClick={() => onCopy(menu.href)}
      >
        Copy link
      </button>
    </div>,
    document.body,
  )
}

export default LinkContextMenu
