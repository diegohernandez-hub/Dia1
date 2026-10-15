export function filterInvoices(invoices, { month = null, includeVoid = false } = {}) {
  return invoices.filter((invoice) => {
    if (!includeVoid && invoice.status === 'void') return false
    if (month !== null && !invoice.issuedAt.startsWith(`${month}-`)) return false
    return true
  })
}
