import { createServer as createHttpServer } from 'node:http'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { toCsv } from './csv.js'
import { listInvoices } from './invoices.js'
import { renderPage } from './page.js'
import { parseFilters, selectInvoices } from './query.js'

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

const PORT_FORMAT = /^\d+$/

function handleRequest(req, res) {
  const url = new URL(req.url, 'http://localhost')

  if (req.method === 'GET' && url.pathname === '/api/invoices') {
    const filters = parseFilters(url.searchParams)
    if (filters.error) {
      sendJson(res, 400, { error: filters.error })
      return
    }
    sendJson(res, 200, selectInvoices(listInvoices(), filters))
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/export.csv') {
    const filters = parseFilters(url.searchParams)
    if (filters.error) {
      sendJson(res, 400, { error: filters.error })
      return
    }
    const csv = toCsv(selectInvoices(listInvoices(), filters))
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="facturas.csv"',
    })
    res.end(csv)
    return
  }

  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(renderPage())
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('not found')
}

export function createServer() {
  return createHttpServer((req, res) => {
    // SPEC criterio 31: un error al leer las facturas no bota el servidor.
    try {
      handleRequest(req, res)
    } catch (error) {
      console.error(`error en ${req.method} ${req.url}: ${error.message}`)
      if (res.headersSent) {
        res.end()
        return
      }
      sendJson(res, 500, {
        error: 'No se pudieron leer las facturas. Revisa src/data/invoices.json y vuelve a intentar.',
      })
    }
  })
}

// En Windows las rutas no distinguen mayúsculas, como samePath en src/cli.js.
function isMainModule() {
  if (!process.argv[1]) return false
  const norm = (path) => (process.platform === 'win32' ? resolve(path).toLowerCase() : resolve(path))
  return norm(process.argv[1]) === norm(fileURLToPath(import.meta.url))
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

// SPEC criterios 32 y 33: errores de arranque claros, con código 1 y sin stack trace.
function start() {
  const rawPort = process.env.PORT ?? '3000'
  const port = Number(rawPort)
  if (!PORT_FORMAT.test(rawPort) || port > 65535) {
    fail(`PORT debe ser un número entre 0 y 65535, no "${rawPort}".`)
  }
  const server = createServer()
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      fail(`el puerto ${port} ya está en uso. Cierra el otro servidor o usa otro puerto con la variable PORT.`)
    }
    fail(`no se pudo iniciar el servidor en el puerto ${port} (${error.code ?? error.message}).`)
  })
  server.listen(port, () => {
    console.log(`http://localhost:${server.address().port}`)
  })
}

if (isMainModule()) {
  start()
}
