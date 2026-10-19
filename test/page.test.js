import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getInvoice } from '../src/invoices.js'

// Import dinámico: mientras src/page.js no exista, cada test falla por separado.
async function loadPage() {
  return import('../src/page.js')
}

test('criterio 28: totalAmount suma los montos y da 0 sin facturas', async () => {
  const { totalAmount } = await loadPage()
  assert.equal(totalAmount([]), 0)
  const visibles = ['F-1001', 'F-1002', 'F-1004'].map(getInvoice)
  assert.equal(totalAmount(visibles), 2590000)
})

test('criterio 27: renderPage trae tabla, filtros, total, Descargar CSV y totalAmount', async () => {
  const { renderPage, totalAmount } = await loadPage()
  const html = renderPage()

  assert.match(html, /<table/)
  assert.match(html, /<select name="status">/)
  for (const value of ['paid', 'open', 'void']) {
    assert.match(html, new RegExp(`<option value="${value}"`), `opción ${value}`)
  }
  assert.match(html, /<input type="month"/)
  assert.match(html, /id="total"/)
  assert.match(html, /<a [^>]*href="\/api\/export\.csv[^"]*"[^>]*>Descargar CSV<\/a>/)
  assert.ok(html.includes(totalAmount.toString()), 'incluye el código de totalAmount')
})

test('criterio 27: GET / sirve ese HTML con text/html', async () => {
  const { createServer } = await import('../src/server.js')
  const { renderPage } = await loadPage()
  const server = createServer()
  await new Promise((resolve) => server.listen(0, resolve))
  try {
    const res = await fetch(`http://localhost:${server.address().port}/`)
    assert.equal(res.status, 200)
    assert.match(res.headers.get('content-type'), /^text\/html/)
    assert.equal(await res.text(), renderPage())
  } finally {
    server.close()
  }
})

// fetch falso: devuelve una respuesta con ok, status y json() a medida.
function fakeResponse(status, json) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json })
}

test('criterio 35: fetchInvoices devuelve un error para mostrar cuando la API falla', async () => {
  const { fetchInvoices } = await loadPage()
  const lista = [getInvoice('F-1004')]

  const ok = await fetchInvoices('status=open', () => fakeResponse(200, async () => lista))
  assert.deepEqual(ok, { invoices: lista, error: null })

  const caido = await fetchInvoices('', () => Promise.reject(new TypeError('Failed to fetch')))
  assert.deepEqual(caido.invoices, [])
  assert.match(caido.error, /servidor/, 'servidor caído: mensaje para María')

  const conMensaje = await fetchInvoices('month=agosto', () =>
    fakeResponse(400, async () => ({ error: 'month debe tener el formato YYYY-MM' })),
  )
  assert.deepEqual(conMensaje, { invoices: [], error: 'month debe tener el formato YYYY-MM' })

  const sinJson = await fetchInvoices('', () =>
    fakeResponse(502, async () => {
      throw new SyntaxError('Unexpected token <')
    }),
  )
  assert.deepEqual(sinJson.invoices, [])
  assert.match(sinJson.error, /502/, 'error sin JSON: el mensaje trae el código')

  const noLista = await fetchInvoices('', () => fakeResponse(200, async () => ({ id: 'F-1001' })))
  assert.deepEqual(noLista.invoices, [])
  assert.equal(typeof noLista.error, 'string', 'una respuesta que no es lista es un error')
})

test('criterio 36: latestOnly descarta la respuesta de un filtro viejo', async () => {
  const { latestOnly } = await loadPage()
  const pendientes = []
  const lento = latestOnly((valor) => new Promise((resolve) => pendientes.push(() => resolve(valor))))

  const primero = lento('2026-08')
  const segundo = lento('2026-09')
  pendientes[1]()
  pendientes[0]()

  assert.deepEqual(await segundo, { stale: false, value: '2026-09' })
  assert.deepEqual(await primero, { stale: true }, 'la respuesta vieja llega después y se descarta')
})

test('criterios 35 y 36: la página usa las mismas fetchInvoices y latestOnly', async () => {
  const { renderPage, fetchInvoices, latestOnly } = await loadPage()
  const html = renderPage()
  assert.ok(html.includes(fetchInvoices.toString()), 'incluye fetchInvoices')
  assert.ok(html.includes(latestOnly.toString()), 'incluye latestOnly')
})
