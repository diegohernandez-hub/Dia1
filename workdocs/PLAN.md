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
