// Casos borde del servidor (workdocs/SPEC.md, criterios 31 a 34).
// Corren `node src/server.js` como proceso, como test/export-csv.test.js, porque
// lo que se prueba es el arranque y que el proceso siga vivo.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createServer as createNetServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
const serverPath = join(srcDir, 'server.js')

// Arranca el servidor y espera la URL en stdout, o que el proceso termine.
function startServer(t, path, port) {
  const child = spawn(process.execPath, [path], {
    env: { ...process.env, PORT: String(port) },
  })
  t.after(() => child.kill())
  let stdout = ''
  let stderr = ''
  child.stdout.setEncoding('utf8').on('data', (chunk) => (stdout += chunk))
  child.stderr.setEncoding('utf8').on('data', (chunk) => (stderr += chunk))
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`el servidor no arrancó ni terminó: ${stderr}`)), 5000)
    child.stdout.on('data', () => {
      const match = stdout.match(/http:\/\/localhost:(\d+)/)
      if (match) {
        clearTimeout(timer)
        resolve({ url: match[0], port: Number(match[1]), stderr: () => stderr })
      }
    })
    child.on('exit', (code) => {
      clearTimeout(timer)
      resolve({ code, stdout, stderr })
    })
  })
}

function assertNoStackTrace(stderr) {
  assert.doesNotMatch(stderr, /^ {4}at /m, 'sin stack trace')
}

test('criterio 31: con invoices.json corrupto las APIs responden 500 con JSON y el servidor sigue vivo', async (t) => {
  // Copia de src/: el fixture del repo nunca se toca.
  const dir = mkdtempSync(join(tmpdir(), 'server-edge-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  cpSync(srcDir, join(dir, 'src'), { recursive: true })
  writeFileSync(join(dir, 'src', 'data', 'invoices.json'), '{')

  const server = await startServer(t, join(dir, 'src', 'server.js'), 0)
  assert.ok(server.url, `el servidor arrancó (código ${server.code}, stderr: ${server.stderr})`)

  for (const path of ['/api/invoices', '/api/export.csv']) {
    const res = await fetch(`${server.url}${path}`)
    assert.equal(res.status, 500, `${path} responde 500`)
    assert.match(res.headers.get('content-type'), /^application\/json/, `${path} responde JSON`)
    const body = await res.json()
    assert.equal(typeof body.error, 'string', `${path} trae error`)
    assert.doesNotMatch(body.error, /\bat /, `${path} sin stack trace en el cuerpo`)
  }

  const page = await fetch(`${server.url}/`)
  assert.equal(page.status, 200, 'después del error, GET / sigue respondiendo')
})

test('criterio 32: con el puerto ocupado sale con código 1, nombra el puerto y sin stack trace', async (t) => {
  const blocker = createNetServer()
  await new Promise((resolve) => blocker.listen(0, resolve))
  t.after(() => blocker.close())
  const { port } = blocker.address()

  const result = await startServer(t, serverPath, port)
  assert.equal(result.code, 1, 'sale con código 1')
  assert.match(result.stderr, new RegExp(String(port)), 'stderr nombra el puerto')
  assertNoStackTrace(result.stderr)
})

test('criterio 33: PORT inválido sale con código 1 y PORT=0 imprime el puerto real', async (t) => {
  for (const port of ['abc', '70000', '-1']) {
    const result = await startServer(t, serverPath, port)
    assert.equal(result.code, 1, `PORT=${port} sale con código 1`)
    assert.match(result.stderr, /PORT/, `PORT=${port}: stderr contiene PORT`)
    assertNoStackTrace(result.stderr)
  }

  const server = await startServer(t, serverPath, 0)
  assert.ok(server.port > 0, `PORT=0 imprime el puerto real, no :0 (${server.url})`)
  assert.equal((await fetch(`${server.url}/api/invoices`)).status, 200, 'la URL impresa responde')
})

test('criterio 34: un método distinto de GET en una ruta conocida responde 404', async (t) => {
  const server = await startServer(t, serverPath, 0)
  for (const path of ['/api/invoices', '/api/export.csv', '/']) {
    const res = await fetch(`${server.url}${path}`, { method: 'POST' })
    assert.equal(res.status, 404, `POST ${path} responde 404`)
  }
})
