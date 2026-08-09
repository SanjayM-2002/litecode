// Package compare decides whether a program's output matches the expected
// value.
//
// This is a port of output-comparator.ts. Two implementations of the same
// semantics now exist, and the failure mode of them drifting apart is SILENT
// MIS-GRADING — the worst bug class a judge has. The defence is
// testdata/golden.json, a fixture exercised by both the Go and TypeScript
// test suites, so a divergence fails CI instead of failing a user.
package compare

import (
	"encoding/json"
	"math"
	"strings"
)

// Match reports whether stdout parses to a value deep-equal to expected.
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

// MatchLines splits a chunk's NDJSON stdout — the driver prints exactly one
// compact JSON value per case — and compares each line against its expected
// value.
//
// It returns the index of the FIRST mismatch, or -1 if every line matched.
// A short read (fewer lines than cases) means the process died partway, and
// the index of the first missing line is the case that killed it — which is
// how failure attribution stays exact even when chunked.
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

// deepEqual mirrors the TypeScript comparator exactly:
//   - numbers compare with a 1e-9 RELATIVE tolerance
//   - object key order is irrelevant
//   - array order IS significant (callers sort when it shouldn't be)
//   - null equals null
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
