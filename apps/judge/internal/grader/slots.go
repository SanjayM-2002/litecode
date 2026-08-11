package grader

import "context"

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
