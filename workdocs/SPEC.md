# SPEC.md

Uno por equipo. Fuente: `tickets/T-01.md`. Grill (M2) hecho el 2026-10-14: decisiones al final.

## Problema

Tesorería de Andes Lab arma a mano, copiando desde `node src/cli.js list`, el CSV de facturas que manda al banco. Le toma ~1 hora por cierre de mes y se cuelan facturas anuladas.

## Alcance

Al cerrar, el repo tiene un comando nuevo en la CLI:

```
node src/cli.js export-csv [--month YYYY-MM] [--include-void] [--out <ruta>]
```

- Escribe un CSV a partir de `src/data/invoices.json`.
- Columnas, en este orden y con esta cabecera: `id;cliente;fecha;monto;estado`.
  - `fecha` = `issuedAt` tal cual (`YYYY-MM-DD`).
  - `monto` = entero sin formato (`1250000`, no `$1.250.000`).
  - `estado` = valor del JSON tal cual (`paid`, `open`, `void`).
- Formato para que abra bien en Excel de Windows con configuración regional de Chile:
  - Codificación UTF-8 **con BOM** (`EF BB BF` al inicio), para que los acentos se vean bien.
  - Separador `;`, porque Excel en español usa `;` como separador de lista.
  - Fin de línea `\r\n`.
  - Un campo que contenga `;`, `"` o un salto de línea va entre comillas dobles, con las `"` internas duplicadas.
- Por defecto **excluye** las facturas `void`. Con `--include-void` las incluye.
- `--month YYYY-MM` es opcional: deja solo las facturas cuyo `issuedAt` cae en ese mes. Sin el flag, exporta todos los meses.
- `--out <ruta>` es opcional. Por defecto escribe `facturas.csv` en el directorio actual. Si el archivo existe, lo sobrescribe. Si la carpeta de `<ruta>` no existe, sale con código 1 y un error en stderr; no crea carpetas.
- Un flag desconocido (por ejemplo `--mes`), o `--month`/`--out` sin valor, sale con código 1, imprime el uso en stderr y no escribe archivo.
- Las filas salen en el mismo orden del JSON.
- Al terminar, imprime en stdout una línea `<ruta>: <n> filas` (n sin contar la cabecera) y sale con código 0.

## Aceptación observable

Con el `src/data/invoices.json` actual (F-1001 a F-1004):

1. `export-csv` sin flags escribe `facturas.csv`, imprime `facturas.csv: 3 filas`, y el archivo empieza con el BOM UTF-8, tiene la cabecera `id;cliente;fecha;monto;estado` y las filas de F-1001, F-1002 y F-1004, en ese orden. F-1003 (`void`) no aparece.
2. La fila de F-1001 es exactamente `F-1001;Constructora Sur;2026-08-02;1250000;paid`, y las líneas terminan en `\r\n`.
3. `export-csv --month 2026-08` exporta solo F-1001 y F-1002.
4. `export-csv --month 2026-09` exporta solo F-1004; con `--month 2026-09 --include-void`, exporta F-1003 y F-1004.
5. `export-csv --month 2026-07` (mes sin facturas) escribe un archivo con solo la cabecera y sale con código 0.
6. `export-csv --month 2026-8` o `--month agosto` sale con código 1, imprime un error en stderr que indica el formato `YYYY-MM` y no escribe archivo.
7. `export-csv --out <tmp>/export-tesoreria-agosto.csv` escribe en esa ruta (`<tmp>` = carpeta creada con `os.tmpdir()`, para que el test corra en Windows y en CI).
8. Un cliente con `;` o `"` en el nombre sale entre comillas y el CSV sigue teniendo 5 columnas (test con datos en memoria, sin tocar el fixture).
9. `export-csv --out <tmp>/no-existe/a.csv` sale con código 1 y no crea `<tmp>/no-existe`.
10. `export-csv --mes 2026-08` y `export-csv --month` (sin valor) salen con código 1 y no escriben archivo.
11. `list`, `get` y los tests actuales de `test/invoices.test.js` siguen pasando sin cambios.

## Fuera de alcance

- El formato específico del banco (columnas extra, nombres de columna del banco, layout fijo). Si el banco exige uno, es otro ticket.
- Generar `.xlsx` o cualquier formato distinto de CSV.
- Traducir los estados (`paid` → `pagada`) o formatear montos como moneda.
- Filtros adicionales: por cliente, por estado distinto de `void` o por rango de fechas.
- Cambiar `invoices.json`, `list` o `get`.
- Endpoint HTTP, login o despliegue.

## Decisiones del grill (2026-10-14, Diego)

- **Anuladas fuera por defecto**, con `--include-void` para cuadrar.
- **Separador `;`**, para que Excel con configuración regional de Chile abra el archivo en columnas. Si el banco exige otro formato, es otro ticket.
- **Nombre por defecto `facturas.csv`**, fijo. Para otro nombre está `--out`.
- **`--out` a una carpeta que no existe da error** (código 1); no se crean carpetas.
- **Un flag desconocido o sin valor da error** (código 1), para que un typo no exporte todos los meses sin avisar.
- **Equipo de 3 personas.** El alcance cabe en 3 stories (base / `--month` / `--include-void` + `--out`); el reparto final va en `PLAN.md`.
