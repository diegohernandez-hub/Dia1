# PLAN.md

Uno por equipo. Deriva de `workdocs/SPEC.md` (grill en dos rondas, 2026-10-14). Se hace commit a `main` antes de crear los worktrees.

El diseño técnico de cada story va aquí. No hay `DESIGN.md`.

Cada story tiene una persona, un worktree, una rama `feat/T-01-story-<n>` y un PR. El reparto es **por archivo**, para que nadie pise el trabajo de otro: cada story crea o toca solo sus archivos.

## Contratos compartidos

Son las firmas que las tres stories respetan. Si alguien necesita cambiar una, la cambia aquí, en `main`, antes de codear.

```js
// src/csv.js (story-1)
export function toCsv(invoices) // → string
// invoices: [{ id, client, issuedAt, amount, status }], en el orden en que llegan.
// Devuelve el archivo completo: BOM + cabecera + filas, separador ';', '\r\n' en todas las líneas.

// src/filters.js (story-2)
export function filterInvoices(invoices, { month = null, includeVoid = false } = {}) // → invoices[]
// month: 'YYYY-MM' ya validado, o null (todos los meses). No valida formato.
// includeVoid: false excluye status === 'void'. Mantiene el orden de entrada. No muta el arreglo.

// src/cli.js (story-3)
// export-csv: parsea y valida argumentos → listInvoices() → filterInvoices() → toCsv() → escribe el archivo.
```

`src/invoices.js` y `src/data/invoices.json` no cambian.

## Stories

### Story 1: `feat/T-01-story-1` · armar el CSV

**Persona:** Joaquin Martinez

**Qué entra:** `toCsv(invoices)` en `src/csv.js`. Es una función pura: no lee ni escribe archivos y no filtra.

**Diseño técnico (qué toca, contratos, orden):**

1. Crea `src/csv.js` con `toCsv` según el contrato.
2. Cabecera fija `id;cliente;fecha;monto;estado`. Mapeo: `id`, `client`, `issuedAt` tal cual, `amount` como entero sin formato, `status` tal cual.
3. Antepone el BOM (`﻿`) y termina cada línea, incluida la última, en `\r\n`.
4. Escape: un campo con `;`, `"`, `\r` o `\n` va entre comillas dobles, con las `"` internas duplicadas.
5. Con un arreglo vacío devuelve `﻿` + `id;cliente;fecha;monto;estado\r\n`.

**Archivos:** `src/csv.js` (nuevo), `test/csv.test.js` (nuevo).

**Criterios de la spec que resuelve:** 2, 6 (contenido del archivo vacío) y 15. Aporta al 1 (BOM y cabecera).

**Test de aceptación (falla antes de codear):** `test/csv.test.js`, un test por criterio, con el número en el nombre:

- `criterio 2: la fila de F-1001 es exacta y cada línea termina en \r\n`
- `criterio 6: sin facturas devuelve BOM + cabecera + \r\n`
- `criterio 15: un cliente con ; o " va entre comillas y la fila tiene 5 columnas`

Comando: `npm test`. Falla porque `src/csv.js` no existe.

### Story 2: `feat/T-01-story-2` · filtrar

**Persona:**

**Qué entra:** `filterInvoices(invoices, opciones)` en `src/filters.js`. Es una función pura: no valida el formato de `month` (eso es story-3).

**Diseño técnico (qué toca, contratos, orden):**

1. Crea `src/filters.js` con `filterInvoices` según el contrato.
2. Si `includeVoid` es `false`, excluye `status === 'void'`.
3. Si `month` no es `null`, deja solo las facturas cuyo `issuedAt` empieza con `month + '-'`.
4. Mantiene el orden de entrada y devuelve un arreglo nuevo.

**Archivos:** `src/filters.js` (nuevo), `test/filters.test.js` (nuevo). Los tests usan `listInvoices()` como fuente.

**Criterios de la spec que resuelve:** 3, 4, 5 y la parte de filtrado del 1 y del 6.

**Test de aceptación (falla antes de codear):** `test/filters.test.js`:

