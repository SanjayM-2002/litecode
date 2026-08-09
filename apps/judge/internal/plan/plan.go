// Package plan groups test cases into chunks.
//
// Running every case in its own sandbox wastes a fixed per-chunk cost on cases
// that take a fraction of it. Running all of them in one sandbox wastes an
// entire run's work when the third case is already wrong. Chunking sits between
// the two, and the right chunk size is derived, not guessed.
package plan

import (
	"math"

	"github.com/SanjayM-2002/litecode/apps/judge/internal/model"
)

// CostModel is per-runtime. BoundaryMs is what one extra chunk costs: sandbox
// spawn plus interpreter startup. That's why Node wants bigger chunks than a
// static C++ binary — its boundary is roughly 3x more expensive.
type CostModel struct {
	BoundaryMs     int
	CaseOverheadMs int
	PerMBMs        int // read + parse + a typical linear solve
}

var models = map[string]CostModel{
	"cpp-14":  {BoundaryMs: 17, CaseOverheadMs: 1, PerMBMs: 25},
	"node-22": {BoundaryMs: 55, CaseOverheadMs: 1, PerMBMs: 41},
}

func ModelFor(runtimeID string) CostModel {
	if m, ok := models[runtimeID]; ok {
		return m
	}
	return CostModel{BoundaryMs: 20, CaseOverheadMs: 1, PerMBMs: 30}
}

// CaseMs estimates one case. It does not need to be accurate — only monotone
// in the real cost and right to within a factor of two. Being 2x off changes
// chunk sizes by 2x, which changes total time by a few percent.
func (cm CostModel) CaseMs(inputBytes int) int {
	return cm.CaseOverheadMs + (inputBytes*cm.PerMBMs)>>20
}

const (
	minTargetMs = 100
	maxTargetMs = 2000
)

// Target solves for the chunk size that minimises
//
//	boundary overhead (B·N/T)  +  expected wasted work (p·T/2)
//
// giving T = sqrt(2·B·N/p). A useful consequence: chunk count grows as
// sqrt(N), so a problem with 10x the work wants ~3x the chunks, not 10x.
//
// It degenerates correctly at both ends — as p approaches 0 (nobody fails)
// the target grows and you get one chunk; as p approaches 1 you get many.
func Target(totalMs int, cm CostModel, failRate float64) int {
	if failRate < 0.05 {
		failRate = 0.05 // keep T finite for problems almost nobody fails
	}
	t := int(math.Sqrt(2 * float64(cm.BoundaryMs) * float64(totalMs) / failRate))
	return min(max(t, minTargetMs), maxTargetMs)
}

// Build packs cases into chunks of roughly Target() milliseconds each.
//
// Two rules do the work:
//
//  1. Cheap cases group aggressively. A small case costs ~0.5ms while a chunk
//     boundary costs ~17ms, so splitting 100 small cases into ten chunks pays
//     148ms of boundaries to save at most 45ms of wasted work — a guaranteed
//     net loss.
//  2. Cost classes never mix. Otherwise the packer tucks an expensive case in
//     behind the cheap ones and every wrong answer pays for it.
func Build(cases []model.TestCase, cm CostModel, failRate float64) [][]model.TestCase {
	if len(cases) == 0 {
		return nil
	}

	total := 0
	for _, c := range cases {
		total += cm.CaseMs(c.InputBytes())
	}
	target := Target(total, cm, failRate)

	var (
		chunks   [][]model.TestCase
		cur      []model.TestCase
		curMs    int
		curLarge bool
	)

	flush := func() {
		if len(cur) > 0 {
			chunks = append(chunks, cur)
			cur, curMs = nil, 0
		}
	}

	for _, c := range cases {
		ms := cm.CaseMs(c.InputBytes())

		// Rule 2: a class change always starts a new chunk.
		if len(cur) > 0 && c.IsLarge() != curLarge {
			flush()
		}
		// Rule 1: otherwise fill to the target. A case heavier than the whole
		// target lands in a chunk by itself, which is what we want for the
		// large object-store cases.
		if len(cur) > 0 && curMs+ms > target {
			flush()
		}

		cur = append(cur, c)
		curMs += ms
		curLarge = c.IsLarge()
	}
	flush()

	return chunks
}

// Describe renders the plan for a debug log line, e.g. "3 chunks [100s 1L 1L]"
// where s = small and L = large.
func Describe(chunks [][]model.TestCase) []string {
	out := make([]string, 0, len(chunks))
	for _, ch := range chunks {
		kind := "s"
		if len(ch) > 0 && ch[0].IsLarge() {
			kind = "L"
		}
		out = append(out, itoa(len(ch))+kind)
	}
	return out
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var b [20]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	return string(b[i:])
}
