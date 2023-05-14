package main

import (
	"fmt"
	"sort"
	// "os"
)

var notas = [12]string{"C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"}

type Escala struct {
	Nota       string
	Nombre     string
	Intervalos [7]string
}

type EscalaSimiliar struct {
	Nota      string
	Nombre    string
	Similitud int
}

var escalas = []Escala{
	{Nombre: "Mayor", Intervalos: [7]string{"T", "T", "S", "T", "T", "T", "S"}},
	{Nombre: "Menor", Intervalos: [7]string{"T", "S", "T", "T", "S", "T", "T"}},
}

var escala_mayor = [7]string{"T", "T", "S", "T", "T", "T", "S"}
var escala_menor = [7]string{"T", "S", "T", "T", "S", "T", "T"}

func main() {
	nota_selec := "A#"
	fmt.Println("Nota seleccionada: ", nota_selec)
	if indexOf(nota_selec, notas[:]) < 0 {
		fmt.Println("Nota no valida")
		return
	}

	// Genera escala con nota solicitada
	notas_escala := generar_escala(nota_selec, escala_menor[:])
	fmt.Println(notas_escala)
	fmt.Println("-----------------------")

	// Buscar escala similares o iguales con notas ingresadas
	var notas_encontrar = []string{"C", "D", "E", "F", "G", "A", "B"}
	// var notas_encontrar = []string{"C", "D", "E"}
	escalas_similares := encontrar_escala(notas_encontrar)
	fmt.Println(escalas_similares)
}

func encontrar_escala(notas_cancion []string) []EscalaSimiliar {
	// Generar todas las escalas para comparar
	escalas_todas := generar_escalas_todas()
	// Buscar match's y guardar escalas similares
	var escalas_similares []EscalaSimiliar
	for _, escala := range escalas_todas {
		// Determinar que coincidan notas
		coincidencias := 1
		for _, nota := range escala.Intervalos {
			if indexOf(nota, notas_cancion) > 0 {
				coincidencias++
			}
		}
		// Si hay al menos una coincidencia la agrega al return
		if coincidencias > 0 {
			var escala_similar EscalaSimiliar
			escala_similar.Nombre = escala.Nombre
			escala_similar.Nota = escala.Nota
			escala_similar.Similitud = coincidencias
			escalas_similares = append(escalas_similares, escala_similar)
		}
	}
	// Ordenar por similitud
	sort.SliceStable(escalas_similares, func(i, j int) bool {
		return escalas_similares[i].Similitud > escalas_similares[j].Similitud
	})
	return escalas_similares
}

// Generar todas las escalas de cada nota
func generar_escalas_todas() []Escala {
	var escalas_todas []Escala
	for _, escala := range escalas {
		for i := 0; i < len(notas); i++ {
			var escala_generada Escala
			var escala_generada_tipo [7]string
			notas_escala := generar_escala(notas[i], escala.Intervalos[:])
			for i, v := range notas_escala {
				escala_generada_tipo[i] = v
			}
			escala_generada.Nota = notas[i]
			escala_generada.Nombre = escala.Nombre
			escala_generada.Intervalos = escala_generada_tipo
			escalas_todas = append(escalas_todas, escala_generada)
		}
	}
	return escalas_todas
}

func generar_escala(nota string, intervalos []string) []string {
	var notas_escala []string
	// Armando escala segun nota seleccionada
	notas_escala = append(notas_escala, nota)
	ultima_nota_index := indexOf(nota, notas[:])
	for _, intervalo := range intervalos {
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
