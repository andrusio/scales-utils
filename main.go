package main

import (
	"flag"
	"fmt"
	"os"
	"sort"
	"strings"
)

var chromatic = [12]string{"C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"}

type Scale struct {
	Root      string
	Name      string
	Intervals [7]string
	NoteCount int
}

type SimilarScale struct {
	Root             string
	Name             string
	Notes            [7]string
	MatchPercent     int
	MatchRatio       string
	SimilarityPct    float32
	MissingNotes     []string
}

var scales = []Scale{
    {Name: "Mayor / Jónico", Intervals: [7]string{"T", "T", "S", "T", "T", "T", "S"}, NoteCount: 7},
    {Name: "Natural Menor / Eólico", Intervals: [7]string{"T", "S", "T", "T", "S", "T", "T"}, NoteCount: 7},
    {Name: "Melódica Menor", Intervals: [7]string{"T", "S", "T", "T", "T", "T", "S"}, NoteCount: 7},
    {Name: "Harmónica Menor", Intervals: [7]string{"T", "S", "T", "T", "S", "TS", "S"}, NoteCount: 7},
    {Name: "Pentatónica Mayor", Intervals: [7]string{"T", "T", "TS", "T", "TS"}, NoteCount: 5},
    {Name: "Pentatónica Menor", Intervals: [7]string{"TS", "T", "T", "TS", "T"}, NoteCount: 5},
    {Name: "Enigmática", Intervals: [7]string{"S", "TS", "T", "T", "T", "S", "S"}, NoteCount: 7},
    {Name: "Dórico", Intervals: [7]string{"T", "S", "T", "T", "T", "S", "T"}, NoteCount: 7},
    {Name: "Frigio", Intervals: [7]string{"S", "T", "T", "T", "S", "T", "T"}, NoteCount: 7},
    {Name: "Lidio", Intervals: [7]string{"T", "T", "T", "S", "T", "T", "S"}, NoteCount: 7},
    {Name: "Mixolidio", Intervals: [7]string{"T", "T", "S", "T", "T", "S", "T"}, NoteCount: 7},
    {Name: "Locrio", Intervals: [7]string{"S", "T", "T", "S", "T", "T", "T"}, NoteCount: 7},
}

// intervalSteps maps interval notation to semitone count.
var intervalSteps = map[string]int{
	"TS": 3,
	"T":  2,
	"S":  1,
}

func main() {
	var root string
	var scaleName string
	var searchNotes string

	flag.StringVar(&root, "nota", "", "Nota raíz de la escala")
	flag.StringVar(&scaleName, "escala", "", "Nombre de la escala a generar")
	flag.StringVar(&searchNotes, "notas", "", "Notas separadas por coma para buscar escalas coincidentes")
	flag.Parse()

	if root == "" && scaleName == "" && searchNotes == "" {
		flag.PrintDefaults()
		fmt.Fprintf(os.Stderr, "\nEjemplos:\n  Generar escala: %s -nota C# -escala \"Natural Menor\"\n  Buscar escala:  %s -notas \"C,D,E,F,G\"\n", os.Args[0], os.Args[0])
		return
	}

	if root != "" || scaleName != "" {
		if err := printScale(root, scaleName); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		return
	}

	if searchNotes != "" {
		notes := strings.Split(searchNotes, ",")
		results := findSimilarScales(notes)
		printSimilarScales(results)
	}
}

// printScale validates input and prints the generated scale.
func printScale(root, scaleName string) error {
	if indexOf(root, chromatic[:]) < 0 {
		return fmt.Errorf("nota no válida: %q", root)
	}

	scale, ok := findScaleByName(scaleName)
	if !ok {
		names := make([]string, len(scales))
		for i, s := range scales {
			names[i] = s.Name
		}
		return fmt.Errorf("escala no válida: %q\nEscalas disponibles: %s", scaleName, strings.Join(names, ", "))
	}

	notes := buildScale(root, scale)
	fmt.Printf("\nNota: %s | Escala: %s\n%v\n\n", root, scale.Name, notes)
	return nil
}

// findScaleByName performs a case-insensitive lookup of a scale by name.
func findScaleByName(name string) (Scale, bool) {
	for _, s := range scales {
		if strings.EqualFold(s.Name, name) {
			return s, true
		}
	}
	return Scale{}, false
}

// findSimilarScales returns all scales ranked by similarity to the provided notes.
func findSimilarScales(songNotes []string) []SimilarScale {
	all := buildAllScales()

	var results []SimilarScale
	for _, scale := range all {
		var matched, missing []string

		for _, note := range songNotes {
			if indexOf(note, scale.Intervals[:]) >= 0 {
				if indexOf(note, matched) == -1 {
					matched = append(matched, note)
				}
			} else {
				missing = append(missing, note)
			}
		}

		if len(matched) == 0 {
			continue
		}

		var notes [7]string
		copy(notes[:], scale.Intervals[:])

		results = append(results, SimilarScale{
			Root:          scale.Root,
			Name:          scale.Name,
			Notes:         notes,
			MatchPercent:  len(matched) * 100 / scale.NoteCount,
			MatchRatio:    fmt.Sprintf("%d/%d", len(matched), scale.NoteCount),
			SimilarityPct: float32(len(matched)) / float32(len(songNotes)) * 100,
			MissingNotes:  missing,
		})
	}

	sort.SliceStable(results, func(i, j int) bool {
		if results[i].SimilarityPct != results[j].SimilarityPct {
			return results[i].SimilarityPct > results[j].SimilarityPct
		}
		return results[i].MatchPercent > results[j].MatchPercent
	})

	return results
}

// printSimilarScales prints the top 10 similar scale results.
func printSimilarScales(results []SimilarScale) {
	limit := 10
	if len(results) < limit {
		limit = len(results)
	}
	for _, s := range results[:limit] {
		fmt.Printf(
			"\n- %s %s %v\n   Coincidencias: %s (%d%%) | Similitud: %d%%\n   Notas no incluidas: %v\n",
			s.Root, s.Name, s.Notes,
			s.MatchRatio, s.MatchPercent, int(s.SimilarityPct), s.MissingNotes,
		)
	}
}

// buildAllScales generates every scale for each chromatic root note.
func buildAllScales() []Scale {
	all := make([]Scale, 0, len(scales)*len(chromatic))
	for _, scale := range scales {
		for _, root := range chromatic {
			notes := buildScale(root, scale)
			var intervals [7]string
			copy(intervals[:], notes)

			all = append(all, Scale{
				Root:      root,
				Name:      scale.Name,
				Intervals: intervals,
				NoteCount: scale.NoteCount,
			})
		}
	}
	return all
}

// buildScale computes the notes of a scale starting from root.
func buildScale(root string, scale Scale) []string {
	notes := make([]string, 0, scale.NoteCount)
	notes = append(notes, root)

	idx := indexOf(root, chromatic[:])
	for _, interval := range scale.Intervals[:scale.NoteCount-1] {
		steps := intervalSteps[interval]
		idx = (idx + steps) % len(chromatic)
		notes = append(notes, chromatic[idx])
	}

	return notes
}

// indexOf returns the index of element in data, or -1 if not found.
func indexOf(element string, data []string) int {
	for i, v := range data {
		if v == element {
			return i
		}
	}
	return -1
}