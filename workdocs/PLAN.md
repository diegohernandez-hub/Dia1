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

# T-02: Panel de facturas (equipo de 3)

Deriva de la sección T-02 de `workdocs/SPEC.md` (criterios 18 a 30). Sigue las stories sugeridas del ticket: S1 · API, S2 · Página, S3 · Descarga. Una persona por story, reparto **por archivo**.

La única costura es `src/server.js`: lo crea story-1, y story-2 y story-3 le agregan **una ruta cada una, en su propio comentario marcador**. Los marcadores están separados por una línea, así que git integra las dos ramas sin conflicto (probado el 2026-10-19 con dos ramas que editan líneas separadas por una línea en blanco).

| Story | Persona | Rama | Criterios |
|---|---|---|---|
| S1 · API | Katia | `feat/T-02-story-1` | 18–22 y 26 |
| S2 · Página | Joaquin Martinez | `feat/T-02-story-2` | 27, 28 y 29 |
| S3 · Descarga | Diego Hernández (además coordinador) | `feat/T-02-story-3` | 23, 24 y 25 |

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

// src/server.js (story-1 lo crea)
export function createServer() // → http.Server sin escuchar (los tests hacen listen(0))
// Si se corre directo (node src/server.js): listen(process.env.PORT ?? 3000) e imprime la URL.

// src/page.js (story-2)
export function totalAmount(invoices) // → number, suma de amount; [] → 0
export function renderPage() // → string: el HTML completo, con totalAmount.toString() dentro del <script>
```

Forma de `createServer()` que deja story-1. Cada marcador lo reemplaza **solo** su story, y nadie más toca estas líneas:

```js
    if (req.method === 'GET' && url.pathname === '/api/invoices') { ... }   // story-1

    // story-3: GET /api/export.csv

    // story-2: GET /

    res.writeHead(404, ...)                                                  // story-1
```

El navegador usa la API tal como la fija la SPEC: `GET /api/invoices?status=&month=` devuelve el arreglo y `GET /api/export.csv?status=&month=` baja el archivo. Ninguna story necesita el código de otra para **empezar**, solo este contrato.

## Story 1: `feat/T-02-story-1` · API

**Persona:** Katia

**Qué entra:** los filtros comunes y el servidor con `GET /api/invoices` y el 404 (S1 del ticket).

**Diseño técnico (qué toca, contratos, orden):**

1. Crea `src/query.js` con `parseFilters` y `selectInvoices` según el contrato. Reusa `filterInvoices` del T-01; no lo modifica.
2. Crea `src/server.js` con `createServer()` (`node:http`). Parsea la URL con `new URL(req.url, 'http://localhost')`.
3. `GET /api/invoices`: `parseFilters`; si hay error, 400 con JSON `{ error }`. Si no, `selectInvoices(listInvoices(), filtros)` y 200 con `application/json; charset=utf-8`.
4. Deja los dos marcadores `// story-3: GET /api/export.csv` y `// story-2: GET /`, separados por una línea en blanco, antes del 404.
5. Cualquier otra ruta o método, 404.
6. Arranque directo: si `process.argv[1]` resuelve a este archivo, escucha en `PORT ?? 3000` e imprime `http://localhost:<puerto>`.

**Archivos:** `src/query.js` (nuevo), `src/server.js` (nuevo), `test/api.test.js` (nuevo).

**Criterios de la spec que resuelve:** 18, 19, 20, 21, 22 y 26.

**Test de aceptación (falla antes de codear):** `test/api.test.js`. Levanta `createServer().listen(0)` en un `before` y lo cierra en un `after`; usa `fetch`. Un test por criterio:

- `criterio 18: /api/invoices sin filtros devuelve F-1001, F-1002, F-1004`
- `criterio 19: status=open devuelve F-1002 y F-1004`
- `criterio 20: month=2026-08 devuelve F-1001 y F-1002`
- `criterio 21: status=void y month=2026-09 devuelve solo F-1003`
- `criterio 22: status o month inválidos responden 400 con el mensaje`
- `criterio 26: una ruta desconocida responde 404`

Comando: `npm test`. Falla porque `src/server.js` no existe.

