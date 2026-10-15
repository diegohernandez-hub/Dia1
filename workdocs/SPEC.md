# SPEC.md

Uno por equipo. Un extraño tiene que poder entenderlo sin el ticket abierto. Complétalo en M1. Grílalo en M2: el entregable es un diff en este archivo.

Ticket: [`tickets/T-01.md`](../tickets/T-01.md).

## Problema

Cada cierre de mes, tesorería de Andes Lab copia a mano el listado de facturas (`node src/cli.js list`) a una planilla para generar el CSV que manda al banco. Les toma cerca de una hora, se cuelan facturas anuladas y a veces Excel en Windows muestra mal los acentos.

## Alcance

Al cerrar, el repo tiene:

1. Un comando nuevo en la CLI:

   ```
   node src/cli.js export-csv [--month YYYY-MM] [--include-void] [--out <ruta>]
   ```

2. El comando escribe un CSV con este formato:
   - Columnas en este orden, con esta cabecera exacta: `id;cliente;fecha;monto;estado`.
   - Separador `;`, porque Excel con configuración regional de Chile usa la coma como separador decimal.
   - Codificación UTF-8 con BOM (`EF BB BF` al inicio), para que Excel en Windows muestre bien los acentos.
   - Fin de línea `\r\n`.
   - Para los valores:
     - `fecha` va como en los datos, en formato `YYYY-MM-DD`.
     - `monto` es un entero sin separador de miles ni símbolo; por ejemplo, `1250000`.
     - `estado` lleva el valor crudo: `paid`, `open` o `void`.
   - Si un valor contiene `;`, `"` o un salto de línea, va entre comillas dobles y las comillas internas se duplican (RFC 4180).
   - Las filas van en el mismo orden que el listado (`listInvoices()`).
3. Los filtros funcionan así:
   - Por defecto, el CSV excluye las facturas con estado `void`.
   - `--include-void` las incluye. Es para el caso "a veces sí, para cuadrar".
   - `--month YYYY-MM` deja solo las facturas cuya `fecha` cae en ese mes. Es opcional: sin él, salen todos los meses.
4. El archivo de salida funciona así:
   - Por defecto es `facturas.csv`, en el directorio actual.
   - `--out <ruta>` cambia el nombre o la ruta.
   - Si el archivo ya existe, se sobrescribe.
5. Al terminar bien, el comando imprime por stdout la ruta del archivo y la cantidad de filas exportadas, y sale con código `0`.
6. Hay tests de aceptación en `test/` que se corren con `npm test`.

## Aceptación observable

Todos los criterios se verifican con los 4 datos de `src/data/invoices.json` y con `npm test`.

1. **Base:** `node src/cli.js export-csv` crea `facturas.csv` y sale con código `0`. El archivo:
   - empieza con los bytes `EF BB BF`;
   - tiene la cabecera `id;cliente;fecha;monto;estado`;
   - tiene 3 filas de datos, F-1001, F-1002 y F-1004 en ese orden, con F-1003 (`void`) excluida;
   - usa `\r\n` como fin de línea.
2. **Monto numérico:** la fila de F-1001 es exactamente `F-1001;Constructora Sur;2026-08-02;1250000;paid`.
3. **Filtro por mes:** `export-csv --month 2026-08` deja solo F-1001 y F-1002.
4. **Anuladas a pedido:**
   - `export-csv --include-void` exporta las 4 facturas, con F-1003 y estado `void`.
   - `export-csv --month 2026-09 --include-void` exporta F-1003 y F-1004.
5. **Nombre de archivo:** `export-csv --out export-tesoreria-agosto.csv` escribe en esa ruta y no crea `facturas.csv`.
6. **Mes sin facturas:** `export-csv --month 2026-01` escribe un archivo solo con BOM y cabecera, y sale con código `0`.
7. **Mes inválido:** si `--month` no cumple `YYYY-MM` (por ejemplo `--month agosto` o `--month 2026-13`), el comando:
   - sale con código distinto de `0`;
   - imprime un error por stderr que menciona `YYYY-MM`;
   - no crea ni modifica el archivo de salida.
8. **Escape:** si un cliente tiene `;` o `"` en el nombre, la fila queda entre comillas según RFC 4180. Se prueba con la función que arma el CSV, sin cambiar `invoices.json`.
9. **Sin regresión:**
   - `list` y `get` se comportan igual que hoy;
   - los tests existentes siguen pasando;
   - `list` sigue mostrando la factura `void`.

## Fuera de alcance

- Endpoint HTTP, login o cualquier despliegue a producción.
- Generar `.xlsx` u otros formatos distintos de CSV.
- Formato bancario específico (layout de un banco en particular). El CSV es el que hoy arma tesorería a mano.
- Traducir los estados (`paid` → `pagada`) o formatear el monto con separador de miles.
- Filtros por rango de fechas, por cliente o por estado, aparte de incluir o excluir `void`.
- Cambiar `src/data/invoices.json` o el comportamiento de `list` y `get`.
- Nombre de archivo automático según el mes. Si quieren `export-tesoreria-agosto.csv`, lo pasan con `--out`.

## Decisiones abiertas para el grill (M2)

Son supuestos de este borrador. Hay que confirmarlos o cambiarlos antes de commitear el contrato:

- **Anuladas:** este borrador las excluye por defecto y las incluye con `--include-void`. El ticket dice "creo que no, o a veces sí". ¿Lo confirma María?
- **Separador `;` vs `,`:** el `;` asume que Excel usa la configuración regional de Chile. ¿Lo confirma tesorería, o el banco exige `,`?
- **Columnas en español con estados en inglés:** ¿la cabecera va en español (`cliente`, `fecha`, `monto`) y los valores de `estado` quedan crudos?
- **Acentos:** los datos de prueba no tienen acentos. El criterio 1 verifica el BOM, pero no que Excel abra bien el archivo; eso queda como verificación manual de María.
