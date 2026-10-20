import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(null)

let nextToastId = 0

// Lightweight, non-blocking toast notifications (e.g. "Copied to clipboard").
// Toasts stack, auto-dismiss on their own, and never require user action.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const showToast = useCallback((message, duration = 2000) => {
    const id = ++nextToastId
    setToasts((prev) => [...prev, { id, message }])
    timers.current[id] = setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
      delete timers.current[id]
    }, duration)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}