**Ajuste pendiente (2026-10-19):** la rama ya tiene push (`c187c4a`) con el reparto anterior de 2 personas, que incluía `/api/export.csv`. Para el reparto de 3, Katia saca de su rama el bloque `GET /api/export.csv` de `src/server.js` (lo reemplaza por el marcador `// story-3: GET /api/export.csv`), el `import { toCsv }` que queda sin uso y los tests de los criterios 23, 24 y 25 de `test/api.test.js`. Lo anota en su fila de `status.md`, commit y push. Esos criterios pasan a story-3.

## Story 2: `feat/T-02-story-2` · página, filtros y total

**Persona:** Joaquin Martinez

**Qué entra:** la página que ve María (S2 del ticket): tabla, filtros, total y el botón de descarga, y la ruta `GET /`.

**Diseño técnico (qué toca, contratos, orden):**

1. Crea `src/page.js` con `totalAmount` y `renderPage` según el contrato.
2. `renderPage()` devuelve un HTML con `<select name="status">` (`""` Todas sin anuladas, `paid` pagada, `open` abierta, `void` anulada), `<input type="month" name="month">`, una `<table>` con id, cliente, fecha, monto y estado, `<span id="total">` y `<a id="descargar" href="/api/export.csv">Descargar CSV</a>`.
3. Script inline: incrusta `totalAmount.toString()`. Al cargar y en cada `change`, arma los query params (omite los vacíos), hace `fetch('/api/invoices?' + params)`, pinta las filas (con `textContent`, nunca `innerHTML` con datos), pone el total y actualiza el `href` de `#descargar` a `/api/export.csv?` con los mismos params. Si la API responde 400, muestra el `error` en la página.
4. Cuando story-1 esté en `main`: `git merge origin/main`. En `src/server.js`, reemplaza el marcador `// story-2: GET /` por la ruta: `GET /` → 200, `text/html; charset=utf-8`, `renderPage()`. Ese es el único cambio de story-2 fuera de sus archivos.
5. Prueba manual de tabla, filtros y total con `node src/server.js`. "Descargar CSV" da 404 hasta que story-3 llegue a `main`: es esperado.

**Archivos:** `src/page.js` (nuevo), `test/page.test.js` (nuevo), `src/server.js` (solo la ruta `GET /`, después del merge de story-1).

**Criterios de la spec que resuelve:** 27, 28 y 29 (el 29 se cierra en la integración final, con las tres stories en `main`).

**Test de aceptación (falla antes de codear):** `test/page.test.js`:

- `criterio 28: totalAmount suma los montos y da 0 sin facturas`: unitario, solo con `src/page.js`.
- `criterio 27: renderPage trae tabla, filtros, total, Descargar CSV y totalAmount`: unitario sobre el string de `renderPage()`, sin servidor.
- `criterio 27: GET / sirve ese HTML con text/html`: levanta `createServer().listen(0)` y hace `fetch('/')`. **Se escribe después de `git merge origin/main`**, cuando `src/server.js` ya existe.

Comando: `npm test`. Falla porque `src/page.js` no existe. El 27 va partido en dos porque el hook bloquea el commit con `npm test` en rojo: con el 27 unitario, story-2 commitea `page.js` en verde sin esperar a story-1.

**Estado (2026-10-19):** `page.js` y los dos tests unitarios ya tienen push (`6f55c8d`, `d55c3ef`). Falta el paso 4.

## Story 3: `feat/T-02-story-3` · descarga CSV

**Persona:** Diego Hernández

**Qué entra:** `GET /api/export.csv` (S3 del ticket), con los mismos filtros que la API.

**Diseño técnico (qué toca, contratos, orden):**

1. Escribe el test rojo de inmediato (`test/export.test.js`). Importa `../src/server.js` y `../src/csv.js`.
2. Cuando story-1 tenga push con el ajuste (o esté en `main`): `git merge origin/feat/T-02-story-1` (o `origin/main`).
3. En `src/server.js`, reemplaza el marcador `// story-3: GET /api/export.csv` por la ruta: `parseFilters` (si hay error, 400 con JSON `{ error }`, igual que `/api/invoices`); si no, 200 con `toCsv(selectInvoices(listInvoices(), filtros))`, `text/csv; charset=utf-8` y `Content-Disposition: attachment; filename="facturas.csv"`. Agrega `import { toCsv } from './csv.js'`.
4. No crea archivos de producto nuevos: reusa `parseFilters`, `selectInvoices` y `toCsv` sin modificarlos.

