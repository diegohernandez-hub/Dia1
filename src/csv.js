const BOM = '﻿'
const SEPARATOR = ';'
const EOL = '\r\n'
const HEADER = ['id', 'cliente', 'fecha', 'monto', 'estado']

// RFC 4180: un campo con separador, comillas o salto de línea va entre comillas,
// con las comillas internas duplicadas.
function escapeField(value) {
  const text = String(value)
  if (/[;"\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}

function toRow(fields) {
  return fields.map(escapeField).join(SEPARATOR) + EOL
}

export function toCsv(invoices) {
  const rows = invoices.map((invoice) =>
    toRow([invoice.id, invoice.client, invoice.issuedAt, invoice.amount, invoice.status]),
  )
  return BOM + toRow(HEADER) + rows.join('')
}
