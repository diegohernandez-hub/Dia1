# status.md

Seguimiento y bitácora. No sustituye a la spec.

Edita este archivo en tu rama y cambia solo tu fila, para que el merge del Día 3 no tenga conflictos.

## Roles

El merge del equipo no aprueba a quien no rotó. Cada persona anota su nombre en al menos 2 roles.

| Persona | Roles (por ejemplo: redacción o grill de la spec, dueña de test, comentario de review) |
|---|---|
| | |
| | |
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
| T-01-story-2 | | | |
| T-01-story-3 | | | |

## Workers

Una tarea acotada y su resumen. Si hubo implementación y falta esta línea, M4 no pasa.

| Story | Tarea | Resumen |
|---|---|---|
| T-01-story-1 | Explore: revisar `test/csv.test.js` contra los criterios 2, 6 y 15 de `SPEC.md` y el contrato de `toCsv` en `PLAN.md` | OK, sin nada fuera de spec. Sugirió endurecer el criterio 2 (sin línea vacía final ni `\r` suelto); se aplicó. |

## Día 3

**Mergeó:**

**Quedó fuera (gap, no vendido como merge):**

**PRs:**
