import { useEffect, useState } from 'react'
import Papa from 'papaparse'
import { normalizeRow } from '../utils/mapping'

// Loads every table CSV once the manifest is ready so the top omni-search
// can jump across tables without waiting on a per-table selection first.
export function useGlobalSearchIndex(tables) {
  const [index, setIndex] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!tables.length) {
      setIndex([])
      setStatus('idle')
      return undefined
    }

    let cancelled = false
    setStatus('loading')
    setError(null)

    Promise.all(
      tables.map(async (table) => {
        const url = `${import.meta.env.BASE_URL}${table.file}`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Failed to load ${table.file} (${res.status})`)
        const csvText = await res.text()
        const result = Papa.parse(csvText, { header: true, skipEmptyLines: true })
        const columns = result.data.map(normalizeRow).filter((col) => col.snowflakeColumn)
        return columns.map((column) => ({ table, column }))
      })
    )
      .then((groups) => {
        if (cancelled) return
        setIndex(groups.flat())
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
  }, [tables])

  return { index, status, error }
}
