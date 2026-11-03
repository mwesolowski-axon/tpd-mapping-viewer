/** Query-string deep links: ?table=AXON_REPORTS&column=RESTRICTED */

export function buildDeepLink({ tableId, columnId }) {
  if (!tableId) return window.location.href.split('?')[0]

  const url = new URL(window.location.href)
  url.searchParams.set('table', tableId)
  if (columnId) {
    url.searchParams.set('column', columnId)
  } else {
    url.searchParams.delete('column')
  }
  return url.toString()
}

export function parseDeepLink(search = window.location.search) {
  const params = new URLSearchParams(search)
  const tableId = params.get('table')?.trim() || null
  const columnId = params.get('column')?.trim() || null
  return { tableId, columnId }
}

export function syncDeepLinkToAddressBar(tableId, columnId) {
  if (!tableId || typeof window === 'undefined') return
  const next = buildDeepLink({ tableId, columnId: columnId || null })
  const current = window.location.href
  if (current === next) return
  window.history.replaceState(null, '', next)
}
