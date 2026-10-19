// Tests de aceptación de la story-3 (feat/T-01-story-3): comando export-csv.
// Criterios de workdocs/SPEC.md. Cada test corre el CLI como proceso, con cwd en
// una carpeta nueva de os.tmpdir(), para no ensuciar el repo y correr igual en
// Windows y en CI. El criterio 16 lo cubre `npm test` completo.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const cliPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'cli.js')
const BOM = '\uFEFF'
const HEADER = 'id;cliente;fecha;monto;estado'

// Carpeta temporal nueva por caso; se borra al terminar el test.
function newTmp(t) {
  const dir = mkdtempSync(join(tmpdir(), 'export-csv-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}

function run(args, cwd) {
  return spawnSync(process.execPath, [cliPath, ...args], { cwd, encoding: 'utf8' })
}

function readCsv(path) {
  const text = readFileSync(path, 'utf8')
  assert.ok(text.startsWith(BOM), 'el archivo empieza con el BOM UTF-8')
  assert.doesNotMatch(text, /[^\r]\n/, 'no hay \\n sin \\r')
  const lines = text.slice(1).split('\r\n')
  assert.equal(lines.pop(), '', 'la última línea termina en \\r\\n')
  assert.equal(lines[0], HEADER)
  return lines.slice(1)
}

function ids(rows) {
  return rows.map((row) => row.split(';')[0])
}

function assertNoFiles(cwd, label = '') {
  assert.deepEqual(readdirSync(cwd), [], `${label}no escribe ningún archivo`)
}

// Argumentos inválidos: código 1, el uso de export-csv en stderr y nada escrito.
function assertUsageError(result, cwd) {
  assert.equal(result.status, 1, 'sale con código 1')
  assert.match(result.stderr, /export-csv/, 'stderr muestra el uso de export-csv')
  assertNoFiles(cwd)
}

test('criterio 1: sin flags escribe facturas.csv con F-1001, F-1002 y F-1004, sin la anulada', (t) => {
  const cwd = newTmp(t)
  const result = run(['export-csv'], cwd)
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stdout.trim(), 'facturas.csv: 3 filas')
  const rows = readCsv(join(cwd, 'facturas.csv'))
  assert.deepEqual(ids(rows), ['F-1001', 'F-1002', 'F-1004'])
})

test('criterio 7: --month con formato inválido sale con código 1 y pide YYYY-MM', (t) => {
  for (const month of ['2026-8', 'agosto']) {
    const cwd = newTmp(t)
    const result = run(['export-csv', '--month', month], cwd)
    assert.equal(result.status, 1, `--month ${month} sale con código 1`)
    assert.match(result.stderr, /YYYY-MM/, `--month ${month}: stderr contiene YYYY-MM`)
    assertNoFiles(cwd, `--month ${month}: `)
  }
})

test('criterio 8: --out escribe en la ruta indicada', (t) => {
  const cwd = newTmp(t)
  const out = join(cwd, 'export-tesoreria-agosto.csv')
  const result = run(['export-csv', '--out', out], cwd)
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stdout.trim(), `${out}: 3 filas`)
  assert.deepEqual(ids(readCsv(out)), ['F-1001', 'F-1002', 'F-1004'])
})

test('criterio 9: un segundo export sobrescribe al primero', (t) => {
  const cwd = newTmp(t)
  assert.equal(run(['export-csv', '--month', '2026-08'], cwd).status, 0, 'primer export')
  assert.equal(run(['export-csv'], cwd).status, 0, 'segundo export')
  assert.deepEqual(ids(readCsv(join(cwd, 'facturas.csv'))), ['F-1001', 'F-1002', 'F-1004'])
})

test('criterio 10: --out a una carpeta que no existe sale con código 1 y no la crea', (t) => {
  // Control positivo: sin él, el test pasaría hoy solo porque el comando no existe.
  const okDir = newTmp(t)
  assert.equal(run(['export-csv', '--out', join(okDir, 'ok.csv')], okDir).status, 0, 'control: --out a una carpeta existente funciona')
  const cwd = newTmp(t)
  const missingDir = join(cwd, 'no-existe')
  const result = run(['export-csv', '--out', join(missingDir, 'a.csv')], cwd)
  assert.equal(result.status, 1)
  assert.notEqual(result.stderr.trim(), '', 'hay un error en stderr')
  assert.equal(existsSync(missingDir), false)
})

test('criterio 11: un flag desconocido sale con código 1 y no escribe archivo', (t) => {
  const cwd = newTmp(t)
  assertUsageError(run(['export-csv', '--mes', '2026-08'], cwd), cwd)
})

test('criterio 12: --month sin valor o con un valor que empieza con -- sale con código 1', (t) => {
  for (const args of [['--month'], ['--month', '--include-void']]) {
    const cwd = newTmp(t)
    assertUsageError(run(['export-csv', ...args], cwd), cwd)
  }
})

test('criterio 13: un argumento suelto sale con código 1 y no escribe archivo', (t) => {
  const cwd = newTmp(t)
  assertUsageError(run(['export-csv', 'agosto'], cwd), cwd)
})

test('criterio 14: si no se puede escribir, sale con código 1, nombra la ruta y no muestra stack trace', (t) => {
  const cwd = newTmp(t)
  const result = run(['export-csv', '--out', cwd], cwd)
  assert.equal(result.status, 1)
  assert.ok(result.stderr.includes(cwd), 'stderr nombra la ruta')
  assert.doesNotMatch(result.stderr, /^ {4}at /m, 'sin stack trace')
})

test('criterio 17: --out no puede pisar src/data/invoices.json (ruta relativa ni absoluta)', (t) => {
  // Corre sobre una copia de src/: si el test está en rojo, la copia se daña, no el fixture del repo.
  const srcDir = dirname(cliPath)
  for (const variant of ['relativa', 'absoluta']) {
    const cwd = newTmp(t)
    cpSync(srcDir, join(cwd, 'src'), { recursive: true })
    const copyCli = join(cwd, 'src', 'cli.js')
    const dataFile = join(cwd, 'src', 'data', 'invoices.json')
    const before = readFileSync(dataFile)
    const out = variant === 'relativa' ? join('src', 'data', 'invoices.json') : dataFile
    const result = spawnSync(process.execPath, [copyCli, 'export-csv', '--out', out], { cwd, encoding: 'utf8' })
    assert.equal(result.status, 1, `ruta ${variant}: sale con código 1`)
    assert.match(result.stderr, /invoices\.json/, `ruta ${variant}: stderr nombra el archivo`)
    assert.deepEqual(readFileSync(dataFile), before, `ruta ${variant}: invoices.json queda intacto`)
    const list = spawnSync(process.execPath, [copyCli, 'list'], { cwd, encoding: 'utf8' })
    assert.equal(list.status, 0, `ruta ${variant}: list sigue funcionando`)
  }
})
