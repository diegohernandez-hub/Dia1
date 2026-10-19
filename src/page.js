export function totalAmount(invoices) {
  return invoices.reduce((sum, invoice) => sum + invoice.amount, 0)
}

// Corre en el navegador. Pinta los datos con textContent, nunca con innerHTML.
function pageScript() {
  const status = document.querySelector('select[name="status"]')
  const month = document.querySelector('input[name="month"]')
  const rows = document.querySelector('#facturas tbody')
  const total = document.getElementById('total')
  const descargar = document.getElementById('descargar')
  const error = document.getElementById('error')

  function currentParams() {
    const params = new URLSearchParams()
    if (status.value) params.set('status', status.value)
    if (month.value) params.set('month', month.value)
    return params.toString()
  }

  async function refresh() {
    const query = currentParams()
    descargar.href = query ? `/api/export.csv?${query}` : '/api/export.csv'
    const response = await fetch(query ? `/api/invoices?${query}` : '/api/invoices')
    const body = await response.json()
    rows.replaceChildren()
    if (!response.ok) {
      error.textContent = body.error
      total.textContent = '0'
      return
    }
    error.textContent = ''
    for (const invoice of body) {
      const tr = document.createElement('tr')
      for (const value of [invoice.id, invoice.client, invoice.issuedAt, invoice.amount, invoice.status]) {
        const td = document.createElement('td')
        td.textContent = String(value)
        tr.append(td)
      }
      rows.append(tr)
    }
    total.textContent = String(totalAmount(body))
  }

  status.addEventListener('change', refresh)
  month.addEventListener('change', refresh)
  refresh()
}

export function renderPage() {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Facturas · Andes Lab</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; }
  table { border-collapse: collapse; margin: 1rem 0; }
  th, td { border: 1px solid #ccc; padding: 0.3rem 0.6rem; text-align: left; }
  #error { color: #b00020; }
</style>
</head>
<body>
<h1>Facturas</h1>
<label>Estado
  <select name="status">
    <option value="">Todas sin anuladas</option>
    <option value="paid">pagada</option>
    <option value="open">abierta</option>
    <option value="void">anulada</option>
  </select>
</label>
<label>Mes <input type="month" name="month"></label>
<p id="error"></p>
<table id="facturas">
  <thead><tr><th>id</th><th>cliente</th><th>fecha</th><th>monto</th><th>estado</th></tr></thead>
  <tbody></tbody>
</table>
<p>Total: <span id="total">0</span></p>
<a id="descargar" href="/api/export.csv">Descargar CSV</a>
<script>
${totalAmount.toString()}
(${pageScript.toString()})()
</script>
</body>
</html>
`
}