- `criterio 1: sin opciones excluye F-1003 y deja F-1001, F-1002, F-1004 en orden`
- `criterio 3: month 2026-08 deja F-1001 y F-1002`
- `criterio 4: month 2026-09 deja solo F-1004`
- `criterio 5: month 2026-09 con includeVoid deja F-1003 y F-1004`
- `criterio 6: month 2026-07 devuelve []`

Comando: `npm test`. Falla porque `src/filters.js` no existe.

### Story 3: `feat/T-01-story-3` · el comando `export-csv`

**Persona:**

**Qué entra:** el comando `export-csv` en `src/cli.js`: parseo y validación de argumentos, escritura del archivo, salida en stdout y errores. **Solo esta story toca `src/cli.js`.**

**Diseño técnico (qué toca, contratos, orden):**

1. En `src/cli.js`, agrega la rama `export-csv` antes del mensaje de uso. `list` y `get` no cambian.
2. Parseo de argumentos: acepta `--month <valor>`, `--include-void` y `--out <valor>`. Es error (código 1, uso en stderr, sin escribir archivo):
   - un flag desconocido o un argumento suelto;
   - `--month` o `--out` sin valor, o con un valor que empieza con `--`;
   - un `--month` que no calza con `^\d{4}-(0[1-9]|1[0-2])$` (stderr contiene `YYYY-MM`).
3. Flujo: `listInvoices()` → `filterInvoices(invoices, { month, includeVoid })` → `toCsv(...)`.
4. Escritura: si no hay `--out`, usa `facturas.csv` relativo al `cwd`. Antes de escribir, verifica que la carpeta exista (si no existe: código 1, sin crearla). Escribe con `writeFileSync` y sobrescribe si el archivo existe. Si la escritura falla (`EBUSY`, `EPERM`, `EISDIR`, etc.), sale con código 1 y un mensaje que nombra la ruta y sugiere cerrar el archivo si está abierto. Nunca muestra un stack trace.
5. Si todo sale bien: stdout `<ruta>: <n> filas` (la ruta tal como se pasó) y código 0.

**Archivos:** `src/cli.js`, `test/export-csv.test.js` (nuevo). Los tests corren `node src/cli.js` con `child_process.spawnSync` y `cwd` en una carpeta nueva de `os.tmpdir()`.

**Criterios de la spec que resuelve:** 1, 7, 8, 9, 10, 11, 12, 13, 14 y 16.

**Test de aceptación (falla antes de codear):** `test/export-csv.test.js`, un test por criterio, con el número en el nombre (`criterio 1: …` a `criterio 14: …`). El 16 lo cubre `npm test` completo.

Comando: `npm test`. Falla porque `export-csv` no existe (sale con el mensaje de uso y código 1).

**Dependencia:** el test rojo se escribe de inmediato. Para ponerlo en verde se necesitan `toCsv` y `filterInvoices`: cuando las ramas 1 y 2 estén en verde y con push, trae su código con `git merge origin/feat/T-01-story-1 origin/feat/T-01-story-2`. Si no llegan a tiempo, anota el gap en `status.md`.

<!-- Si son 4 personas: story-4 `feat/T-01-story-4` toma el paso 2 de story-3 (parseo y validación de argumentos) en `src/args.js` con `parseExportArgs(argv) → { month, includeVoid, out } | { error }`, y los criterios 7, 11, 12 y 13. story-3 solo lo llama. -->

## Casos borde (Día 3)

Una línea por caso: quién, qué criterio de la spec y en qué story.

- **Diego Hernández** · criterio 17 · story-3 (`src/cli.js`): `--out` apuntando a `src/data/invoices.json` borraba los datos. Ahora `export-csv` lo rechaza antes de escribir.

## Orden

- **Story 1 y story 2 son independientes** entre sí: pueden avanzar en paralelo desde el primer minuto.
- **Story 3 depende de las dos** para estar en verde, no para empezar: su test rojo y el parseo de argumentos se escriben en paralelo.
- **Orden del merge (Día 3):** story-1 → story-2 → story-3. Así cada merge queda con `npm test` en verde en `main`.

---

# T-02: Panel de facturas (equipo de 2)

Deriva de la sección T-02 de `workdocs/SPEC.md` (criterios 18 a 30). Se hace commit a `main` antes de crear los worktrees. Timebox: 55 min (LAB 6).

