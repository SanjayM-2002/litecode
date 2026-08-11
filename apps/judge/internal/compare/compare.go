package compare

import (
	"encoding/json"
	"math"
	"strings"
)

func Match(stdout []byte, expected json.RawMessage) bool {
	if len(stdout) == 0 {
		return false
	}

	var actual any
	if err := json.Unmarshal([]byte(strings.TrimSpace(string(stdout))), &actual); err != nil {
		return false
	}

	var want any
	if err := json.Unmarshal(expected, &want); err != nil {
		return false
	}

	return deepEqual(actual, want)
}

func MatchLines(stdout []byte, expected []json.RawMessage) (badIndex int, produced int) {
	lines := splitNonEmpty(stdout)
	produced = len(lines)

	for i := range expected {
		if i >= len(lines) {
			return i, produced // died here; nothing after this ran
		}
		if !Match(lines[i], expected[i]) {
			return i, produced
		}
	}
	return -1, produced
}

func splitNonEmpty(b []byte) [][]byte {
	raw := strings.Split(string(b), "\n")
	out := make([][]byte, 0, len(raw))
	for _, l := range raw {
		if s := strings.TrimSpace(l); s != "" {
			out = append(out, []byte(s))
		}
	}
	return out
}

func deepEqual(a, b any) bool {
	switch av := a.(type) {
	case nil:
		return b == nil

	case float64:
		bv, ok := b.(float64)
		if !ok {
			return false
		}
		if math.IsNaN(av) && math.IsNaN(bv) {
			return true
		}
		tol := 1e-9 * math.Max(1, math.Max(math.Abs(av), math.Abs(bv)))
		return math.Abs(av-bv) <= tol

	case string:
		bv, ok := b.(string)
		return ok && av == bv

	case bool:
		bv, ok := b.(bool)
		return ok && av == bv

	case []any:
		bv, ok := b.([]any)
		if !ok || len(av) != len(bv) {
			return false
		}
		for i := range av {
			if !deepEqual(av[i], bv[i]) {
				return false
			}
		}
		return true

	case map[string]any:
		bv, ok := b.(map[string]any)
		if !ok || len(av) != len(bv) {
			return false
		}
		for k, v := range av {
			other, present := bv[k]
			if !present || !deepEqual(v, other) {
				return false
			}
		}
		return true
	}
	return false
}
