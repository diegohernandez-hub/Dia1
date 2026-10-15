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
| T-01-story-1 | | | |
| T-01-story-2 | `npm test` | No corrido | Node.js/npm no están instalados en este equipo (sin permisos para instalar vía Homebrew). Se escribió `test/filters.test.js` con los 5 criterios (1, 3, 4, 5, 6) sobre `filterInvoices`, pero no se confirmó que falle en rojo antes de implementar `src/filters.js`. |
| T-01-story-3 | | | |

## Workers

Una tarea acotada y su resumen. Si hubo implementación y falta esta línea, M4 no pasa.

| Story | Tarea | Resumen |
|---|---|---|
| T-01-story-2 | Escribir el test de aceptación de `filterInvoices` según criterios 1, 3, 4, 5 y 6 de la spec | Se creó `test/filters.test.js` con un test por criterio. No se pudo ejecutar `npm test` por falta de Node.js/npm en el entorno. |

## Día 3

**Mergeó:**

**Quedó fuera (gap, no vendido como merge):**

**PRs:**
