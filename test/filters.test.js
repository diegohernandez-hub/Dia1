import assert from 'node:assert/strict'
import { test } from 'node:test'
import { listInvoices } from '../src/invoices.js'
import { filterInvoices } from '../src/filters.js'

test('criterio 1: sin opciones excluye F-1003 y deja F-1001, F-1002, F-1004 en orden', () => {
  const result = filterInvoices(listInvoices())
  assert.deepEqual(
    result.map((invoice) => invoice.id),
    ['F-1001', 'F-1002', 'F-1004'],
  )
})

test('criterio 3: month 2026-08 deja F-1001 y F-1002', () => {
  const result = filterInvoices(listInvoices(), { month: '2026-08' })
  assert.deepEqual(
    result.map((invoice) => invoice.id),
    ['F-1001', 'F-1002'],
  )
})

test('criterio 4: month 2026-09 deja solo F-1004', () => {
  const result = filterInvoices(listInvoices(), { month: '2026-09' })
  assert.deepEqual(
    result.map((invoice) => invoice.id),
    ['F-1004'],
  )
})

test('criterio 5: month 2026-09 con includeVoid deja F-1003 y F-1004', () => {
  const result = filterInvoices(listInvoices(), { month: '2026-09', includeVoid: true })
  assert.deepEqual(
    result.map((invoice) => invoice.id),
    ['F-1003', 'F-1004'],
  )
})

test('criterio 6: month 2026-07 devuelve []', () => {
  const result = filterInvoices(listInvoices(), { month: '2026-07' })
  assert.deepEqual(result, [])
})
