# Utilidad para escalas musicales

Herramienta para encontrar escalas a partir de un conjunto de notas, en dos versiones:

- **Web** (`index.html`): un mástil interactivo donde se marcan notas y se ven las escalas y modos que las contienen.
- **CLI** (`main.go`): la versión original por línea de comandos, escrita en Go.

## Versión web

No requiere instalación ni servidor: abrí `index.html` en el navegador.

- **Instrumento**: definí la afinación (una nota por cuerda, de grave a agudo), la cantidad de cuerdas y de trastes, y presioná *Aplicar*.
- **Guardar / Cargar instrumento**: descarga la configuración actual como un archivo `.json` y permite volver a cargarla más tarde.
- **Mástil**: clickeá las notas para marcarlas; se resaltan en todas las cuerdas y octavas.
- **Escalas**: muestra las 10 escalas más parecidas a la selección. La tarjeta es **verde** si contiene todas las notas marcadas (similitud 100%) y **naranja** si falta alguna (se indican cuáles).
- **Modos**: si hay escalas Mayor o Natural Menor que contienen todas las notas marcadas, se listan los 7 modos del mismo conjunto de notas y se resaltan en verde los que corresponden a esas escalas.

### Círculo de quintas

Segunda pestaña de la versión web (también se abre con `index.html#circulo`).

- **Disco**: tres anillos (tonalidades mayores, sus relativas menores y el acorde disminuido). La "ventana" de arriba muestra la tonalidad central con sus grados: en **verde** el grado si es mayor, en **rosa** si la tónica es la relativa menor, y la función armónica (T tónica, SD subdominante, D dominante).
- **Nota fundamental + Mayor/menor**: muestra los 7 modos de esa nota. Cada modo usa las notas de una escala mayor "padre" (A lidio = E mayor, A mixolidio = D mayor, A frigio = F mayor, ...). Los papelitos aparecen junto a esa escala en el disco y la tabla de abajo explica cómo encontrarla desde el círculo (p. ej. A dórico = *vi +½*, A eólico = *iii −½*).
- **Acordes de la canción**: al cargar acordes el disco gira solo hasta la tonalidad que los contiene y marca cada uno con su grado; los que no pertenecen aparecen en rojo como "fuera". Si hay varias tonalidades posibles se pueden elegir.
- **Giro a mano** (arrastrar, tocar una tonalidad o las flechas): mueve el disco y **borra los acordes cargados**.

Los tests de la lógica (`src/scales.js` y `src/circle.js`) se ejecutan con Node 18+:

```bash
node --test tests/scales.test.js tests/circle.test.js
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
