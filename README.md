# Utilidad para Escalas Musicales
Permite buscar escalas que contengan las notas ingresadas o generarlas en base a una nota.
La función de búsqueda mostrará las escalas que coincidan con las notas ingresadas, asi como tambíen aquellas que sean similares indicando que nota no se encuentra en ella.

# Ejemplos uso
- Generar una escala en particular:  
```bash
$ go run main.go -nota C# -escala "natural menor"
```
```
Nota seleccionada:  C#
Escala seleccionada: Natural Menor
[C# D# E F# G# A B] 

```

- Búsqueda de escalas:  

```bash
$ go run main.go -notas "C,D,E,F,G" 
```
```
- C Mayor [C D E F G A B] 
   Coincidencias: 5/7 (71%) | Similitud notas: 100%  
   Notas ingresadas no incluidas en la escala: [] 


- F Mayor [F G A A# C D E] 
   Coincidencias: 5/7 (71%) | Similitud notas: 100%  
   Notas ingresadas no incluidas en la escala: [] 


- D Natural Menor [D E F G A A# C] 
   Coincidencias: 5/7 (71%) | Similitud notas: 100%  
   Notas ingresadas no incluidas en la escala: [] 


- A Natural Menor [A B C D E F G] 
   Coincidencias: 5/7 (71%) | Similitud notas: 100%  
   Notas ingresadas no incluidas en la escala: [] 


- F Melódica Menor [F G G# A# C D E] 
   Coincidencias: 5/7 (71%) | Similitud notas: 100%  
   Notas ingresadas no incluidas en la escala: [] 


- F# Enigmática [F# G A# C D E F] 
   Coincidencias: 5/7 (71%) | Similitud notas: 100%  
   Notas ingresadas no incluidas en la escala: [] 


- C Pentatónica Mayor [C D E G A  ] 
   Coincidencias: 4/5 (80%) | Similitud notas: 80%  
   Notas ingresadas no incluidas en la escala: [F] 


- F Pentatónica Mayor [F G A C D  ] 
   Coincidencias: 4/5 (80%) | Similitud notas: 80%  
   Notas ingresadas no incluidas en la escala: [E] 


- A# Pentatónica Mayor [A# C D F G  ] 
   Coincidencias: 4/5 (80%) | Similitud notas: 80%  
   Notas ingresadas no incluidas en la escala: [E] 


- D Pentatónica Menor [D F G A C  ] 
   Coincidencias: 4/5 (80%) | Similitud notas: 80%  
   Notas ingresadas no incluidas en la escala: [E] 
