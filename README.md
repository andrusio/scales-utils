# Utilidad para escalas musicales

Herramienta para encontrar escalas a partir de un conjunto de notas, en dos versiones:

- **Web** (`index.html`): un mástil interactivo donde se marcan notas y se ven las escalas y modos que las contienen.
- **CLI** (`main.go`): la versión original por línea de comandos, escrita en Go.

## Versión web

No requiere instalación ni servidor: abrí `index.html` en el navegador.

**Instrumento (arriba a la derecha):** elegí *Guitarra* o *Piano* para toda la web; la elección se recuerda en el navegador. Con piano, las herramientas muestran un teclado de dos octavas (C3–C5) en lugar del mástil. El botón **Sonido** activa o desactiva que las notas suenen al tocarlas (los botones ▶ suenan siempre).

Las notas se escriben según la escala o el acorde (en F mayor aparece **Bb**, no A#), con la otra enarmonía al lado cuando ayuda. Los botones **Copiar link** guardan en la dirección lo que estás viendo (una escala, una lista de acordes, el círculo) para compartirlo.

- **Instrumento**: definí la afinación (una nota por cuerda, de grave a agudo), la cantidad de cuerdas y de trastes, y presioná *Aplicar*.
- **Guardar / Cargar instrumento**: descarga la configuración actual como un archivo `.json` y permite volver a cargarla más tarde.
- **Mástil**: clickeá las notas para marcarlas; se resaltan en todas las cuerdas y octavas.
- **Escalas**: muestra las 10 escalas más parecidas a la selección. La tarjeta es **verde** si contiene todas las notas marcadas (similitud 100%) y **naranja** si falta alguna (se indican cuáles).
- **Modos**: si hay escalas Mayor o Natural Menor que contienen todas las notas marcadas, se listan los 7 modos del mismo conjunto de notas y se resaltan en verde los que corresponden a esas escalas.
- **Ver una escala**: elegí tónica y escala (mayor, menores, los 7 modos, pentatónicas, blues, tonos enteros, disminuidas...) para verla en el instrumento con sus **grados** (1, 2, b3...) o sus notas, y escucharla. En guitarra se puede ver por **posiciones** (3 notas por cuerda, o 2 en las pentatónicas). Los botones *Ver* de los resultados y los modos la abren directamente.

### Identificador de acordes

Pestaña del medio (también se abre con `index.html#acordes`). Usa el mismo instrumento que el identificador de escalas.

- **Mástil o teclado**: tocá las posiciones del acorde (en guitarra podés marcar varias por cuerda; tocá de nuevo para quitar). La nota más grave define el bajo; en el piano las dos octavas alcanzan para armar cualquier inversión.
- **Acorde**: muestra el nombre (tríadas, séptimas, sextas, sus, add9, novenas...), cada nota con su intervalo (*C tónica, E tercera mayor, G quinta justa*) y la inversión si el bajo no es la tónica (`C/E`). Si las mismas notas admiten otra lectura (C6 = Am7/C) se puede elegir. Con dos notas muestra el intervalo y los acordes posibles.
- **▶ Junto / ▶ Arpegio** hacen sonar las notas marcadas.
- **Guardar acorde** arma una lista temporal que se puede escuchar, **transportar** de a medio tono y ver con **capo** (qué formas tocar para que suene igual). **Mostrar en círculo de quintas** la carga en el círculo; allí cada acorde se ubica por su tríada (G7 → G, Bm7b5 → B°) y los sus, aumentados y power chords se avisan.
- **Qué escala tocar encima**: con la tonalidad estimada de la lista, sugiere la escala de cada acorde (el ii → dórico, el V → mixolidio...) para escucharla o verla en el instrumento.

### Círculo de quintas

Segunda pestaña de la versión web (también se abre con `index.html#circulo`).

- **Disco**: tres anillos (tonalidades mayores, sus relativas menores y el acorde disminuido). La "ventana" de arriba muestra la tonalidad central con sus grados: en **verde** el grado si es mayor, en **rosa** si la tónica es la relativa menor, y la función armónica (T tónica, SD subdominante, D dominante).
- **Nota fundamental + Mayor/menor**: muestra en el disco los 7 modos de esa nota. Cada modo usa las notas de una escala mayor "padre" (A lidio = E mayor, A mixolidio = D mayor, A frigio = F mayor, ...) y su papelito aparece junto a esa escala, con el truco para hallarla desde el círculo (p. ej. A dórico = *vi +½*, A eólico = *iii −½*).
- **Acordes de la canción**: al cargar acordes el disco gira solo hasta la tonalidad que los contiene y marca cada uno con su grado; los que no pertenecen aparecen en rojo como "fuera". Si hay varias tonalidades posibles se pueden elegir.
- **Giro a mano** (arrastrar, tocar una tonalidad o las flechas): mueve el disco y **borra los acordes cargados**.
- **Acordes de la tonalidad**: los 7 acordes de la tonalidad central, como tríadas o cuatriadas (Cmaj7 Dm7 Em7...), para escucharlos, y **progresiones típicas** (pop, ii–V–I, años 50, blues...) escritas en esa tonalidad, para escucharlas o cargarlas en el círculo.
- **En el celular** el círculo queda fijo arriba mientras se scrollea a los selectores.

### Práctica

Ejercicios con puntaje: **intervalos** y **tipos de acorde** de oído, **grados** de un acorde en una tonalidad, **modos** (qué escala mayor tocar para un modo dado) y **armar acordes** en el instrumento (incluidas inversiones). Cada respuesta trae su explicación.

Los tests de la lógica (`src/scales.js`, `src/circle.js`, `src/chords.js`, `src/spelling.js` y `src/practice.js`) se ejecutan con Node 18+:

```bash
node --test tests/*.test.js
```

## Versión CLI

Requiere Go 1.20+.

Generar una escala a partir de una nota (el nombre de la escala no distingue mayúsculas; si es inválido se listan las disponibles):

```bash
go run main.go -nota C# -escala "Natural Menor / Eólico"
```
```
Nota: C# | Escala: Natural Menor / Eólico
[C# D# E F# G# A B]
```

Buscar escalas que contengan las notas dadas (muestra las 10 más similares):

```bash
go run main.go -notas "C,D,E,F,G"
```
```
- C Mayor / Jónico [C D E F G A B]
   Coincidencias: 5/7 (71%) | Similitud: 100%
   Notas no incluidas: []

- F Mayor / Jónico [F G A A# C D E]
   Coincidencias: 5/7 (71%) | Similitud: 100%
   Notas no incluidas: []
...
```

- **Coincidencias**: cuántas notas de la escala están en la selección.
- **Similitud**: qué porcentaje de las notas ingresadas pertenece a la escala.
- **Notas no incluidas**: notas ingresadas que la escala no tiene.
