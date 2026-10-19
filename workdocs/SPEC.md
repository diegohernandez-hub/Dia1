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
  - Si `<ruta>` es la fuente de datos (`src/data/invoices.json`), por ruta relativa o absoluta, sale con código 1, stderr nombra el archivo y la fuente queda intacta. Sin esta regla, el export la reemplaza por el CSV y la CLI deja de funcionar.
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
17. Caso borde (Lab 5, Día 3): `export-csv --out src/data/invoices.json`, con ruta relativa y con ruta absoluta, sale con código 1, stderr contiene `invoices.json` y el archivo queda byte a byte igual. Después, `list` sigue funcionando. El test corre sobre una copia de `src/` en `<tmp>`, para no arriesgar el fixture.

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
| S12 | Equipo de 3 personas, reparto por archivo: story-1 `src/csv.js` (`toCsv`), story-2 `src/filters.js` (`filterInvoices`), story-3 `src/cli.js` (`export-csv`) | Guía del Día 2 | — | Detalle en `PLAN.md` |
| S13 | `--out` nunca puede apuntar a la fuente de datos | Caso borde del Lab 5 (Diego): el export la reemplazaba y se perdían las facturas | Alto si falta: se pierden datos | 17 |

---

# T-02: Panel de facturas

Fuente: `tickets/T-02.md`. Escrita el 2026-10-19; reparto para 3 personas (S18). Los criterios siguen la numeración del T-01 (18 en adelante), para que un PR pueda citar "criterio 21 de la SPEC" sin ambigüedad.

## Problema

María ya tiene el CSV del T-01, pero para revisar las facturas antes de mandarlas tiene que abrir la terminal. Quiere verlas en el navegador, filtrarlas y bajar el mismo CSV.

## Alcance

Al cerrar, el repo tiene un servidor local:

```
node src/server.js        →  http://localhost:3000
```

Archivos de contacto:

- Servidor: `src/server.js` (nuevo). Solo `node:http`; sin `npm install`.
- Datos: `src/invoices.js` (`listInvoices()`), solo lectura. `src/data/invoices.json` no cambia.
- Reusa del T-01, sin modificarlos: `filterInvoices` (`src/filters.js`) y `toCsv` (`src/csv.js`).
- Dónde vive cada función y los tests nuevos lo decide `workdocs/PLAN.md`.

Comportamiento:

- `node src/server.js` escucha en el puerto `PORT` del entorno, o 3000 si no está, e imprime `http://localhost:<puerto>` en stdout.
- **Filtros comunes** (query string de `/api/invoices` y `/api/export.csv`):
  - `status`: ausente o vacío = todas **menos** las anuladas (igual que el T-01 sin `--include-void`). `paid`, `open` o `void` = solo ese estado.
  - `month`: ausente o vacío = todos los meses. `YYYY-MM` = solo las facturas cuyo `issuedAt` cae en ese mes.
  - Un valor inválido responde `400` con JSON `{ "error": "<mensaje>" }`. Si el inválido es `status`, el mensaje contiene `paid, open, void`; si es `month`, contiene `YYYY-MM`.
  - Las filas salen en el orden del JSON.
- `GET /api/invoices` responde `200`, `Content-Type: application/json; charset=utf-8`, con un arreglo de facturas con los campos del JSON tal cual (`id`, `client`, `issuedAt`, `amount`, `status`).
- `GET /api/export.csv` responde `200`, `Content-Type: text/csv; charset=utf-8` y `Content-Disposition: attachment; filename="facturas.csv"`. El cuerpo es exactamente `toCsv(...)` del T-01, con la misma selección que `/api/invoices` para los mismos filtros.
- `GET /` responde `200`, `Content-Type: text/html; charset=utf-8`: un solo HTML con su JS inline, sin archivos estáticos aparte, que contiene:
  - una tabla con columnas id, cliente, fecha, monto y estado; el monto va como entero sin formato;
  - un `<select name="status">` con las opciones Todas sin anuladas (`""`), pagada (`paid`), abierta (`open`) y anulada (`void`);
  - un `<input type="month" name="month">`;
  - un elemento `id="total"` con la suma de los montos de las filas visibles;
  - un enlace con el texto `Descargar CSV`, cuyo `href` es `/api/export.csv` con los filtros actuales.
  - Al cambiar un filtro, la página pide `/api/invoices` con esos filtros y vuelve a pintar la tabla, el total y el `href` del enlace.