Dos stories, una por persona, con reparto **por archivo**. La única costura es `src/server.js`: lo crea story-1 y story-2 le agrega una ruta después. Por eso el merge va en orden: story-1 → story-2.

## Contratos compartidos (T-02)

```js
// src/query.js (story-1)
export function parseFilters(searchParams) // → { status, month } | { error }
// searchParams: URLSearchParams. '' cuenta como ausente (null).
// status: 'paid' | 'open' | 'void' | null. month: 'YYYY-MM' | null (valida ^\d{4}-(0[1-9]|1[0-2])$).
// Error de status: mensaje con 'paid, open, void'. Error de month: mensaje con 'YYYY-MM'.

export function selectInvoices(invoices, { status = null, month = null } = {}) // → invoices[]
// status null: filterInvoices(invoices, { month }) (sin anuladas, como el T-01).
// status dado: filterInvoices(invoices, { month, includeVoid: true }) y deja solo ese status.
// Mantiene el orden y no muta.

// src/server.js (story-1 lo crea; story-2 agrega la ruta GET /)
export function createServer() // → http.Server sin escuchar (los tests hacen listen(0))
// Rutas: GET /api/invoices, GET /api/export.csv (story-1); GET / (story-2); el resto, 404.
// Si se corre directo (node src/server.js): listen(process.env.PORT ?? 3000) e imprime la URL.

// src/page.js (story-2)
export function totalAmount(invoices) // → number, suma de amount; [] → 0
export function renderPage() // → string: el HTML completo, con totalAmount.toString() dentro del <script>
```

El navegador usa la API de story-1 tal como la fija la SPEC: `GET /api/invoices?status=&month=` devuelve el arreglo y `GET /api/export.csv?status=&month=` baja el archivo. Story-2 no necesita el código de story-1 para empezar, solo este contrato.

## Story 1: `feat/T-02-story-1` · servidor, API y descarga

**Persona:**

**Qué entra:** el servidor con las dos rutas de datos (corresponde a S1 y S3 del ticket) y los filtros comunes.

**Diseño técnico (qué toca, contratos, orden):**

1. Crea `src/query.js` con `parseFilters` y `selectInvoices` según el contrato. Reusa `filterInvoices` del T-01; no lo modifica.
2. Crea `src/server.js` con `createServer()` (`node:http`). Parsea la URL con `new URL(req.url, 'http://localhost')`.
3. `GET /api/invoices`: `parseFilters`; si hay error, 400 con JSON `{ error }`. Si no, `selectInvoices(listInvoices(), filtros)` y 200 con JSON.
4. `GET /api/export.csv`: mismos filtros y mismo 400. Si no hay error, 200 con `toCsv(selección)`, `text/csv; charset=utf-8` y `Content-Disposition: attachment; filename="facturas.csv"`.
5. Cualquier otra ruta, 404. Deja un comentario `// story-2: GET /` en el punto donde story-2 agrega su ruta, para que el diff de story-2 sea de dos líneas.
6. Arranque directo: si `process.argv[1]` resuelve a este archivo, escucha en `PORT ?? 3000` e imprime `http://localhost:<puerto>`.

**Archivos:** `src/query.js` (nuevo), `src/server.js` (nuevo), `test/api.test.js` (nuevo).

**Criterios de la spec que resuelve:** 18 a 26.

**Test de aceptación (falla antes de codear):** `test/api.test.js`. Levanta `createServer().listen(0)` en un `before` y lo cierra en un `after`; usa `fetch`. Un test por criterio, con el número en el nombre:

- `criterio 18: /api/invoices sin filtros devuelve F-1001, F-1002, F-1004`
- `criterio 19: status=open devuelve F-1002 y F-1004`
- `criterio 20: month=2026-08 devuelve F-1001 y F-1002`
- `criterio 21: status=void y month=2026-09 devuelve solo F-1003`
- `criterio 22: status o month inválidos responden 400 con el mensaje`
- `criterio 23: /api/export.csv es el toCsv del T-01, como attachment`
- `criterio 24: export.csv respeta status y month`
- `criterio 25: export.csv con month inválido responde 400 sin CSV`
- `criterio 26: una ruta desconocida responde 404`

