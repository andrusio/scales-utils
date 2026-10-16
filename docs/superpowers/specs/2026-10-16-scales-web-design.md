# Identificador de escalas en el mástil — Diseño

## Intención (el por qué)

Existe `scales-utils`, un programa de Go que, dada una lista de notas
(`-notas "C,D,E,F,G"`), busca y rankea las escalas musicales que las
contienen, mostrando coincidencias, similitud y notas faltantes. Su uso es
por línea de comandos, escribiendo las notas a mano.

Se quiere una herramienta visual para guitarra y otros instrumentos de
cuerda: en lugar de tipear notas, el usuario las clickea sobre un mástil.
La web traduce esos clicks al mismo análisis que ya hace el script.

Los usos que motivan esto (todos válidos, para el mismo dueño):

- **Analizar una canción:** tengo las notas de una canción y quiero saber
  qué escala improvisar encima.
- **Explorar el mástil:** estoy practicando y quiero ver qué escalas encajan
  con lo que voy tocando.
- **Aprender escalas:** quiero visualizar cómo se ven las escalas en el mástil.
- **Componer:** tengo un riff o melodía con ciertas notas y busco a qué
  escala pertenece.

## Objetivos

- Una página que se abre directamente en el navegador (doble clic), sin
  instalar nada, sin correr un servidor, sin paso de build.
- Mástil de guitarra horizontal, estilo tablatura, con clicks para marcar notas.
- Identificar, a partir de las notas marcadas, qué escalas encajan, con el
  mismo criterio y orden que el script de Go.
- Mostrar los modos griegos en un panel aparte, ya que como conjunto de notas
  siempre coinciden con Mayor o Natural Menor.
- Afinación, cantidad de cuerdas y cantidad de trastes configurables.
- Guardar y recuperar configuraciones vía exportar/importar un archivo `.json`.

## No-objetivos

- No hay backend, servidor, base de datos ni cuentas.
- No se agregan ni editan escalas desde la interfaz (se editan en el código).
- No hay audio, ni reproducción, ni metrónomo.
- No se calcula digitación, cejillas ni posiciones "cómodas" de la escala.

## Anti-objetivos (qué haría fracasar esto aunque "funcione")

- Que requiera instalar Node, Python, un servidor o un bundler para usarse.
- Que necesite internet para abrirse (debe andar offline).
- Que la lógica de matching se desvíe del script de Go y dé resultados
  distintos para las mismas notas.
- Que la interfaz sea tan cargada que no se entienda de un vistazo.

## Restricciones

- **Sin instalación ni servidor:** debe funcionar abierta con `file://`. Sin
  ES modules (los bloquea CORS en `file://`); usar scripts clásicos.
- **Sin dependencias externas:** nada de CDN, frameworks ni librerías. Todo
  local, para que abra offline.
- **Nomenclatura de notas:** sostenidos (`C`, `C#`, `D`, ...), igual que el
  script de Go. Sin bemoles ni enarmónicos por ahora.

## Cómo funciona (comportamiento)

### El mástil

- Se dibuja horizontal, estilo tablatura: cada cuerda es una línea horizontal.
- **La cuerda más aguda va arriba y la más grave abajo**, como en una tablatura
  de guitarra real. La lista de afinación se guarda de grave a agudo (como se
  lee al afinar), pero al dibujar se invierte el orden de las filas.
- Por defecto: afinación estándar (`E A D G B E`), 6 cuerdas, 15 trastes, más
  las cuerdas al aire clickeables. Todo esto es configurable.
- Los nombres de las notas están **visibles siempre** en cada traste, a muy
  baja opacidad.
- Al clickear una posición (cuerda + traste), esa **nota** queda marcada y se
  resalta **en todas las cuerdas y octavas donde aparece**, pasando de la
  opacidad tenue a sólida/resaltada. Clickear de nuevo la destilda.
- La selección es un **conjunto de notas (clases de altura)**: marcar el mismo
  C en dos octavas distintas cuenta como una sola nota para el análisis.

### El panel de resultados (principal)

- Se muestra en vivo, apenas cambia la selección.
- Lista las escalas que contienen **al menos una** de las notas marcadas,
  ordenadas por similitud (desc) y luego por coincidencias (desc) — el mismo
  criterio que `encontrar_escala` en Go.
- Cada resultado muestra, como el script: nota tónica + nombre de la escala,
  las notas de la escala, `Coincidencias: n/total (x%)`, `Similitud: x%` y
  las notas marcadas que **no** están en la escala.
