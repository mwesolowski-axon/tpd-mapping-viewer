import { useEffect, useState } from 'react'

const MANIFEST_URL = `${import.meta.env.BASE_URL}data/manifest.json`

// Loads the table registry that drives the sidebar. Adding a new table later
// is just: drop a CSV in public/data/ and add one entry to manifest.json.
export function useManifest() {
  const [tables, setTables] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')

    fetch(MANIFEST_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load manifest (${res.status})`)
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        setTables(Array.isArray(data.tables) ? data.tables : [])
        setStatus('success')
      })
      .catch((err) => {
        if (cancelled) return
        setError(err)
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { tables, status, error }
}