Comando: `npm test`. Falla porque `src/server.js` no existe.

## Story 2: `feat/T-02-story-2` · página, filtros y total

**Persona:**

**Qué entra:** la página que ve María (S2 del ticket): tabla, filtros, total y el botón de descarga, y la ruta `GET /`.

**Diseño técnico (qué toca, contratos, orden):**

1. Crea `src/page.js` con `totalAmount` y `renderPage` según el contrato.
2. `renderPage()` devuelve un HTML con `<select name="status">` (`""` Todas sin anuladas, `paid` pagada, `open` abierta, `void` anulada), `<input type="month" name="month">`, una `<table>` con id, cliente, fecha, monto y estado, `<span id="total">` y `<a id="descargar" href="/api/export.csv">Descargar CSV</a>`.
3. Script inline: incrusta `totalAmount.toString()`. Al cargar y en cada `change`, arma los query params (omite los vacíos), hace `fetch('/api/invoices?' + params)`, pinta las filas (con `textContent`, nunca `innerHTML` con datos), pone el total y actualiza el `href` de `#descargar` a `/api/export.csv?` con los mismos params. Si la API responde 400, muestra el `error` en la página.
4. Cuando story-1 esté en verde y con push: `git merge origin/feat/T-02-story-1`. En `src/server.js`, en el comentario `// story-2: GET /`, agrega la ruta: `GET /` → 200, `text/html; charset=utf-8`, `renderPage()`. Ese es el único cambio de story-2 fuera de sus archivos.
5. Prueba manual del criterio 29 con `node src/server.js` en el navegador y Excel. Anota el resultado en `status.md`.

**Archivos:** `src/page.js` (nuevo), `test/page.test.js` (nuevo), `src/server.js` (solo la ruta `GET /`, después del merge de story-1).

**Criterios de la spec que resuelve:** 27, 28 y 29.

**Test de aceptación (falla antes de codear):** `test/page.test.js`:

- `criterio 28: totalAmount suma los montos y da 0 sin facturas`: unitario, solo con `src/page.js`.
- `criterio 27: GET / sirve el HTML con tabla, filtros, total y Descargar CSV`: levanta `createServer().listen(0)` y hace `fetch('/')`.

Comando: `npm test`. Falla porque `src/page.js` no existe. Después del merge de story-1, el criterio 27 sigue en rojo (404) hasta que se agrega la ruta.

## Orden (T-02)

| Min | Story 1 | Story 2 |
|---|---|---|
| 0–10 | Commit a `main` de `tickets/T-02.md`, SPEC y PLAN. Crea el worktree | Crea el worktree |
| 10–25 | Test rojo de `api.test.js`, después `query.js` y `server.js` en verde, push | Test rojo de `page.test.js`, después `totalAmount` y `renderPage` |
| 25–40 | PR, review de Claude contra la SPEC, comentario de story-2, arreglos, **merge** | `git merge origin/main` (ya trae story-1), ruta `GET /`, verde, PR |
| 40–55 | Review del PR de story-2 (comentario que cita la SPEC) | Arreglos, **merge**, prueba manual del criterio 29, `status.md` al día |

- **Story-1 no depende de nadie.** Story-2 depende de story-1 solo para el criterio 27 (la ruta `/`).
- **Orden del merge:** story-1 → story-2. Story-2 trae `main` antes de su PR, así su diff sobre `src/server.js` queda en dos líneas sin conflicto.
- **Hook de tests del kit:** bloquea `git commit` si `npm test` falla. El test rojo no se puede commitear solo: córrelo, pega la salida roja en `status.md` y commitea test y código juntos cuando estén en verde. Nunca uses `--no-verify` (deja 0 en seguridad).
- **Si se acaba el tiempo:** lo que no está mergeado a las 18:40 se anota como gap en `status.md`, no como hecho.

## Worktrees (T-02)

```
git pull origin main
git worktree add -b feat/T-02-story-1 ../Dia1-T02-story-1 main   # persona A
git worktree add -b feat/T-02-story-2 ../Dia1-T02-story-2 main   # persona B
```
