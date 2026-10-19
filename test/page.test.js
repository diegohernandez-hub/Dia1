import assert from 'node:assert/strict'
import { test } from 'node:test'
import { listInvoices } from '../src/invoices.js'

// Import dinámico: mientras src/page.js no exista, cada test falla por separado.
async function loadPage() {
  return import('../src/page.js')
}

test('criterio 28: totalAmount suma los montos y da 0 sin facturas', async () => {
  const { totalAmount } = await loadPage()
  assert.equal(totalAmount([]), 0)
  const visibles = listInvoices().filter((invoice) => ['F-1001', 'F-1002', 'F-1004'].includes(invoice.id))
  assert.equal(visibles.length, 3)
  assert.equal(totalAmount(visibles), 2590000)
})

test('criterio 27: renderPage trae tabla, filtros, total, Descargar CSV y totalAmount', async () => {
  const { renderPage, totalAmount } = await loadPage()
  const html = renderPage()
  assert.equal(typeof html, 'string')
  assert.ok(html.includes('<table'))

  const select = html.match(/<select name="status">([\s\S]*?)<\/select>/)
  assert.ok(select, 'falta <select name="status">')
  const values = [...select[1].matchAll(/<option value="([^"]*)"/g)].map((m) => m[1])
  assert.deepEqual(values, ['', 'paid', 'open', 'void'])

  assert.ok(html.includes('<input type="month" name="month"'))
  assert.ok(html.includes('id="total"'))
  assert.match(html, /<a [^>]*href="\/api\/export\.csv[^"]*"[^>]*>Descargar CSV<\/a>/)
  assert.ok(html.includes(totalAmount.toString()))
})
