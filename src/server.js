import { createServer as createHttpServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { toCsv } from './csv.js'
import { listInvoices } from './invoices.js'
import { renderPage } from './page.js'
import { parseFilters, selectInvoices } from './query.js'

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

export function createServer() {
  return createHttpServer((req, res) => {
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
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = process.env.PORT ?? 3000
  const server = createServer()
  server.listen(port, () => {
    console.log(`http://localhost:${port}`)
  })
}