**Archivos:** `test/export.test.js` (nuevo), `src/server.js` (solo la ruta de export y su import).

**Criterios de la spec que resuelve:** 23, 24 y 25.

**Test de aceptación (falla antes de codear):** `test/export.test.js`, con `createServer().listen(0)` y `fetch`:

- `criterio 23: /api/export.csv es el toCsv del T-01, como attachment`: compara los **bytes** (`arrayBuffer`) con `Buffer.from(toCsv(...))` de F-1001, F-1002 y F-1004; `fetch().text()` se come el BOM.
- `criterio 24: export.csv respeta status y month`
- `criterio 25: export.csv con month inválido responde 400 sin CSV`

Comando: `npm test`. Falla porque `src/server.js` no existe (antes del merge de story-1) o porque la ruta responde 404 (después).

## Orden (T-02)

| Paso | Story 1 (Katia) | Story 2 (Joaquin) | Story 3 (Diego) |
|---|---|---|---|
| 1 | Ajuste: saca export de su rama, verde, push | (ya tiene `page.js` en verde) | Test rojo de `export.test.js`; pega la salida en `status.md` |
| 2 | PR → review del agente → comentario de Joaquin → arreglos → **merge** | — | `git merge origin/feat/T-02-story-1`, ruta de export, verde, push |
| 3 | — | `git merge origin/main`, ruta `GET /`, test HTTP del 27, verde, PR → review del agente → comentario de Diego → **merge** | — |
| 4 | — | — | `git merge origin/main`, verde, PR → review del agente → comentario de Katia → **merge** |
| 5 | Integración final en `main`: `npm test` en verde y criterio 29 completo (tabla, filtros, total y descarga en Excel) | | |

- **Orden del merge:** story-1 → story-2 → story-3. Cada story trae `main` antes de su PR, así cada PR es chico y llega sin conflictos.
- **`status.md`:** cada uno edita solo su fila. La fila `T-02-story-3` la agrega Diego en su rama, debajo de la de story-2; al traer `main` en el paso 4 puede aparecer un conflicto de una línea con la fila de Joaquin, y se resuelve dejando las dos.
- **Hook de tests del kit:** bloquea `git commit` si `npm test` falla. El test rojo no se commitea solo: se corre, la salida roja va a `status.md`, y test y código se commitean juntos en verde. Nunca `--no-verify` (deja 0 en seguridad).
- **Lo que no esté mergeado** queda como gap en `status.md`, no como hecho.

## Worktrees (T-02)

Cada persona trabaja en su computador, en su worktree.

```
# Katia y Joaquin (ya tienen su rama): en su worktree
git pull

# Diego, en Dia1/
git pull origin main
git worktree add ../Dia1-T02-story-3 feat/T-02-story-3
```

## Coordinador y revisor (T-02): el estándar del Día 3

