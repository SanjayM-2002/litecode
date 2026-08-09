package grader

import "context"

// Slots hands out sandbox slot ids. It doubles as the admission semaphore, so
// pool size IS the concurrency limit and there is no second knob to keep in
// sync.
//
// Size it to (cores - 2). Sandboxes are CPU-bound, and oversubscribing cores
// inflates every measured runtime — which on a judge turns correct solutions
// into TLEs, because time is part of the output rather than just telemetry.
type Slots struct{ free chan int }

func NewSlots(n int) *Slots {
	s := &Slots{free: make(chan int, n)}
	for i := 0; i < n; i++ {
		s.free <- i
	}
	return s
}

func (s *Slots) Acquire(ctx context.Context) (int, error) {
	select {
	case id := <-s.free:
		return id, nil
	case <-ctx.Done():
		return 0, ctx.Err()
	}
}

func (s *Slots) Release(id int) { s.free <- id }

func (s *Slots) Available() int { return len(s.free) }
