export function totalAmount(invoices) {
  return invoices.reduce((sum, invoice) => sum + invoice.amount, 0)
}

// SPEC criterio 35: nunca lanza; si la API falla devuelve un mensaje para mostrar.
export async function fetchInvoices(query, fetchImpl = fetch) {
  let response
  try {
    response = await fetchImpl(query ? `/api/invoices?${query}` : '/api/invoices')
  } catch {
    return { invoices: [], error: 'No se pudo conectar con el servidor. Revisa que node src/server.js siga corriendo.' }
  }
  let body = null
  try {
    body = await response.json()
  } catch {
    body = null
  }
  if (!response.ok) {
    return { invoices: [], error: body?.error ?? `El servidor respondió con un error (${response.status}).` }
  }
  if (!Array.isArray(body)) {
    return { invoices: [], error: 'El servidor respondió algo inesperado.' }
  }
  return { invoices: body, error: null }
}

// SPEC criterio 36: solo la última llamada cuenta; las anteriores llegan como { stale: true }.
export function latestOnly(fn) {
  let latest = 0
  return async (...args) => {
    const call = ++latest
    const value = await fn(...args)
    return call === latest ? { stale: false, value } : { stale: true }
  }
}

// Corre en el navegador. Pinta los datos con textContent, nunca con innerHTML.
function pageScript() {
  const status = document.querySelector('select[name="status"]')
  const month = document.querySelector('input[name="month"]')
  const rows = document.querySelector('#facturas tbody')
  const total = document.getElementById('total')
  const descargar = document.getElementById('descargar')
  const error = document.getElementById('error')
  const contador = document.getElementById('contador')

  function currentParams() {
    const params = new URLSearchParams()
    if (status.value) params.set('status', status.value)
    if (month.value) params.set('month', month.value)
    return params.toString()
  }

  const load = latestOnly(fetchInvoices)

  async function refresh() {
    const query = currentParams()
    descargar.href = query ? `/api/export.csv?${query}` : '/api/export.csv'
    const result = await load(query)
    if (result.stale) return
    const body = result.value.invoices
    rows.replaceChildren()
    if (result.value.error) {
      error.textContent = result.value.error
      contador.textContent = '0 facturas'
      total.textContent = '0'
      return
    }
    error.textContent = ''
    for (const invoice of body) {
      const tr = document.createElement('tr')
      for (const value of [invoice.id, invoice.client, invoice.issuedAt, invoice.amount]) {
        const td = document.createElement('td')
        td.textContent = String(value)
        tr.append(td)
      }
      const estado = document.createElement('span')
      estado.className = `estado estado-${invoice.status}`
      estado.textContent = invoice.status
      const td = document.createElement('td')
      td.append(estado)
      tr.append(td)
      if (invoice.status === 'void') tr.className = 'anulada'
      rows.append(tr)
    }
    if (body.length === 0) {
      const td = document.createElement('td')
      td.colSpan = 5
      td.className = 'vacio'
      td.textContent = 'No hay facturas para estos filtros.'
      const tr = document.createElement('tr')
      tr.append(td)
      rows.append(tr)
    }
    contador.textContent = `${body.length} ${body.length === 1 ? 'factura' : 'facturas'}`
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
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Facturas · Andes Lab</title>
<style>
  :root {
    --fondo: #f4f6f9;
    --superficie: #ffffff;
    --borde: #e3e7ee;
    --texto: #1c2430;
    --suave: #5f6b7a;
    --marca: #1f4e8c;
    --marca-oscura: #173c6b;
    --peligro: #b42318;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--fondo);
    color: var(--texto);
    font: 15px/1.5 "Segoe UI", system-ui, -apple-system, sans-serif;
  }
  header {
    background: var(--marca);
    color: #fff;
    padding: 1.1rem 2rem;
  }
  header .empresa { font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.8; }
  header h1 { margin: 0.15rem 0 0; font-size: 1.45rem; font-weight: 600; }
  main { max-width: 980px; margin: 0 auto; padding: 1.5rem 1rem 3rem; }
  .tarjeta {
    background: var(--superficie);
    border: 1px solid var(--borde);
    border-radius: 10px;
    box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
  }
  #filtros {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: flex-end;
    padding: 1rem 1.25rem;
  }
  #filtros label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.8rem; font-weight: 600; color: var(--suave); }
  select, input[type="month"] {
    min-width: 200px;
    padding: 0.5rem 0.65rem;
    border: 1px solid var(--borde);
    border-radius: 6px;
    background: #fff;
    color: var(--texto);
    font: inherit;
  }
  select:focus, input:focus, .boton:focus { outline: 2px solid var(--marca); outline-offset: 2px; }
  .boton {
    margin-left: auto;
    display: inline-block;
    padding: 0.55rem 1.1rem;
    border-radius: 6px;
    background: var(--marca);
    color: #fff;
    font-weight: 600;
    text-decoration: none;
  }
  .boton:hover { background: var(--marca-oscura); }
  #error { margin: 1rem 0 0; color: var(--peligro); font-weight: 600; }
  #error:empty { display: none; }
  .resumen { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0; }
  .resumen .tarjeta { padding: 1rem 1.25rem; }
  .resumen .etiqueta { font-size: 0.8rem; color: var(--suave); font-weight: 600; }
  .resumen .valor { font-size: 1.6rem; font-weight: 700; font-variant-numeric: tabular-nums; }
  .tabla { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 0.7rem 1.25rem; text-align: left; border-bottom: 1px solid var(--borde); }
  th { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--suave); background: #f9fafb; }
  tbody tr:last-child td { border-bottom: 0; }
  tbody tr:hover { background: #f7f9fc; }
  td:nth-child(4), th:nth-child(4) { text-align: right; font-variant-numeric: tabular-nums; }
  tr.anulada td { color: var(--suave); }
  .vacio { text-align: center; color: var(--suave); padding: 2rem; }
  .estado { display: inline-block; padding: 0.1rem 0.6rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; }
  .estado-paid { background: #e7f6ec; color: #1a7f37; }
  .estado-open { background: #fff4e0; color: #9a6700; }
  .estado-void { background: #eef0f3; color: #5f6b7a; }
</style>
</head>
<body>
<header>
  <div class="empresa">Andes Lab · Tesorería</div>
  <h1>Facturas</h1>
</header>
<main>
<form id="filtros" class="tarjeta" onsubmit="return false">
  <label>Estado
    <select name="status">
      <option value="">Todas (sin anuladas)</option>
      <option value="paid">Pagada</option>
      <option value="open">Abierta</option>
      <option value="void">Anulada</option>
    </select>
  </label>
  <label>Mes <input type="month" name="month"></label>
  <a id="descargar" class="boton" href="/api/export.csv" download>Descargar CSV</a>
</form>
<p id="error" role="alert"></p>
<section class="resumen">
  <div class="tarjeta"><div class="etiqueta">Facturas visibles</div><div class="valor" id="contador">0 facturas</div></div>
  <div class="tarjeta"><div class="etiqueta">Total</div><div class="valor" id="total">0</div></div>
</section>
<div class="tarjeta tabla">
<table id="facturas">
  <thead><tr><th>id</th><th>cliente</th><th>fecha</th><th>monto</th><th>estado</th></tr></thead>
  <tbody></tbody>
</table>
</div>
</main>
<script>
${totalAmount.toString()}
${fetchInvoices.toString()}
${latestOnly.toString()}
(${pageScript.toString()})()
</script>
</body>
</html>
`
}
