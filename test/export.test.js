import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { toCsv } from '../src/csv.js'
import { getInvoice } from '../src/invoices.js'
import { createServer } from '../src/server.js'

// Criterio 23 de workdocs/SPEC.md: el cuerpo de /api/export.csv es byte a byte el toCsv del T-01.
// fetch().text() descarta el BOM, por eso se comparan los bytes crudos.
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

test('criterio 23: el cuerpo de /api/export.csv es byte a byte toCsv de F-1001, F-1002 y F-1004', async () => {
  const res = await fetch(`${baseUrl}/api/export.csv`)
  assert.equal(res.status, 200)
  const expected = Buffer.from(toCsv(['F-1001', 'F-1002', 'F-1004'].map(getInvoice)))
  assert.deepEqual(Buffer.from(await res.arrayBuffer()), expected)
})

test('criterio 24: export.csv con status=open y month=2026-09 trae solo F-1004 (lo que ve María)', async () => {
  const res = await fetch(`${baseUrl}/api/export.csv?status=open&month=2026-09`)
  assert.deepEqual(Buffer.from(await res.arrayBuffer()), Buffer.from(toCsv([getInvoice('F-1004')])))
})
