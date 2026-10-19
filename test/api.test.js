import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from '../src/server.js'

let server
let baseUrl

before(async () => {
  server = createServer()
  await new Promise((resolve) => server.listen(0, resolve))
  baseUrl = `http://localhost:${server.address().port}`
})

after(() => {
  server.close()
})

test('criterio 18: /api/invoices sin filtros devuelve F-1001, F-1002, F-1004', async () => {
  const res = await fetch(`${baseUrl}/api/invoices`)
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8')
  const body = await res.json()
  assert.deepEqual(body.map((invoice) => invoice.id), ['F-1001', 'F-1002', 'F-1004'])
})

test('criterio 19: status=open devuelve F-1002 y F-1004', async () => {
  const res = await fetch(`${baseUrl}/api/invoices?status=open`)
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.deepEqual(body.map((invoice) => invoice.id), ['F-1002', 'F-1004'])
})

test('criterio 20: month=2026-08 devuelve F-1001 y F-1002', async () => {
  const res = await fetch(`${baseUrl}/api/invoices?month=2026-08`)
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.deepEqual(body.map((invoice) => invoice.id), ['F-1001', 'F-1002'])
})

test('criterio 21: status=void y month=2026-09 devuelve solo F-1003', async () => {
  const res = await fetch(`${baseUrl}/api/invoices?status=void&month=2026-09`)
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.deepEqual(body.map((invoice) => invoice.id), ['F-1003'])
})

test('criterio 22: status o month inválidos responden 400 con el mensaje', async () => {
  const statusRes = await fetch(`${baseUrl}/api/invoices?status=pagada`)
  assert.equal(statusRes.status, 400)
  const statusBody = await statusRes.json()
  assert.match(statusBody.error, /paid, open, void/)

  const monthRes = await fetch(`${baseUrl}/api/invoices?month=2026-8`)
  assert.equal(monthRes.status, 400)
  const monthBody = await monthRes.json()
  assert.match(monthBody.error, /YYYY-MM/)
})

test('criterio 23: /api/export.csv es el toCsv del T-01, como attachment', async () => {
  const res = await fetch(`${baseUrl}/api/export.csv`)
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('content-type'), 'text/csv; charset=utf-8')
  const disposition = res.headers.get('content-disposition')
  assert.match(disposition, /attachment/)
  assert.match(disposition, /facturas\.csv/)
  const bytes = new Uint8Array(await res.arrayBuffer())
  assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf], 'empieza con el BOM UTF-8')
  const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes)
  assert.ok(text.includes('id;cliente;fecha;monto;estado'), 'trae la cabecera')
})

test('criterio 24: export.csv respeta status y month', async () => {
  const voidRes = await fetch(`${baseUrl}/api/export.csv?status=void`)
  const voidText = await voidRes.text()
  assert.ok(voidText.includes('F-1003'))
  assert.ok(!voidText.includes('F-1001'))

  const monthRes = await fetch(`${baseUrl}/api/export.csv?month=2026-08`)
  const monthText = await monthRes.text()
  assert.ok(monthText.includes('F-1001'))
  assert.ok(monthText.includes('F-1002'))
  assert.ok(!monthText.includes('F-1004'))
})

test('criterio 25: export.csv con month inválido responde 400 sin CSV', async () => {
  const res = await fetch(`${baseUrl}/api/export.csv?month=agosto`)
  assert.equal(res.status, 400)
  assert.notEqual(res.headers.get('content-type'), 'text/csv; charset=utf-8')
})

test('criterio 26: una ruta desconocida responde 404', async () => {
  const res = await fetch(`${baseUrl}/no-existe`)
  assert.equal(res.status, 404)
})
