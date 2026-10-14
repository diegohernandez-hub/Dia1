# SPEC.md

Uno por equipo. Fuente: `tickets/T-01.md`. Grill (M2) en dos rondas el 2026-10-14 y revisado con el checklist (problema, alcance, aceptación, supuestos y paths).

## Problema

Tesorería arma a mano, cada cierre de mes, el CSV de facturas para el banco: le toma ~1 hora y se cuelan facturas anuladas.

## Alcance

Al cerrar, el repo tiene un comando nuevo en la CLI:

```
node src/cli.js export-csv [--month YYYY-MM] [--include-void] [--out <ruta>]
```

Archivos de contacto:

- Punto de entrada: `src/cli.js` (se agrega el comando `export-csv`).
- Fuente de datos: `src/data/invoices.json`, solo lectura.
- Dónde vive la lógica del export y dónde van los tests nuevos lo decide `workdocs/PLAN.md`.

Comportamiento:

- Columnas, en este orden y con esta cabecera: `id;cliente;fecha;monto;estado`.
  - `fecha` = `issuedAt` tal cual (`YYYY-MM-DD`).
  - `monto` = entero sin formato (`1250000`, no `$1.250.000`).
  - `estado` = valor del JSON tal cual (`paid`, `open`, `void`).
- Formato para Excel de Windows con configuración regional de Chile:
  - Codificación UTF-8 con BOM (`EF BB BF` al inicio).
  - Separador `;`.
  - Fin de línea `\r\n` en todas las líneas, incluida la última.
  - Un campo que contenga `;`, `"` o un salto de línea va entre comillas dobles, con las `"` internas duplicadas.
- Por defecto excluye las facturas `void`. Con `--include-void` las incluye.
- `--month YYYY-MM` es opcional: deja solo las facturas cuyo `issuedAt` cae en ese mes. Sin el flag, exporta todos los meses.
- `--out <ruta>` es opcional. Por defecto escribe `facturas.csv` en el directorio actual.
  - Si el archivo existe, lo sobrescribe.
  - Si la carpeta de `<ruta>` no existe, sale con código 1 y un error en stderr; no crea carpetas.
- Si no se puede escribir el archivo (por ejemplo, porque está abierto en Excel o porque `<ruta>` es una carpeta), sale con código 1. stderr nombra la ruta y sugiere cerrar el archivo si está abierto, sin stack trace.
- Argumentos inválidos: salen con código 1, imprimen el uso en stderr y no escriben archivo. Son inválidos:
  - un flag desconocido (por ejemplo `--mes`);
  - un argumento suelto, sin flag (por ejemplo `export-csv agosto`);
  - `--month` o `--out` sin valor, o con un valor que empieza con `--` (por ejemplo `--month --include-void`).
- Las filas salen en el mismo orden del JSON.
- Al terminar, imprime en stdout una línea `<ruta>: <n> filas` y sale con código 0. `<ruta>` es la que se pasó en `--out`, o `facturas.csv` por defecto; `n` no cuenta la cabecera.

## Aceptación observable

Con el `src/data/invoices.json` actual (F-1001 a F-1004). Cada criterio corre el CLI como proceso, con `cwd` en una carpeta nueva de `os.tmpdir()` (`<tmp>`), para no ensuciar el repo y para que el test corra en Windows y en CI.

