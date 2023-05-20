package main

import (
	"fmt"
	"sort"
	// "os"
)

var notas = [12]string{"C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"}

type Escala struct {
	Nota          string
	Nombre        string
	Intervalos    [7]string
	CantidadNotas int
}

type EscalaSimiliar struct {
	Nota              string
	Nombre            string
	NotasCoincidentes int
	RatioNotas        string
	Similitud         float32
	NotasFaltantes    []string
}

var escalas = []Escala{
	{Nombre: "Mayor", Intervalos: [7]string{"T", "T", "S", "T", "T", "T", "S"}, CantidadNotas: 7},
	{Nombre: "Natural Menor", Intervalos: [7]string{"T", "S", "T", "T", "S", "T", "T"}, CantidadNotas: 7},
	{Nombre: "Melodica Menor", Intervalos: [7]string{"T", "S", "T", "T", "T", "T", "S"}, CantidadNotas: 7},
	{Nombre: "Harmonica Menor", Intervalos: [7]string{"T", "S", "T", "T", "S", "TS", "S"}, CantidadNotas: 7},
	{Nombre: "Pentatonica Mayor", Intervalos: [7]string{"T", "T", "TS", "T", "TS"}, CantidadNotas: 5},
	{Nombre: "Pentatonica Menor", Intervalos: [7]string{"TS", "T", "T", "TS", "T"}, CantidadNotas: 5},

	// {Nombre: "Jónico (Modo)", Intervalos: [7]string{"T", "T", "S", "T", "T", "T", "S"}, CantidadNotas: 7},
	// {Nombre: "Dórico (Modo)", Intervalos: [7]string{"T", "S", "T", "T", "T", "S", "T"}, CantidadNotas: 7},
	// {Nombre: "Frigio (Modo)", Intervalos: [7]string{"S", "T", "T", "T", "S", "T", "T"}, CantidadNotas: 7},
	// {Nombre: "Lidio (Modo)", Intervalos: [7]string{"T", "T", "T", "S", "T", "T", "S"}, CantidadNotas: 7},
	// {Nombre: "Mixolidio (Modo)", Intervalos: [7]string{"T", "T", "T", "S", "T", "T", "S"}, CantidadNotas: 7},
	// {Nombre: "Eólico (Modo)", Intervalos: [7]string{"T", "S", "T", "T", "S", "T", "T"}, CantidadNotas: 7},
	// {Nombre: "Locrio (Modo)", Intervalos: [7]string{"S", "T", "T", "S", "T", "T", "T"}, CantidadNotas: 7},

	{Nombre: "Enigmática", Intervalos: [7]string{"S", "TS", "T", "T", "T", "S", "S"}, CantidadNotas: 7},
}

func main() {
	nota_selec := "A"
	esca_selec := escalas[3]
	if indexOf(nota_selec, notas[:]) < 0 {
		fmt.Println("Nota no valida")
		return
	}

	// Genera escala con nota solicitada
	notas_escala := generar_escala(nota_selec, esca_selec)
	fmt.Println("Nota seleccionada: ", nota_selec)
	fmt.Println("Escala seleccionada:", esca_selec.Nombre)
	fmt.Println(notas_escala)
	fmt.Println("-----------------------")

	// Buscar escala similares o iguales con notas ingresadas
	// var notas_encontrar = []string{"C", "D", "E", "F", "G", "A", "B"}
	// var notas_encontrar = []string{"C", "D", "E", "G", "A"}
	var notas_encontrar = []string{"A", "B", "D", "E", "G", "C#", "F#", "G#"}
	escalas_similares := encontrar_escala(notas_encontrar)
	// fmt.Println(escalas_similares)
	for _, escala := range escalas_similares[0:10] {
		linea := fmt.Sprintf("%s %s Ratio Notas: %s Coincidencias: %d%% Similitud: %.2f Notas Faltantes: %v \n",
			escala.Nota, escala.Nombre,
			escala.RatioNotas, escala.NotasCoincidentes, escala.Similitud, escala.NotasFaltantes)
		fmt.Print(linea)
	}
}

