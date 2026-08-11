package model

import "encoding/json"

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

	// Large cases live in object storage, if present
	InputPath  *string
	OutputPath *string
}

func (t TestCase) IsLarge() bool { return t.InputPath != nil }

func (t TestCase) InputBytes() int {
	if t.IsLarge() {
		return 8 << 20
	}
	return len(t.InlineInput)
}

const (
	VerdictAccepted            = "ACCEPTED"
	VerdictWrongAnswer         = "WRONG_ANSWER"
	VerdictTimeLimitExceeded   = "TIME_LIMIT_EXCEEDED"
	VerdictMemoryLimitExceeded = "MEMORY_LIMIT_EXCEEDED"
	VerdictCompilationError    = "COMPILATION_ERROR"
	VerdictRuntimeError        = "RUNTIME_ERROR"
	VerdictInternalError       = "INTERNAL_ERROR"
)

const (
	StatusPending = "PENDING"
	StatusRunning = "RUNNING"
	StatusGraded  = "GRADED"
)

type CaseResult struct {
	TestCaseID string  `json:"testCaseId"`
	IsSample   bool    `json:"isSample"`
	Verdict    string  `json:"verdict"`
	RuntimeMS  *int    `json:"runtime_ms"`
	MemoryKB   *int    `json:"memory_kb"`
	Stdout     *string `json:"stdout"`
	Stderr     *string `json:"stderr"`
}

type Report struct {
	Verdict          string
	Cases            []CaseResult
	RuntimeMS        *int
	MemoryKB         *int
	FailedTestCaseID *string
	ErrorMessage     *string
	ProblemID        string
	ProblemSlug      string
	UserID           string
}
