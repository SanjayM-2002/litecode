package grader

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/SanjayM-2002/litecode/apps/judge/internal/cache"
	"github.com/SanjayM-2002/litecode/apps/judge/internal/compare"
	"github.com/SanjayM-2002/litecode/apps/judge/internal/db"
	"github.com/SanjayM-2002/litecode/apps/judge/internal/logging"
	"github.com/SanjayM-2002/litecode/apps/judge/internal/model"
	"github.com/SanjayM-2002/litecode/apps/judge/internal/plan"
	"github.com/SanjayM-2002/litecode/apps/judge/internal/runtime"
	"github.com/SanjayM-2002/litecode/apps/judge/internal/sandbox"
)

const userCodePlaceholder = "{{USER_CODE}}"

const (
	compileWall  = 20 * time.Second
	compileCPU   = 10 * time.Second
	compileMemKB = 512 << 10
	compileFSize = 64 << 10

	runFSizeKB   = 8 << 10
	runOutCapKB  = 256
	defaultFail  = 0.5 // assumed failure rate until ProblemStats is wired in
	writeTimeout = 10 * time.Second
)

type Grader struct {
	db       *db.DB
	sb       sandbox.Sandbox
	slots    *Slots
	cache    *cache.Client
	includes string
	log      *slog.Logger
}

func New(
	database *db.DB,
	sb sandbox.Sandbox,
	slots *Slots,
	cch *cache.Client,
	includeDir string,
	log *slog.Logger,
) *Grader {
	return &Grader{db: database, sb: sb, slots: slots, cache: cch, includes: includeDir, log: log}
}

