//go:build !linux

package sandbox

import "syscall"

// On macOS and the BSDs, getrusage reports ru_maxrss in BYTES, not kilobytes.
// Miss this and your local memory numbers are wrong by a factor of 1024.
func maxRSSKB(r *syscall.Rusage) int { return int(r.Maxrss) / 1024 }