func encontrar_escala(notas_cancion []string) []EscalaSimiliar {
	// Generar todas las escalas para comparar
	escalas_todas := generar_escalas_todas()
	// Buscar match's y guardar escalas similares
	var escalas_similares []EscalaSimiliar
	for _, escala := range escalas_todas {
		// Determinar que coincidan notas
		var notas_coincidencia []string
		var notas_faltantes []string

		// for _, nota := range escala.Intervalos {
		// 	if indexOf(nota, notas_cancion) >= 0 {
		// 		if indexOf(nota, notas_coincidencia) == -1 {
		// 			notas_coincidencia = append(notas_coincidencia, nota)
		// 		}
		// 	} else {
		// 		notas_faltantes = append(notas_faltantes, nota)
		// 	}
		// }

		for _, nota := range notas_cancion {
			if indexOf(nota, escala.Intervalos[:]) >= 0 {
				if indexOf(nota, notas_coincidencia) == -1 {
					notas_coincidencia = append(notas_coincidencia, nota)
				}
			} else {
				notas_faltantes = append(notas_faltantes, nota)
			}
		}

		// Si hay al menos una coincidencia la agrega al return
		if len(notas_coincidencia) > 0 {
			var escala_similar EscalaSimiliar
			escala_similar.Nota = escala.Nota
			escala_similar.Nombre = escala.Nombre
			escala_similar.NotasCoincidentes = len(notas_coincidencia) * 100 / escala.CantidadNotas
			escala_similar.RatioNotas = fmt.Sprintf("%d/%d", len(notas_coincidencia), escala.CantidadNotas)
			escala_similar.Similitud = float32(len(notas_coincidencia)) / float32(len(notas_cancion)) * 100
			escala_similar.NotasFaltantes = notas_faltantes
			escalas_similares = append(escalas_similares, escala_similar)
		}
	}
	// Ordenar por similitud
	sort.SliceStable(escalas_similares, func(i, j int) bool {
		// return escalas_similares[i].Similitud > escalas_similares[j].Similitud

		// Order by Similitud, Coincidencias
		ordenSimilitud := escalas_similares[i].Similitud > escalas_similares[j].Similitud
		if escalas_similares[i].Similitud == escalas_similares[j].Similitud {
			ordenCoincidencias := escalas_similares[i].NotasCoincidentes > escalas_similares[j].NotasCoincidentes
			return ordenCoincidencias
		}
		return ordenSimilitud

		// Order by Coincidencias, Similitud
		// ordenCoincidencias := escalas_similares[i].NotasCoincidentes > escalas_similares[j].NotasCoincidentes
		// if float32(escalas_similares[i].NotasCoincidentes) == float32(escalas_similares[j].NotasCoincidentes) {
		// 	ordenSimilitud := escalas_similares[i].Similitud > escalas_similares[j].Similitud
		// 	return ordenSimilitud
		// }
		// return ordenCoincidencias
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
			notas_escala := generar_escala(notas[i], escala)
			for i, v := range notas_escala {
				escala_generada_tipo[i] = v
			}
			escala_generada.Nota = notas[i]
			escala_generada.Nombre = escala.Nombre
			escala_generada.Intervalos = escala_generada_tipo
			escala_generada.CantidadNotas = escala.CantidadNotas
			escalas_todas = append(escalas_todas, escala_generada)
		}
	}
	return escalas_todas
}

func generar_escala(nota string, escala Escala) []string {
	var notas_escala []string
	// Armando escala segun nota seleccionada
	notas_escala = append(notas_escala, nota)
	ultima_nota_index := indexOf(nota, notas[:])
	for _, intervalo := range escala.Intervalos {
		// Determina cuantos intervalos hay que saltar para la proxima nota
		var intervalo_suma int
		if intervalo == "TS" {
			intervalo_suma = 3
		} else if intervalo == "T" {
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
	return notas_escala[0:escala.CantidadNotas]
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
