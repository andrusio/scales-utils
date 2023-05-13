package main

import (
	"fmt"
)

func main() {
	notas := [12]string{"C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"}

	escala_mayor := [7]string{"T", "T", "S", "T", "T", "T", "S"}

	nota_selec := "C"
	fmt.Println("Nota seleccionada: ", nota_selec)

	// Armando escala segun nota seleccionada
	var notas_escala []string
	notas_escala = append(notas_escala, nota_selec)
	ultima_nota_index := indexOf(nota_selec, notas[:])
	for _, intervalo := range escala_mayor {
		// Determina cuantos intervalos hay que saltar para la proxima nota
		var intervalo_suma int
		if intervalo == "T" {
			intervalo_suma = 2
		} else {
			intervalo_suma = 1
		}
		// Comienza la escala desde el principio en el caso terminarla/excederla
		var proximo_indice int
		if ultima_nota_index+intervalo_suma >= len(notas) {
			proximo_indice = ultima_nota_index + intervalo_suma - len(notas)
		} else {
			proximo_indice = ultima_nota_index + intervalo_suma
		}

		nota := notas[proximo_indice]
		notas_escala = append(notas_escala, nota)

		// Guarda posición de la última nota para calcular la próxima iteración
		ultima_nota_index = indexOf(nota, notas[:])
	}
	// Remueve la última nota que es la misma que la seleccionada
	notas_escala = notas_escala[0 : len(notas_escala)-1]

	fmt.Println(notas_escala)
}

func indexOf(element string, data []string) int {
	for k, v := range data {
		if element == v {
			return k
		}
	}
	return -1 // not found
}
