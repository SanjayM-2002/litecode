// Package model holds the domain types shared across the judge. These mirror
// the Prisma schema; the JSON tags on CaseResult must stay byte-compatible
// with the PerCaseResult shape the web app already renders.
package model

import "encoding/json"

// Job is the message body published by backend-core. Deliberately a claim
// check — ids only. Test data never travels through the broker, because a
// broker holds messages in memory and large cases would be an OOM waiting
// to happen.
type Job struct {
	JobID     string `json:"jobId"`
	ProblemID string `json:"problemId"`
}

type Submission struct {
	ID        string
	UserID    string
	ProblemID string
	Language  string
	Code      string
	Status    string
}

type Problem struct {
	ID            string
	Slug          string // needed to bust the problem-detail cache after a verdict
	TimeLimitMS   int
	MemoryLimitKB int
}

type TestCase struct {
	ID       string
	Order    int
	IsSample bool

	// Small cases are stored inline as JSON in Postgres.
	InlineInput  json.RawMessage
	InlineOutput json.RawMessage

	// Large cases live in object storage; these are the keys. Exactly one of
	// (InlineInput, InputPath) is set — enforced by a CHECK constraint.
	InputPath  *string
	OutputPath *string
}

// IsLarge reports whether this case must be fetched from object storage.
// It's also the cost class used by the chunk planner: cheap cases get grouped
// aggressively, expensive ones get their own chunk.
func (t TestCase) IsLarge() bool { return t.InputPath != nil }

// InputBytes is the planner's cost proxy. It only needs to be monotone in the
// real cost and right to within a factor of two.
func (t TestCase) InputBytes() int {
	if t.IsLarge() {
		// TODO(gcs): use the object's real size once the storage client lands.
		return 8 << 20
	}
	return len(t.InlineInput)
}

// Verdict values must match the Prisma `Verdict` enum exactly.
const (
	VerdictAccepted            = "ACCEPTED"
	VerdictWrongAnswer         = "WRONG_ANSWER"
	VerdictTimeLimitExceeded   = "TIME_LIMIT_EXCEEDED"
	VerdictMemoryLimitExceeded = "MEMORY_LIMIT_EXCEEDED"
	VerdictCompilationError    = "COMPILATION_ERROR"
	VerdictRuntimeError        = "RUNTIME_ERROR"
	VerdictInternalError       = "INTERNAL_ERROR"
)

// SubmissionStatus values must match the Prisma `SubmissionStatus` enum.
const (
	StatusPending = "PENDING"
	StatusRunning = "RUNNING"
	StatusGraded  = "GRADED"
)

// CaseResult is one row of Submission.testResults. Field names are the
// snake_case ones the frontend already reads — do not "tidy" them.
type CaseResult struct {
	TestCaseID string  `json:"testCaseId"`
	IsSample   bool    `json:"isSample"`
	Verdict    string  `json:"verdict"`
	RuntimeMS  *int    `json:"runtime_ms"`
	MemoryKB   *int    `json:"memory_kb"`
	Stdout     *string `json:"stdout"`
	Stderr     *string `json:"stderr"`
}

// Report is what the grader produces and the database writer persists.
type Report struct {
	Verdict          string
	Cases            []CaseResult
	RuntimeMS        *int
	MemoryKB         *int
	FailedTestCaseID *string
	ErrorMessage     *string

	// Identity of what was graded, for the side effects that ride along with
	// the verdict: the ProblemStats counters and the caches those counters
	// invalidate. Empty on failure paths that abort before the bundle loads —
	// there is no problem to attribute the submission to, so the counters are
	// skipped rather than guessed at.
	ProblemID   string
	ProblemSlug string
	UserID      string
}