- Se muestran los primeros 10, igual que el script.
- Estado vacío (sin notas marcadas): un texto breve invitando a clickear el
  mástil.
- **El desempate replica Go exactamente:** el segundo criterio de orden es el
  campo tal como lo calcula el script, `len(coincidentes)*100/CantidadNotas`
  con truncamiento entero (el `x%` de `Coincidencias`), no el conteo crudo
  `n`. En empate de similitud, esto ordena distinto (p. ej. `3/7 (42%)` vs
  `3/5 (60%)`: cuenta cruda empata, Go pone primero la de 5 notas). El
  comparador debe espejar ese campo.

### El panel de modos (secundario)

- Los modos griegos no compiten en el ranking: como conjunto de notas siempre
  coinciden con Mayor o Natural Menor, así que no aportan coincidencias nuevas.
- El panel aparece **cuando una escala Mayor o Natural Menor está presente en
  el ranking** (es decir, contiene al menos una de las notas marcadas). No hace
  falta marcar la escala completa.
- Para cada conjunto diatónico distinto que aparezca en los resultados
  mostrados (los primeros 10), se lista **los 7 modos** con sus respectivas
  tónicas, con el texto de que son las mismas notas con otro centro tonal.
  Se **marca visualmente cuál de los 7 corresponde a la escala que coincidió**
  (su tónica). Ejemplo: si coincide `C Mayor`, se listan los 7 modos y se
  resalta `C Jónico`; los otros son `D Dórico`, `E Frigio`, `F Lidio`,
  `G Mixolidio`, `A Eólico`, `B Locrio`.
- Si el mismo conjunto aparece por más de una escala (p. ej. `C Mayor` y
  `A Natural Menor`), es un solo bloque y se marcan ambos modos equivalentes.
- Si ninguna escala diatónica está en los resultados, el panel no muestra nada.

### Catálogo de escalas

Las 7 escalas "madre" del script, con sus patrones de intervalos
(`T` = 2 semitonos, `S` = 1, `TS` = 3):

| Escala              | Intervalos                    | Notas |
|---------------------|-------------------------------|-------|
| Mayor               | T T S T T T S                 | 7     |
| Natural Menor       | T S T T S T T                 | 7     |
| Melódica Menor      | T S T T T T S                 | 7     |
| Harmónica Menor     | T S T T S TS S                | 7     |
| Pentatónica Mayor   | T T TS T TS                   | 5     |
| Pentatónica Menor   | TS T T TS T                   | 5     |
| Enigmática          | S TS T T T S S                | 7     |

El catálogo vive en un array de JavaScript dentro del código fuente. Agregar
una escala nueva = editar ese array, sin tocar Go.

### Configuraciones (exportar / importar)

- Un botón **Exportar** baja un archivo `.json` con la configuración actual
  (afinación/cuerdas, cantidad de trastes, y opcionalmente las notas marcadas).
- Un botón **Importar** abre el selector de archivos y carga esa configuración.
- Debe funcionar abierta con `file://` (descarga por Blob, lectura por
  `<input type="file">`), sin permisos especiales ni APIs de sistema de archivos.

## Decisiones tomadas (para que queden claras)

- **Port a JavaScript:** la lógica de generación y matching se reimplementa en
  JS dentro de la página; el programa de Go queda como está.
- **Sin bemoles:** se mantiene la nomenclatura de sostenidos del script.
- **Cuerdas = afinación:** la cantidad de cuerdas se define por la lista de
  notas al aire (de grave a agudo); agregar/quitar cuerdas es agregar/quitar
  notas a esa lista.
- **Modos aparte, no en el ranking:** ver el panel secundario.
- **Guardado por archivo:** exportar/importar `.json` (no localStorage, no APIs
  de disco).

## Qué queda a criterio del builder

- Cantidad de archivos: un `index.html` autocontenido, o separar en
  `index.html` + `styles.css` + `app.js` (scripts clásicos, sin módulos). Cualquiera
  que abra bien con `file://` y sin build.
- Estilos visuales concretos: paleta, tipografía, tamaño de los trastes,
  cómo exactamente se ve "resaltado" vs "tenue".
- Forma del esquema del `.json` (con versión), incluido si guarda las notas
  marcadas o solo la configuración del instrumento.
- Valor exacto de trastes por defecto (la charla mencionó 15–24) y sus
  límites mínimos/máximos.
- Detalle fino de cómo se derivan y presentan los modos a partir del conjunto
  diatónico.
