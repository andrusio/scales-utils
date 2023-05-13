package main

import (
	"fmt"
)

var notas = [12]string{"C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"}

var escala_mayor = [7]string{"T", "T", "S", "T", "T", "T", "S"}

func main() {
	nota_selec := "C"
	fmt.Println("Nota seleccionada: ", nota_selec)
	if indexOf(nota_selec, notas[:]) < 0 {
		fmt.Println("Nota no valida")
		return
	}

	notas_escala := generar_notas_escala(nota_selec, escala_mayor[:])
	fmt.Println(notas_escala)
}

func generar_notas_escala(nota string, escala []string) []string {
	var notas_escala []string
	// Armando escala segun nota seleccionada
	notas_escala = append(notas_escala, nota)
	ultima_nota_index := indexOf(nota, notas[:])
	for _, intervalo := range escala {
		// Determina cuantos intervalos hay que saltar para la proxima nota
		var intervalo_suma int
		if intervalo == "T" {
			intervalo_suma = 2
		} else {
			intervalo_suma = 1
		}
		// Comienza la escala desde el principio en el caso de terminar/exceder las notas
		var proximo_indice int
		if ultima_nota_index+intervalo_suma >= len(notas) {
			proximo_indice = ultima_nota_index + intervalo_suma - len(notas)
		} else {
			proximo_indice = ultima_nota_index + intervalo_suma
		}

		nota_escala := notas[proximo_indice]
		notas_escala = append(notas_escala, nota_escala)

		// Guarda posición de la última nota para calcular la próxima iteración
		ultima_nota_index = indexOf(nota_escala, notas[:])
	}
	// Remueve la última nota que es la misma que la seleccionada
	notas_escala = notas_escala[0 : len(notas_escala)-1]
	return notas_escala
}

func indexOf(element string, data []string) int {
	for k, v := range data {
		if element == v {
			return k
		}
	}
	// no encontrado
	return -1
}