- El total se calcula con una función `totalAmount` testeable en Node; la página usa esa misma función.
- Cualquier otra ruta o método responde `404`.

## Aceptación observable

Con el `src/data/invoices.json` actual (F-1001 a F-1004). Los tests levantan el servidor en un puerto libre (`listen(0)`) y lo consultan con `fetch`; no dependen del puerto 3000.

18. `GET /api/invoices` responde 200 con `application/json` y los ids F-1001, F-1002 y F-1004, en ese orden. F-1003 (`void`) no aparece.
19. `GET /api/invoices?status=open` devuelve F-1002 y F-1004.
20. `GET /api/invoices?month=2026-08` devuelve F-1001 y F-1002.
21. `GET /api/invoices?status=void&month=2026-09` devuelve solo F-1003.
22. `GET /api/invoices?status=pagada` responde 400 y `error` contiene `paid, open, void`. `GET /api/invoices?month=2026-8` responde 400 y `error` contiene `YYYY-MM`.
23. `GET /api/export.csv` responde 200 con `text/csv`; `Content-Disposition` contiene `attachment` y `facturas.csv`. El cuerpo es byte a byte igual a `toCsv` de F-1001, F-1002 y F-1004: empieza con el BOM y la cabecera `id;cliente;fecha;monto;estado`.
24. `GET /api/export.csv?status=void` trae solo la fila de F-1003. `GET /api/export.csv?month=2026-08` trae F-1001 y F-1002.
25. `GET /api/export.csv?month=agosto` responde 400 y no entrega CSV (el `Content-Type` no es `text/csv`).
26. `GET /no-existe` responde 404.
27. `GET /` responde 200 con `text/html`, y el HTML contiene `<table`, un `<select name="status">` con opciones `paid`, `open` y `void`, `<input type="month"`, `id="total"`, el texto `Descargar CSV` con un `href` que empieza con `/api/export.csv`, y el código de `totalAmount`.
28. `totalAmount([])` devuelve 0. `totalAmount` de F-1001, F-1002 y F-1004 devuelve 2590000. Es un test unitario con datos en memoria.
29. Prueba manual, como María (se anota en `status.md`): `node src/server.js`, abrir http://localhost:3000 y elegir abierta y 2026-09. La tabla muestra solo F-1004 y el total 450000. "Descargar CSV" baja `facturas.csv` y abre en Excel con F-1004.
30. `npm test` queda en verde, con los tests del T-01 sin cambios.

## Fuera de alcance

- Login, base de datos, deploy, frameworks de front y cualquier `npm install`.
- La S4 del ticket (monto en pesos chilenos, anuladas en gris, búsqueda por cliente): solo entra si sobra tiempo y como story aparte con su criterio.
- Editar o crear facturas, paginación y orden por columna.
- Cambiar `src/invoices.js`, `src/filters.js`, `src/csv.js`, `src/cli.js` o `invoices.json`.
- Estilos más allá de lo mínimo para que la tabla se lea.

## Supuestos y decisiones

| # | Supuesto / decisión | Origen | Riesgo si está mal | Criterios |
|---|---|---|---|---|
| S14 | Sin filtro de estado se ven todas **menos** las anuladas, igual que el CSV del T-01 por defecto | Decisión del equipo: "el mismo CSV del T-01" | Medio: si María quiere ver todo de entrada, se agrega una opción "Todas" | 18, 23 |
| S15 | Los valores de estado en la API y en el CSV quedan en inglés; en el `<select>` se muestran en español | Coherente con S4 del T-01 | Bajo | 19, 22, 27 |
| S16 | La tabla y el CSV usan la misma selección: lo que se ve es lo que se baja | Ticket ("con los filtros aplicados") | Bajo | 23, 24 |
| S17 | Puerto 3000 por defecto y `PORT` opcional; los tests usan un puerto libre | Ticket y CI | Bajo | 18–28 |
| S18 | Equipo de 3 personas, reparto por archivo según las stories del ticket: story-1 API (`src/query.js`, `src/server.js` con `/api/invoices`), story-2 página (`src/page.js` y la ruta `/`), story-3 descarga (la ruta `/api/export.csv`) | Guía del Día 3 | — | Detalle en `PLAN.md` |
