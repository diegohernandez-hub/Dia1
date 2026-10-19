import { filterInvoices } from './filters.js'

const STATUSES = ['paid', 'open', 'void']
const MONTH_FORMAT = /^\d{4}-(0[1-9]|1[0-2])$/

export function parseFilters(searchParams) {
  const rawStatus = searchParams.get('status')
  const status = rawStatus === null || rawStatus === '' ? null : rawStatus
  if (status !== null && !STATUSES.includes(status)) {
    return { error: `status debe ser paid, open, void (o vacío), no "${status}"` }
  }

  const rawMonth = searchParams.get('month')
  const month = rawMonth === null || rawMonth === '' ? null : rawMonth
  if (month !== null && !MONTH_FORMAT.test(month)) {
    return { error: `month debe tener el formato YYYY-MM (por ejemplo 2026-08), no "${month}"` }
  }

  return { status, month }
}

export function selectInvoices(invoices, { status = null, month = null } = {}) {
  if (status === null) {
    return filterInvoices(invoices, { month })
  }
  return filterInvoices(invoices, { month, includeVoid: true }).filter(
    (invoice) => invoice.status === status,
  )
}
