package plan

import (
	"math"

	"github.com/SanjayM-2002/litecode/apps/judge/internal/model"
)

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

func (cm CostModel) CaseMs(inputBytes int) int {
	return cm.CaseOverheadMs + (inputBytes*cm.PerMBMs)>>20
}

const (
	minTargetMs = 100
	maxTargetMs = 2000
)

func Target(totalMs int, cm CostModel, failRate float64) int {
	if failRate < 0.05 {
		failRate = 0.05 // keep T finite for problems almost nobody fails
	}
	t := int(math.Sqrt(2 * float64(cm.BoundaryMs) * float64(totalMs) / failRate))
	return min(max(t, minTargetMs), maxTargetMs)
}

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

		if len(cur) > 0 && c.IsLarge() != curLarge {
			flush()
		}

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
