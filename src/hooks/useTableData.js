import { useEffect, useState } from 'react'
import Papa from 'papaparse'
import { normalizeRow } from '../utils/mapping'

// Fetches and parses a single table's CSV file into normalized column rows.
// PapaParse handles quoted multi-line fields correctly (e.g. Notes cells
// that span several lines in the source CSV).
export function useTableData(table) {
  const [columns, setColumns] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!table) {
      setColumns([])
      setStatus('idle')
      return undefined
    }

    let cancelled = false
    setStatus('loading')
    const url = `${import.meta.env.BASE_URL}${table.file}`

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load ${table.file} (${res.status})`)
        return res.text()
      })
      .then((csvText) => {
        if (cancelled) return
        const result = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
        })
        if (result.errors?.length) {
          console.warn(`CSV parse warnings for ${table.id}:`, result.errors)
        }
        setColumns(result.data.map(normalizeRow).filter((col) => col.snowflakeColumn))
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
  }, [table])

  return { columns, status, error }
}
