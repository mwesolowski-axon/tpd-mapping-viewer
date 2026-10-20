import { useToast } from '../context/ToastContext'

// Small icon button that copies a field name to the clipboard and shows a
// quick, non-blocking toast. Stops propagation so it never triggers row
// navigation or starts a canvas pan/drag underneath it.
function CopyButton({ value, label }) {
  const { showToast } = useToast()

  async function handleClick(event) {
    event.stopPropagation()
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      showToast(`Copied "${value}"`)
    } catch {
      showToast('Could not copy — clipboard unavailable')
    }
  }

  return (
    <button
      type="button"
      className="copy-button"
      onClick={handleClick}
      onMouseDown={(event) => event.stopPropagation()}
      aria-label={label ? `Copy ${label}` : 'Copy to clipboard'}
      title="Copy to clipboard"
    >
      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
        <rect x="6" y="6" width="8" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M4 10H2.75A0.75 0.75 0 0 1 2 9.25v-6.5A0.75 0.75 0 0 1 2.75 2h6.5a0.75 0.75 0 0 1 0.75 0.75V4" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    </button>
  )
}

export default CopyButton