1. `export-csv` sin flags escribe `<tmp>/facturas.csv` e imprime `facturas.csv: 3 filas`. El archivo empieza con el BOM UTF-8, tiene la cabecera `id;cliente;fecha;monto;estado` y las filas de F-1001, F-1002 y F-1004, en ese orden. F-1003 (`void`) no aparece.
2. La fila de F-1001 es exactamente `F-1001;Constructora Sur;2026-08-02;1250000;paid`. Cada línea, incluida la última, termina en `\r\n`.
3. `export-csv --month 2026-08` exporta solo F-1001 y F-1002.
4. `export-csv --month 2026-09` exporta solo F-1004.
5. `export-csv --month 2026-09 --include-void` exporta F-1003 y F-1004.
6. `export-csv --month 2026-07` (mes sin facturas) imprime `facturas.csv: 0 filas`, sale con código 0, y el archivo es exactamente el BOM seguido de `id;cliente;fecha;monto;estado\r\n`.
7. `export-csv --month 2026-8` y `export-csv --month agosto` salen con código 1, stderr contiene `YYYY-MM` y no se escribe `<tmp>/facturas.csv`.
8. `export-csv --out <tmp>/export-tesoreria-agosto.csv` escribe en esa ruta.
9. Correr `export-csv --month 2026-08` y después `export-csv` sobre el mismo `<tmp>`: `facturas.csv` queda con 3 filas (el segundo export sobrescribe al primero).
10. `export-csv --out <tmp>/no-existe/a.csv` sale con código 1 y no crea `<tmp>/no-existe`.
11. `export-csv --mes 2026-08` sale con código 1 y no escribe archivo.
12. `export-csv --month` (sin valor) y `export-csv --month --include-void` salen con código 1 y no escriben archivo.
13. `export-csv agosto` sale con código 1 y no escribe archivo.
14. `export-csv --out <tmp>` (`<tmp>` es una carpeta, no un archivo) sale con código 1, stderr contiene la ruta y no contiene un stack trace (ninguna línea que empiece con `    at `). Este criterio es el sustituto testeable de "archivo abierto en Excel", que no se puede reproducir en CI.
15. La función que arma el texto del CSV (su nombre y firma los fija `PLAN.md`), con un cliente que contiene `;` y otro con `"`, devuelve esos campos entre comillas, con las `"` duplicadas, y cada fila tiene 5 columnas. Es un test unitario con datos en memoria; no toca `invoices.json`.
16. `list`, `get` y los tests de `test/invoices.test.js` siguen pasando sin cambios (`npm test`).

## Fuera de alcance

- El formato específico del banco (columnas extra, nombres de columna del banco, layout fijo). Si el banco exige uno, es otro ticket.
- Generar `.xlsx` o cualquier formato distinto de CSV.
- Traducir los estados (`paid` → `pagada`) o formatear montos como moneda. Ver el supuesto S4.
- Filtros adicionales: por cliente, por estado distinto de `void` o por rango de fechas.
- Cambiar `invoices.json`, `src/invoices.js`, `list` o `get`.
- Pedir confirmación antes de sobrescribir, o escribir con otro nombre si el archivo está bloqueado.
- Endpoint HTTP, login o despliegue.

## Supuestos y decisiones

Nada de esto está en el ticket tal cual. Para T-01 quedan **congelados**: si María pide otra cosa (por ejemplo, coma como separador o estados en español), se abre un ticket nuevo y esta spec no se reabre.

| # | Supuesto / decisión | Origen | Riesgo si está mal | Criterios |
|---|---|---|---|---|
| S1 | Anuladas fuera por defecto, con `--include-void` para cuadrar | Grill (el ticket es ambiguo) | Bajo: el flag cubre el otro caso | 1, 5 |
| S2 | Separador `;` | Inferido: Excel en español usa `;` | **Alto**: si el banco exige `,`, vuelve el ticket | 2 |
| S3 | UTF-8 con BOM | Inferido de "abre mal los acentos" | Bajo | 1, 6 |
| S4 | Estados en inglés tal cual (`paid`, `open`, `void`) | Decisión del equipo | **Alto**: si la planilla usa español, vuelve el ticket | 2 |
| S5 | Filtro `--month YYYY-MM` | Decisión del equipo (el ticket dice "filtrar por mes") | Bajo | 3–7, 12 |
| S6 | Nombre `facturas.csv` por defecto y `--out` para otro nombre | Grill | Bajo | 1, 8 |
| S7 | `\r\n` en todas las líneas, incluida la última | Grill | Bajo | 2, 6 |
| S8 | Escape de comillas | Grill: se queda, para no desarmar el archivo del banco | Bajo | 15 |
| S9 | Orden del JSON, sobrescribir sin preguntar, mensaje `<ruta>: <n> filas` | Decisión del equipo | Bajo | 1, 6, 9 |
| S10 | Error si la carpeta de `--out` no existe o si los argumentos son inválidos (flag desconocido, argumento suelto, valor faltante o que empieza con `--`) | Grill | Bajo | 10–13 |
| S11 | Error claro, sin stack trace, si no se puede escribir el archivo | Grill | Bajo | 14 |
| S12 | Equipo de 3 personas: 3 stories (base / `--month` / `--include-void` + `--out`) | Grill | — | Reparto en `PLAN.md` |