func (g *Grader) Grade(ctx context.Context, jobID string) error {
	log := g.log.With("job_id", jobID)
	started := time.Now()
	logging.Checkpoint(log, 1, "job_received")

	claimed, err := g.db.Claim(ctx, jobID)
	if err != nil {
		return err
	}
	if !claimed {
		// Already GRADED — a duplicate delivery. Ack and move on.
		log.Info("already graded, skipping duplicate delivery")
		return nil
	}
	logging.Checkpoint(log, 2, "claimed")

	bundle, err := g.db.LoadBundle(ctx, jobID)
	if err != nil {
		return err
	}
	logging.Checkpoint(log, 3, "bundle_loaded",
		"language", bundle.Submission.Language,
		"cases", len(bundle.Cases),
		"time_limit_ms", bundle.Problem.TimeLimitMS,
		"mem_limit_kb", bundle.Problem.MemoryLimitKB)

	if bundle.DriverCode == "" {
		return g.fail(ctx, jobID, fmt.Sprintf("no CodeTemplate for language %s", bundle.Submission.Language))
	}
	if len(bundle.Cases) == 0 {
		return g.fail(ctx, jobID, "problem has no test cases")
	}
	if !strings.Contains(bundle.DriverCode, userCodePlaceholder) {
		return g.fail(ctx, jobID, "driver template is missing the "+userCodePlaceholder+" placeholder")
	}

	rt, err := runtime.ForLanguage(bundle.Submission.Language)
	if err != nil {
		return g.fail(ctx, jobID, err.Error())
	}

	source := strings.ReplaceAll(bundle.DriverCode, userCodePlaceholder, bundle.Submission.Code)
	logging.Checkpoint(log, 4, "source_assembled", "runtime", rt.ID, "bytes", len(source))

	slot, err := g.slots.Acquire(ctx)
	if err != nil {
		return err
	}
	defer g.slots.Release(slot)

	box, err := g.sb.Open(ctx, slot)
	if err != nil {
		return err
	}

	defer func() {
		if cerr := box.Close(context.WithoutCancel(ctx)); cerr != nil {
			log.Warn("box cleanup failed", "slot", slot, "err", cerr)
		}
	}()
	logging.Checkpoint(log, 5, "box_opened", "slot", slot, "dir", box.Dir())

	if err := os.WriteFile(filepath.Join(box.Dir(), rt.SourceFile), []byte(source), 0o644); err != nil {
		return fmt.Errorf("write source: %w", err)
	}

	// ── compile once ────────────────────────────────────────────────────
	if rt.Compiled() {
		res, err := box.Run(ctx, sandbox.Spec{
			Argv: rt.CompileArgv(g.includes),
			Env:  rt.Env,
			// isolate binds /usr and /bin by default but NOT /opt, so without
			// this the include dir does not exist inside the box. That's fatal,
			// not merely slow: bits/stdc++.h would fall back to the system copy
			// (losing the PCH), but json.hpp exists ONLY here, so every C++
			// compile fails with "json.hpp: No such file or directory".
			BindDirs: []string{g.includes},
			CPUTime:  compileCPU,
			WallTime: compileWall,
			MemKB:    compileMemKB,
			MaxProcs: rt.MaxProcs,
			FSizeKB:  compileFSize,
			OutCapKB: 16,
		})
		if err != nil {
			return fmt.Errorf("compile: %w", err)
		}
		logging.Checkpoint(log, 6, "compiled",
			"status", res.Status, "wall_ms", res.WallTime.Milliseconds())

		if res.Status != sandbox.StatusOK {
			msg := string(res.Stderr)
			if msg == "" {
				msg = res.Message
			}
			return g.persist(ctx, jobID, model.Report{
				Verdict:      model.VerdictCompilationError,
				ErrorMessage: strptr(msg),
				ProblemID:    bundle.Problem.ID,
				ProblemSlug:  bundle.Problem.Slug,
				UserID:       bundle.Submission.UserID,
			})
		}

		// Recycle the box so the run gets a clean cgroup.
		if newBox, err := recycle(ctx, g.sb, box, slot, rt.Artifact); err != nil {
			return fmt.Errorf("recycle box after compile: %w", err)
		} else {
			box = newBox
		}
		logging.Checkpoint(log, 6, "box_recycled", "slot", slot, "artifact", rt.Artifact)
	} else {
		logging.Checkpoint(log, 6, "compile_skipped", "reason", "interpreted runtime")
	}

	// ── plan chunks ─────────────────────────────────────────────────────
	cm := plan.ModelFor(rt.ID)
	chunks := plan.Build(bundle.Cases, cm, defaultFail)
	logging.Checkpoint(log, 7, "chunks_planned",
		"chunks", len(chunks), "shape", plan.Describe(chunks))

	report, err := g.runChunks(ctx, log, box, rt, bundle, chunks)
	if err != nil {
		return err
	}
	logging.Checkpoint(log, 9, "verdict_computed",
		"verdict", report.Verdict, "cases_run", len(report.Cases),
		"elapsed_ms", time.Since(started).Milliseconds())

	return g.persist(ctx, jobID, report)
}

