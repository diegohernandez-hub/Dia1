import assert from 'node:assert/strict'
import { test } from 'node:test'
import { listInvoices } from '../src/invoices.js'

// Import dinámico: mientras src/csv.js no exista, cada test falla por separado.
async function loadToCsv() {
  const { toCsv } = await import('../src/csv.js')
  return toCsv
}

const BOM = '﻿'
const HEADER = 'id;cliente;fecha;monto;estado'

// Separa una línea CSV en campos respetando comillas dobles (RFC 4180).
function splitCsvLine(line) {
  const fields = []
  let field = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        field += '"'
        i++
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ';') {
      fields.push(field)
      field = ''
    } else {
      field += char
    }
  }
  fields.push(field)
  return fields
}

test('criterio 2: la fila de F-1001 es exacta y cada línea termina en \\r\\n', async () => {
  const toCsv = await loadToCsv()
  const csv = toCsv(listInvoices())

  assert.ok(csv.endsWith('\r\n'), 'la última línea termina en \\r\\n')
  assert.ok(!csv.endsWith('\r\n\r\n'), 'no hay una línea vacía al final')
  assert.doesNotMatch(csv, /(?<!\r)\n/, 'no hay \\n sin \\r antes')
  assert.doesNotMatch(csv, /\r(?!\n)/, 'no hay \\r sin \\n después')

  const lines = csv.slice(BOM.length).split('\r\n')
  assert.ok(lines.includes('F-1001;Constructora Sur;2026-08-02;1250000;paid'))
})

test('criterio 6: sin facturas devuelve BOM + cabecera + \\r\\n', async () => {
  const toCsv = await loadToCsv()
  assert.equal(toCsv([]), `${BOM}${HEADER}\r\n`)
})

test('criterio 15: un cliente con ; o " va entre comillas y la fila tiene 5 columnas', async () => {
  const toCsv = await loadToCsv()
  const invoices = [
    { id: 'F-2001', client: 'Pérez; Hijos', issuedAt: '2026-08-03', amount: 100, status: 'open' },
    { id: 'F-2002', client: 'Taller "Norte"', issuedAt: '2026-08-04', amount: 200, status: 'paid' },
  ]
  const csv = toCsv(invoices)
  const lines = csv.slice(BOM.length).split('\r\n')

  assert.equal(lines[1], 'F-2001;"Pérez; Hijos";2026-08-03;100;open')
  assert.equal(lines[2], 'F-2002;"Taller ""Norte""";2026-08-04;200;paid')
  assert.deepEqual(splitCsvLine(lines[1]), ['F-2001', 'Pérez; Hijos', '2026-08-03', '100', 'open'])
  assert.deepEqual(splitCsvLine(lines[2]), ['F-2002', 'Taller "Norte"', '2026-08-04', '200', 'paid'])
})
