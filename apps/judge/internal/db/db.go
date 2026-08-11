package db

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/SanjayM-2002/litecode/apps/judge/internal/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DB struct{ pool *pgxpool.Pool }

func Open(ctx context.Context, url string, maxConns int32) (*DB, error) {
	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		return nil, fmt.Errorf("parse DATABASE_URL: %w", err)
	}

	cfg.MaxConns = maxConns

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("connect: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("ping: %w", err)
	}
	return &DB{pool: pool}, nil
}

func (d *DB) Close() { d.pool.Close() }

type Bundle struct {
	Submission model.Submission
	Problem    model.Problem
	DriverCode string
	Cases      []model.TestCase
}

func (d *DB) Claim(ctx context.Context, submissionID string) (bool, error) {
	tag, err := d.pool.Exec(ctx, `
		UPDATE "Submission"
		   SET status = 'RUNNING'::"SubmissionStatus", "startedAt" = now()
		 WHERE id = $1 AND status <> 'GRADED'::"SubmissionStatus"`, submissionID)
	if err != nil {
		return false, fmt.Errorf("claim %s: %w", submissionID, err)
	}
	return tag.RowsAffected() == 1, nil
}

func (d *DB) LoadBundle(ctx context.Context, submissionID string) (*Bundle, error) {
	b := &Bundle{}

	err := d.pool.QueryRow(ctx, `
		SELECT s.id, s."userId", s."problemId", s.language::text, s.code, s.status::text,
		       p.id, p.slug, p."timeLimit_ms", p."memoryLimit_kb",
		       COALESCE(t."driverCode", '')
		  FROM "Submission" s
		  JOIN "Problem" p       ON p.id = s."problemId"
		  LEFT JOIN "CodeTemplate" t
		         ON t."problemId" = s."problemId" AND t.language = s.language
		 WHERE s.id = $1`, submissionID).
		Scan(&b.Submission.ID, &b.Submission.UserID, &b.Submission.ProblemID,
			&b.Submission.Language, &b.Submission.Code, &b.Submission.Status,
			&b.Problem.ID, &b.Problem.Slug, &b.Problem.TimeLimitMS, &b.Problem.MemoryLimitKB,
			&b.DriverCode)
	if err != nil {
		return nil, fmt.Errorf("load submission %s: %w", submissionID, err)
	}

	rows, err := d.pool.Query(ctx, `
		SELECT id, "order", "isSample", "inlineInput", "inlineOutput",
		       "inputPath", "outputPath"
		  FROM "TestCase"
		 WHERE "problemId" = $1
		 ORDER BY "order" ASC`, b.Submission.ProblemID)
	if err != nil {
		return nil, fmt.Errorf("load test cases: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var tc model.TestCase
		var in, out []byte
		if err := rows.Scan(&tc.ID, &tc.Order, &tc.IsSample, &in, &out,
			&tc.InputPath, &tc.OutputPath); err != nil {
			return nil, fmt.Errorf("scan test case: %w", err)
		}
		tc.InlineInput = json.RawMessage(in)
		tc.InlineOutput = json.RawMessage(out)
		b.Cases = append(b.Cases, tc)
	}
	return b, rows.Err()
}

func (d *DB) WriteVerdict(ctx context.Context, submissionID string, r model.Report) (bool, error) {
	results, err := json.Marshal(r.Cases)
	if err != nil {
		return false, fmt.Errorf("marshal testResults: %w", err)
	}

	tx, err := d.pool.Begin(ctx)
	if err != nil {
		return false, fmt.Errorf("begin verdict tx: %w", err)
	}
	defer func() { _ = tx.Rollback(context.WithoutCancel(ctx)) }()

	tag, err := tx.Exec(ctx, `
		UPDATE "Submission"
		   SET status             = 'GRADED'::"SubmissionStatus",
		       verdict            = $2::"Verdict",
		       "testResults"      = $3::jsonb,
		       runtime_ms         = $4,
		       memory_kb          = $5,
		       "failedTestCaseId" = $6,
		       "errorMessage"     = $7,
		       "completedAt"      = now()
		 WHERE id = $1 AND status <> 'GRADED'::"SubmissionStatus"`,
		submissionID, r.Verdict, results, r.RuntimeMS, r.MemoryKB,
		r.FailedTestCaseID, r.ErrorMessage)
	if err != nil {
		return false, fmt.Errorf("write verdict %s: %w", submissionID, err)
	}
	if tag.RowsAffected() != 1 {
		// Already graded. Counters were applied - so committing an empty transaction
		return false, tx.Commit(ctx)
	}

	if r.ProblemID != "" {
		if err := applyStats(ctx, tx, submissionID, r.ProblemID, r.Verdict); err != nil {
			return false, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return false, fmt.Errorf("commit verdict %s: %w", submissionID, err)
	}
	return true, nil
}

func applyStats(ctx context.Context, tx pgx.Tx, submissionID, problemID, verdict string) error {
	accepted := 0
	if verdict == model.VerdictAccepted {
		accepted = 1
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO "ProblemStatsLedger" ("submissionId", "problemId")
		VALUES ($1, $2)
		ON CONFLICT ("submissionId") DO NOTHING`, submissionID, problemID); err != nil {
		return fmt.Errorf("ledger insert %s: %w", submissionID, err)
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO "ProblemStats" ("problemId", "totalSubmissions", "acceptedSubmissions", "updatedAt")
		VALUES ($1, 1, $2, now())
		ON CONFLICT ("problemId") DO UPDATE
		   SET "totalSubmissions"    = "ProblemStats"."totalSubmissions" + 1,
		       "acceptedSubmissions" = "ProblemStats"."acceptedSubmissions" + $2,
		       "updatedAt"           = now()`, problemID, accepted); err != nil {
		return fmt.Errorf("stats upsert %s: %w", problemID, err)
	}
	return nil
}