func (g *Grader) runChunks(
	ctx context.Context,
	log *slog.Logger,
	box sandbox.Box,
	rt *runtime.Runtime,
	bundle *db.Bundle,
	chunks [][]model.TestCase,
) (model.Report, error) {
	rep := model.Report{
		Verdict:     model.VerdictAccepted,
		ProblemID:   bundle.Problem.ID,
		ProblemSlug: bundle.Problem.Slug,
		UserID:      bundle.Submission.UserID,
	}

	// Problem.timeLimit_ms is the TOTAL budget for the submission
	cpuLeft := time.Duration(bundle.Problem.TimeLimitMS) * time.Millisecond
	wallLeft := 2 * cpuLeft

	var totalCPU time.Duration
	var peakMem int
	var chunksRun int

	for ci, chunk := range chunks {
		if cpuLeft <= 0 || wallLeft <= 0 {
			rep.Verdict = model.VerdictTimeLimitExceeded
			rep.FailedTestCaseID = &chunk[0].ID
			rep.ErrorMessage = strptr("time limit exceeded")
			rep.Cases = append(rep.Cases, caseResult(chunk[0], model.VerdictTimeLimitExceeded, nil, nil))
			break
		}

		stdinFile, expected, err := stageChunk(box.Dir(), chunk)
		if err != nil {
			return rep, err
		}

		res, err := box.Run(ctx, sandbox.Spec{
			Argv: rt.RunArgv(bundle.Problem.MemoryLimitKB),
			Env:  rt.Env,
			// Time DRAINS across chunks (total budget); memory is fresh per
			// chunk, so a case never fails because of what ran before it.
			CPUTime:   cpuLeft,
			WallTime:  wallLeft,
			MemKB:     bundle.Problem.MemoryLimitKB,
			MaxProcs:  rt.MaxProcs,
			FSizeKB:   runFSizeKB,
			StdinFile: stdinFile,
			OutCapKB:  runOutCapKB,
		})
		if err != nil {
			return rep, fmt.Errorf("chunk %d: %w", ci, err)
		}

		chunksRun++
		cpuLeft -= res.CPUTime
		wallLeft -= res.WallTime
		totalCPU += res.CPUTime
		if res.PeakMemKB > peakMem {
			peakMem = res.PeakMemKB
		}

		badIdx, produced := compare.MatchLines(res.Stdout, expected)
		logging.Checkpoint(log, 8, "chunk_done",
			"chunk", ci, "cases", len(chunk), "status", res.Status,
			"lines", produced, "first_bad", badIdx,
			"cpu_ms", res.CPUTime.Milliseconds(), "cpu_left_ms", cpuLeft.Milliseconds())

		// Execution failure — free, no comparator needed, and it's the
		// expensive failure class so stopping here matters.
		if res.Status != sandbox.StatusOK {
			failed := chunk[min(produced, len(chunk)-1)]
			rep.Verdict = verdictFor(res.Status)
			rep.FailedTestCaseID = &failed.ID
			rep.ErrorMessage = strptr(nonEmpty(string(res.Stderr), res.Message))
			rep.Cases = append(rep.Cases,
				passedBefore(chunk, produced, res.Stdout)...)
			rep.Cases = append(rep.Cases,
				caseResult(failed, rep.Verdict, nil, strptr(string(res.Stderr))))
			break
		}

		// Wrong answer. Comparing here — rather than after all chunks
		if badIdx >= 0 {
			failed := chunk[badIdx]
			rep.Verdict = model.VerdictWrongAnswer
			rep.FailedTestCaseID = &failed.ID
			rep.Cases = append(rep.Cases, passedBefore(chunk, badIdx, res.Stdout)...)
			rep.Cases = append(rep.Cases,
				caseResult(failed, model.VerdictWrongAnswer,
					lineAt(res.Stdout, badIdx), strptr(string(res.Stderr))))
			break
		}

		rep.Cases = append(rep.Cases, passedBefore(chunk, len(chunk), res.Stdout)...)

		// The filesystem persists between chunks even though the process does not
		if err := sandbox.Scrub(box.Dir(), rt.Artifact); err != nil {
			return rep, fmt.Errorf("scrub box: %w", err)
		}
	}

	if chunksRun > 0 {
		ms := int(totalCPU.Milliseconds())
		rep.RuntimeMS = &ms
		rep.MemoryKB = &peakMem
	}
	return rep, nil
}

