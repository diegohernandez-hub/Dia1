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
| | | `workdocs/SPEC.md` | |

## Tests de aceptación

Anota el comando y el resultado. Primero rojo. Después verde, o un gap citado.

| Story | Comando | Resultado | Gap (si sigue rojo) |
|---|---|---|---|
| T-01-story-1 | `npm test` | Rojo (2026-10-15): 7 tests, 4 pass, 3 fail. Fallan los 3 de `test/csv.test.js` (criterios 2, 6 y 15) con `ERR_MODULE_NOT_FOUND`: `src/csv.js` no existe. | Falta implementar `toCsv` en `src/csv.js`. |
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
