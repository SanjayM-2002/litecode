//go:build linux

package sandbox

import "syscall"

// On Linux, getrusage reports ru_maxrss in KILOBYTES.
func maxRSSKB(r *syscall.Rusage) int { return int(r.Maxrss) }
