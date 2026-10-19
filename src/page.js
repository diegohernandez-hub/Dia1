// Criterio 28: suma de los montos; sin facturas da 0.
export function totalAmount(invoices) {
  return invoices.reduce((sum, invoice) => sum + invoice.amount, 0)
}

// Criterio 27: un solo HTML con su JS inline. El script incrusta el código de
// totalAmount (toString) para que la página use la misma función testeada.
// Los datos se pintan con textContent, nunca con innerHTML.
const STYLES = `
  body { font-family: sans-serif; margin: 2rem; }
  label { margin-right: 1rem; }
  table { border-collapse: collapse; margin-top: 1rem; }
  th, td { border: 1px solid #ccc; padding: 0.3rem 0.8rem; text-align: left; }
  th { background: #f0f0f0; }
  #error { color: #b00020; margin-top: 1rem; }
`

function clientScript() {
  return `
${totalAmount.toString()}

const form = document.getElementById('filtros')
const tbody = document.getElementById('filas')
const totalEl = document.getElementById('total')
const errorEl = document.getElementById('error')
const link = document.getElementById('descargar')

function buildParams() {
  const params = new URLSearchParams()
  for (const name of ['status', 'month']) {
    const value = form.elements[name].value
    if (value) params.set(name, value)
  }
  return params.toString()
}

function paintRows(invoices) {
  tbody.replaceChildren()
  for (const invoice of invoices) {
    const row = document.createElement('tr')
    for (const value of [invoice.id, invoice.client, invoice.issuedAt, invoice.amount, invoice.status]) {
      const cell = document.createElement('td')
      cell.textContent = String(value)
      row.appendChild(cell)
    }
    tbody.appendChild(row)
  }
}

async function refresh() {
  const params = buildParams()
  const suffix = params ? '?' + params : ''
  link.setAttribute('href', '/api/export.csv' + suffix)
  const response = await fetch('/api/invoices' + suffix)
  const body = await response.json()
  if (!response.ok) {
    errorEl.textContent = body.error
    paintRows([])
    totalEl.textContent = ''
    return
  }
  errorEl.textContent = ''
  paintRows(body)
  totalEl.textContent = String(totalAmount(body))
}

form.addEventListener('change', refresh)
refresh()
`
}

export function renderPage() {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Panel de facturas</title>
<style>${STYLES}</style>
</head>
<body>
<h1>Panel de facturas</h1>
<form id="filtros" onsubmit="return false">
  <label>Estado
    <select name="status">
      <option value="">Todas (sin anuladas)</option>
      <option value="paid">Pagada</option>
      <option value="open">Abierta</option>
      <option value="void">Anulada</option>
    </select>
  </label>
  <label>Mes
    <input type="month" name="month">
  </label>
</form>
<p id="error" role="alert"></p>
<table>
  <thead>
    <tr><th>id</th><th>cliente</th><th>fecha</th><th>monto</th><th>estado</th></tr>
  </thead>
  <tbody id="filas"></tbody>
</table>
<p>Total: <span id="total"></span></p>
<p><a id="descargar" href="/api/export.csv">Descargar CSV</a></p>
<script>${clientScript()}</script>
</body>
</html>
`
}