Copia de la demo "En vivo: un coordinador moderniza MOD-7 y otro agente revisa cada PR", con el T-02 en vez de MOD-7. Las decisiones, las reviews finales y los merges son de las personas. **Sin `gh`:** los PRs, los comentarios y los merges se hacen en la web de GitHub (https://github.com/diegohernandez-hub/Dia1).

| Sesión | Dónde corre | Quién | Qué hace | Qué no hace |
|---|---|---|---|---|
| **Coordinador** | `Dia1/` (en `main`), computador de Diego | Diego | Vigila ramas, `status.md` y PRs; lanza el revisor sobre cada rama y le pasa el informe a la persona dueña del PR | No escribe código de producto. No hace merge |
| **Worker 1** | worktree de story-1, computador de Katia | Katia | Story-1 | No toca `src/page.js` ni la ruta de export |
| **Worker 2** | worktree de story-2, computador de Joaquin | Joaquin | Story-2 | No toca `src/query.js` ni la ruta de export |
| **Worker 3** | `../Dia1-T02-story-3`, computador de Diego | Diego | Story-3 | No toca `src/query.js` ni `src/page.js` |
| **Revisor** | Subagente `revisor-spec` (`.claude/agents/revisor-spec.md`), lanzado por el coordinador; contexto limpio y solo lectura | — | Compara el diff de la rama con `workdocs/SPEC.md` y lista solo las brechas, con la frase de la spec y la línea del código | No edita, no comenta en GitHub, no aprueba |

**Reviews cruzadas:** quien escribió el código no es el único que lo revisa. Cada PR pasa por el revisor (paso 1) y por una persona que no lo escribió (paso 2): **Joaquin comenta el PR de Katia, Diego el de Joaquin y Katia el de Diego.** Cada uno hace merge de su propio PR.

### Prompts

**Worker (cada persona, Claude abierto de cero en su worktree):**

> ¿En qué story estoy y cuáles son sus criterios? Escribe el test de aceptación de mi story según PLAN.md y córrelo: tiene que fallar. Pega la salida roja en mi fila de `workdocs/status.md`. Después implementa hasta verde, commit y push. No abras el PR: escribe el body con `.github/pull_request_template.md` en un archivo fuera del repo (links al ticket y a SPEC.md, criterios por número y el informe: salida de `npm test` y un `curl` de mi ruta) y dame el título. Para.

**Abrir el PR (cada persona, en la web):** `https://github.com/diegohernandez-hub/Dia1/compare/main...feat/T-02-story-<n>` → título y body → **Create draft pull request**.

**Revisar (coordinador, por cada PR):**

> `git fetch origin`. Usa el subagente revisor-spec sobre la rama `feat/T-02-story-<n>`, con `git diff origin/main...origin/feat/T-02-story-<n>`. Dame su lista en texto para pegarla en el PR y anota la tarea y el resumen en la tabla Workers de `status.md`.

La persona dueña del PR pega el informe como comentario en el PR. Por cada observación: si es real, la reproduce con un test que falla, arregla en la misma rama y responde con el commit; si no aplica, responde por qué, citando la SPEC o el diff. "Sin hallazgos" también se comenta.

### Qué tiene que atrapar el revisor (los "23:30 y 00:00" del T-02)

- **S14 / criterio 18:** sin `status`, ¿excluye las `void`? Un `selectInvoices` que use `includeVoid: true` siempre pasa el 19 y el 21 y rompe el 18.
- **Criterio 22 y 25:** `status=` vacío cuenta como ausente (no 400); `status=PAID` o `month=2026-13` sí son 400. En el 25, la respuesta de error no puede salir con `text/csv`.
- **Criterio 23 / S16:** el CSV es `toCsv(...)` byte a byte, con BOM. Un `res.end` con otra codificación o un `\n` agregado lo rompe y Excel lo nota.
- **Criterio 27:** la página arma el `href` de "Descargar CSV" con los **mismos** params que el `fetch` (lo que se ve es lo que se baja). Pinta con `textContent`, nunca `innerHTML` con datos de facturas.
- **Marcadores:** cada story reemplaza solo su marcador en `src/server.js`. Un diff que mueve o borra el marcador de otra story genera conflicto.
- **Fuera de alcance:** ningún `npm install`, ningún cambio en `src/filters.js`, `src/csv.js`, `src/cli.js` ni `invoices.json`. El diff que no está en la SPEC no entra.

### Contra el puntaje (100)

| Puntos | Qué lo asegura en este plan |
|---|---|
| 25 UI | Criterio 29 probado desde `main` con las tres stories mergeadas |
| 25 Trazabilidad | Cada test nombra su criterio; cada PR cita criterios; informe del revisor + comentario humano cruzado + merge humano |
| 20 Calidad | Un test por criterio (18–28) y `npm test` verde en `main` |
| 15 Seguridad | Hook del kit activo (`/hooks`), sin `--no-verify`, sin secretos |
| 15 Estado | `status.md`: roles (2 por persona), rojo y verde por story, workers (revisor), links a los 3 PRs; una sesión nueva sobre `main` sabe qué quedó |

### Presentación (3 min)

1. **UI en vivo (1 min):** `node src/server.js`, abierta + 2026-09 → F-1004 y total 450000, "Descargar CSV" y abrirlo en Excel.
2. **Una story trazable (1 min):** criterio 23 en SPEC → test `criterio 23` en `test/export.test.js` → PR de story-3 que lo cita → informe del revisor → comentario de Katia → merge.
3. **Estado (1 min):** `status.md` y `npm test` verde sobre `main`.
