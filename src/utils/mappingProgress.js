import { PLANNED_TABLE_IDS, plannedTableCategory } from '../data/plannedTables'

function pct(done, total) {
  if (total === 0) return 0
  return Math.round((done / total) * 100)
}

/**
 * Progress = planned views that appear in the manifest (CSV published on the site).
 */
export function computeMappingProgress(manifestTableIds) {
  const completed = new Set(manifestTableIds)
  const groups = { axon: [], dt: [], dw: [], other: [] }

  for (const id of PLANNED_TABLE_IDS) {
    groups[plannedTableCategory(id)].push(id)
  }

  function summarize(ids) {
    const total = ids.length
    const done = ids.filter((id) => completed.has(id)).length
    return { done, total, percent: pct(done, total) }
  }

  const overall = summarize(PLANNED_TABLE_IDS)

  return {
    overall,
    axon: summarize(groups.axon),
    dt: summarize(groups.dt),
    dw: summarize(groups.dw),
  }
}
