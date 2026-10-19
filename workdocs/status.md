# status.md

Seguimiento y bitácora. No sustituye a la spec.

Edita este archivo en tu rama y cambia solo tu fila, para que el merge del Día 3 no tenga conflictos.

## Roles

El merge del equipo no aprueba a quien no rotó. Cada persona anota su nombre en al menos 2 roles.

| Persona | Roles (por ejemplo: redacción o grill de la spec, dueña de test, comentario de review) |
|---|---|
| Diego Hernández | Redacción de la spec, grill de la spec |
| Katia | Dueña de test, redacción |
| | |
| | |

## Grill

| Fecha | Quién | Archivo | Notas |
|---|---|---|---|
| 2026-10-14 | Diego | `workdocs/SPEC.md` | 6 preguntas: anuladas, separador, alcance (3 personas), `--out` sin carpeta, flags inválidos, nombre por defecto. Se agregan criterios 9 y 10 y se precisa la salida en stdout. |
| 2026-10-14 | Diego | `workdocs/SPEC.md` | Ronda 2, 5 preguntas: archivo bloqueado por Excel (error claro, criterio 14), argumentos sueltos y valores que empiezan con `--` (criterios 12 y 13), `\r\n` también en la última línea y 0 filas (criterios 2 y 6), supuestos congelados para T-01, escape de comillas se queda. |

## Tests de aceptación

Anota el comando y el resultado. Primero rojo. Después verde, o un gap citado.

| Story | Comando | Resultado | Gap (si sigue rojo) |
|---|---|---|---|
| T-01-story-1 | `npm test` | Rojo (2026-10-15): 7 tests, 4 pass, 3 fail; los 3 de `test/csv.test.js` (criterios 2, 6 y 15) fallaban con `ERR_MODULE_NOT_FOUND`. Verde (2026-10-19): 7 tests, 7 pass, 0 fail, con `toCsv` en `src/csv.js`. | |
| T-01-story-2 | `npm test` | Verde: 9/9 tests pasan (5 de `filters.test.js` + 4 de `invoices.test.js`), tras implementar `filterInvoices` en `src/filters.js`. | |
| T-01-story-3 | `npm test` | Rojo (2026-10-15): 9 de 9 tests de `test/export-csv.test.js` fallaban (criterios 1, 7–14), porque `export-csv` no existía. Verde (2026-10-19): 21 pass, 0 fail, con `export-csv` en `src/cli.js` sobre `toCsv` (story-1) y `filterInvoices` (story-2), traídas con merge. Caso borde, criterio 17 (2026-10-19): rojo con `--out src/data/invoices.json` (código 0 y datos pisados); verde con 22 pass y 0 fail. | |
| T-02-story-1 | `npm test` | Rojo (inicial): `test/api.test.js` fallaba con `ERR_MODULE_NOT_FOUND` (`src/server.js` no existía). Verde: 9/9 tests de `api.test.js` (criterios 18–26), con `parseFilters`/`selectInvoices` en `src/query.js` y `createServer` en `src/server.js`. `npm test` completo: 30 pass, 1 fail — el fail es el bug preexistente del criterio 17 (story-3, `samePath` no resuelve symlinks en macOS), no de esta story. | |
| T-02-story-2 | `npm test` | Rojo (2026-10-19): 24 tests, 21 pass, 3 fail; los 2 de `test/page.test.js` (criterios 27 unitario y 28) con `ERR_MODULE_NOT_FOUND`, más el criterio 17 del T-01 (ver gap). Verde de story-2 (2026-10-19): 24 tests, 23 pass, 1 fail; los criterios 27 (unitario) y 28 pasan con `src/page.js`. Página probada en el navegador con un servidor provisional fuera del repo: abierta + 2026-09 muestra F-1004 y total 450000. | Falta la ruta `GET /` y el test HTTP del 27, que esperan el merge de T-02-story-1; falta la prueba manual del 29 con `node src/server.js` y Excel. El criterio 17 del T-01 (`--out` con ruta absoluta) falla en macOS también en `main`, por el symlink `/var` → `/private/var`: no es de esta story. |

## Workers

Una tarea acotada y su resumen. Si hubo implementación y falta esta línea, M4 no pasa.

| Story | Tarea | Resumen |
|---|---|---|
| T-01-story-1 | Explore: revisar `test/csv.test.js` contra los criterios 2, 6 y 15 de `SPEC.md` y el contrato de `toCsv` en `PLAN.md` | OK, sin nada fuera de spec. Sugirió endurecer el criterio 2 (sin línea vacía final ni `\r` suelto); se aplicó. |
| T-01-story-2 | Escribir el test de aceptación de `filterInvoices` según criterios 1, 3, 4, 5 y 6 de la spec | Se creó `test/filters.test.js` con un test por criterio y se corrió con `npm test`: falla en rojo (`src/filters.js` no existe), como se esperaba antes de implementar. |
| T-01-story-3 | Revisar `test/export-csv.test.js` contra `SPEC.md`: cobertura, falsos rojos, sobreespecificación y portabilidad | Los 9 criterios propios están cubiertos y fallan por la causa correcta. El 10 exigía que stderr nombrara la ruta (la spec no lo pide): pasa a control positivo. El 9 dependía del filtro de story-2: ahora compara los ids finales. Se agregan `'\uFEFF'` explícito, detección de `\n` sueltos, carpeta vacía para "no escribe" y limpieza de tmp. |
| T-02-story-1 | Escribir el test de aceptación de la API (`parseFilters`/`selectInvoices`/`createServer`) según criterios 18 a 26 de la spec | Se creó `test/api.test.js` con un test por criterio; falló en rojo por `ERR_MODULE_NOT_FOUND` (`src/server.js` no existía). Tras implementar, 9/9 en verde. El test del criterio 23 se corrigió: `fetch().text()` descarta el BOM al decodificar, así que se verificó sobre los bytes crudos (`arrayBuffer`). |

## Día 3

**Mergeó:**

**Quedó fuera (gap, no vendido como merge):**

**PRs:**
