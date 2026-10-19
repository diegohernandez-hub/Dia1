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