func recycle(
	ctx context.Context,
	sb sandbox.Sandbox,
	old sandbox.Box,
	slot int,
	artifact string,
) (sandbox.Box, error) {
	blob, err := os.ReadFile(filepath.Join(old.Dir(), artifact))
	if err != nil {
		return nil, fmt.Errorf("read artifact %q: %w", artifact, err)
	}

	if err := old.Close(context.WithoutCancel(ctx)); err != nil {
		return nil, fmt.Errorf("close old box: %w", err)
	}

	fresh, err := sb.Open(ctx, slot)
	if err != nil {
		return nil, fmt.Errorf("reopen box: %w", err)
	}

	// 0o755: this is the executable the run stage invokes.
	if err := os.WriteFile(filepath.Join(fresh.Dir(), artifact), blob, 0o755); err != nil {
		_ = fresh.Close(context.WithoutCancel(ctx))
		return nil, fmt.Errorf("restore artifact: %w", err)
	}
	return fresh, nil
}

func stageChunk(dir string, chunk []model.TestCase) (string, []json.RawMessage, error) {
	var buf bytes.Buffer
	expected := make([]json.RawMessage, 0, len(chunk))

	for _, tc := range chunk {
		if tc.IsLarge() {
			return "", nil, fmt.Errorf("test case %s is object-store backed; GCS support not implemented", tc.ID)
		}
		var compact bytes.Buffer
		if err := json.Compact(&compact, tc.InlineInput); err != nil {
			return "", nil, fmt.Errorf("compact input for case %s: %w", tc.ID, err)
		}
		buf.Write(compact.Bytes())
		buf.WriteByte('\n')
		expected = append(expected, tc.InlineOutput)
	}

	const name = "input.txt"
	if err := os.WriteFile(filepath.Join(dir, name), buf.Bytes(), 0o644); err != nil {
		return "", nil, fmt.Errorf("write chunk input: %w", err)
	}
	return name, expected, nil
}

func (g *Grader) persist(ctx context.Context, jobID string, rep model.Report) error {
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), writeTimeout)
	defer cancel()

	written, err := g.db.WriteVerdict(ctx, jobID, rep)
	if err != nil {
		return err // do NOT ack — redelivery retries it
	}
	logging.Checkpoint(g.log.With("job_id", jobID), 10, "verdict_written",
		"verdict", rep.Verdict, "written", written)

	if written {
		g.cache.AfterVerdict(ctx, rep.UserID, rep.ProblemSlug)
	}
	if !written {
		g.log.Warn("verdict write was a no-op (already GRADED)", "job_id", jobID)
	}
	return nil
}

func (g *Grader) fail(ctx context.Context, jobID, msg string) error {
	g.log.Warn("permanent grading failure", "job_id", jobID, "reason", msg)
	return g.persist(ctx, jobID, model.Report{
		Verdict:      model.VerdictInternalError,
		ErrorMessage: &msg,
	})
}

func verdictFor(s sandbox.Status) string {
	switch s {
	case sandbox.StatusTLE:
		return model.VerdictTimeLimitExceeded
	case sandbox.StatusMLE:
		return model.VerdictMemoryLimitExceeded
	case sandbox.StatusRE, sandbox.StatusOLE:
		return model.VerdictRuntimeError
	default:
		return model.VerdictInternalError
	}
}

func passedBefore(chunk []model.TestCase, n int, stdout []byte) []model.CaseResult {
	if n > len(chunk) {
		n = len(chunk)
	}
	out := make([]model.CaseResult, 0, n)
	for i := 0; i < n; i++ {
		out = append(out, caseResult(chunk[i], model.VerdictAccepted, lineAt(stdout, i), nil))
	}
	return out
}

func caseResult(tc model.TestCase, verdict string, stdout, stderr *string) model.CaseResult {
	return model.CaseResult{
		TestCaseID: tc.ID,
		IsSample:   tc.IsSample,
		Verdict:    verdict,
		Stdout:     stdout,
		Stderr:     stderr,
		RuntimeMS:  nil, // per case data not present
		MemoryKB:   nil,
	}
}

func lineAt(stdout []byte, i int) *string {
	lines := strings.Split(strings.TrimRight(string(stdout), "\n"), "\n")
	if i < 0 || i >= len(lines) {
		return nil
	}
	return &lines[i]
}

func nonEmpty(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

func strptr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
