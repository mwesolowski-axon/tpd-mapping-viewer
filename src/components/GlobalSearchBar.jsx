import { useEffect, useMemo, useRef, useState } from 'react'
import { searchGlobalIndex } from '../utils/mapping'

function GlobalSearchBar({ index, indexStatus, onSelectResult }) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef(null)

  const results = useMemo(() => searchGlobalIndex(index, query), [index, query])

  useEffect(() => {
    setActiveIndex(0)
  }, [query, results.length])

  useEffect(() => {
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  function handleSelect(hit) {
    onSelectResult(hit)
    setQuery('')
    setIsOpen(false)
  }

  function handleKeyDown(event) {
    if (!isOpen && event.key === 'ArrowDown' && query.trim()) {
      setIsOpen(true)
      return
    }
    if (!isOpen || !results.length) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((prev) => (prev + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((prev) => (prev - 1 + results.length) % results.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      handleSelect(results[activeIndex])
    } else if (event.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const showDropdown = isOpen && query.trim().length > 0

  return (
    <header className="global-search-bar" ref={rootRef}>
      <div className="global-search-inner">
        <label className="global-search-label" htmlFor="global-search-input">
          Search all tables
        </label>
        <input
          id="global-search-input"
          type="search"
          className="global-search-input"
          placeholder="Schema, column, example data, notes…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setIsOpen(true)
          }}
          onFocus={() => query.trim() && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
        {indexStatus === 'loading' && (
          <span className="global-search-meta">Indexing tables…</span>
        )}
        {indexStatus === 'success' && query.trim() && (
          <span className="global-search-meta">
            {results.length} match{results.length === 1 ? '' : 'es'}
          </span>
        )}
      </div>

      {showDropdown && (
        <ul className="global-search-results" role="listbox">
          {results.length === 0 && (
            <li className="global-search-empty">No matches across any table.</li>
          )}
          {results.map((hit, index) => (
            <li key={`${hit.tableId}-${hit.columnId}`}>
              <button
                type="button"
                className={`global-search-result${index === activeIndex ? ' active' : ''}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => handleSelect(hit)}
              >
                <span className="global-search-result-table">{hit.tableName}</span>
                <span className="global-search-result-column">{hit.snowflakeColumn}</span>
                {hit.exampleData && (
                  <span className="global-search-result-example" title={hit.exampleData}>
                    {hit.exampleData}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </header>
  )
}

export default GlobalSearchBar
