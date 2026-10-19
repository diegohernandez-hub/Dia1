import { existsSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { toCsv } from './csv.js'
import { filterInvoices } from './filters.js'
import { getInvoice, listInvoices } from './invoices.js'

const USAGE = [
  'usage: node src/cli.js <list|get|export-csv> [id]',
  '       node src/cli.js export-csv [--month YYYY-MM] [--include-void] [--out <ruta>]',
].join('\n')
const MONTH_FORMAT = /^\d{4}-(0[1-9]|1[0-2])$/
const DATA_PATH = join(dirname(fileURLToPath(import.meta.url)), 'data', 'invoices.json')

function printInvoice(invoice) {
  console.log(
    [invoice.id, invoice.client, invoice.issuedAt, invoice.amount, invoice.status].join('\t'),
  )
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

// Argumentos de export-csv (SPEC: Alcance, "Argumentos inválidos"; criterios 7, 11, 12 y 13).
function parseExportArgs(args) {
  const options = { month: null, includeVoid: false, out: 'facturas.csv' }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--include-void') {
      options.includeVoid = true
    } else if (arg === '--month' || arg === '--out') {
      const value = args[i + 1]
      if (value === undefined || value.startsWith('--')) {
        return { error: `${arg} necesita un valor` }
      }
      options[arg.slice(2)] = value
      i++
    } else if (arg.startsWith('--')) {
      return { error: `flag desconocido: ${arg}` }
    } else {
      return { error: `argumento inesperado: ${arg}` }
    }
  }
  if (options.month !== null && !MONTH_FORMAT.test(options.month)) {
    return { error: `--month debe tener el formato YYYY-MM (por ejemplo 2026-08), no "${options.month}"` }
  }
  return options
}

// En Windows las rutas no distinguen mayúsculas: SRC\Data\Invoices.json es el mismo archivo.
function samePath(a, b) {
  const norm = (path) => (process.platform === 'win32' ? resolve(path).toLowerCase() : resolve(path))
  return norm(a) === norm(b)
}

function isDirectory(path) {
  return existsSync(path) && statSync(path).isDirectory()
}

// Comando export-csv (SPEC: criterios 1 y 7 a 14).
function exportCsv(args) {
  const options = parseExportArgs(args)
  if (options.error) {
    fail(`${options.error}\n${USAGE}`)
  }

  // SPEC criterio 17: --out nunca puede pisar la fuente de datos.
  if (samePath(options.out, DATA_PATH)) {
    fail(`--out no puede ser el archivo de datos (${options.out}): se perderían las facturas. Usa otra ruta.`)
  }

  const folder = dirname(resolve(options.out))
  if (!isDirectory(folder)) {
    fail(`no existe la carpeta de ${options.out}: ${folder}`)
  }

  const invoices = filterInvoices(listInvoices(), {
    month: options.month,
    includeVoid: options.includeVoid,
  })

  try {
    writeFileSync(options.out, toCsv(invoices))
  } catch (error) {
    fail(
      `no se pudo escribir ${options.out} (${error.code ?? error.message}). ` +
        'Si el archivo está abierto en Excel, ciérralo y vuelve a intentar.',
    )
  }

  console.log(`${options.out}: ${invoices.length} filas`)
  process.exit(0)
}

const [, , command, ...args] = process.argv

if (command === 'list') {
  for (const invoice of listInvoices()) {
    printInvoice(invoice)
  }
  process.exit(0)
}

if (command === 'get') {
  const [id] = args
  if (!id) {
    console.error('usage: node src/cli.js get <id>')
    process.exit(1)
  }
  const invoice = getInvoice(id)
  if (!invoice) {
    console.error(`not found: ${id}`)
    process.exit(1)
  }
  printInvoice(invoice)
  process.exit(0)
}

if (command === 'export-csv') {
  exportCsv(args)
}

console.error(USAGE)
process.exit(1)
