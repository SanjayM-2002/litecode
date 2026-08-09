// Package runtime holds the per-language knowledge: how to compile, how to
// run, and what each toolchain needs to not misbehave. Adding Python, Java,
// TypeScript, Go or Rust should be a map entry here, not new code anywhere.
package runtime

import "fmt"

type Runtime struct {
	ID       string
	Language string // matches the Prisma `Language` enum

	SourceFile string
	// Artifact is the one file that survives between chunks. For interpreted
	// languages it's the source itself.
	Artifact string

	MaxProcs int
	Env      []string

	// CompileArgv is nil for interpreted languages.
	CompileArgv func(includeDir string) []string
	// RunArgv is a func because Node needs the memory limit baked into argv.
	RunArgv func(memKB int) []string
}

var registry = map[string]*Runtime{
	"cpp-14": {
		ID:         "cpp-14",
		Language:   "CPP",
		SourceFile: "main.cpp",
		Artifact:   "prog",
		// g++ forks cc1plus, as and collect2. A low --processes fails the
		// compile with a confusing "cannot fork" instead of a compile error.
		MaxProcs: 64,
		Env:      []string{"PATH=/usr/bin:/bin"},
		CompileArgv: func(includeDir string) []string {
			return []string{
				"/usr/bin/g++",
				"-O2", "-std=c++20", "-static",
				// includeDir holds the precompiled bits/stdc++.h.gch. The PCH
				// is only used if these flags match the ones it was built
				// with — change -O2 or -std here and you silently lose the
				// 2.4s saving with no error.
				"-I" + includeDir,
				"-o", "prog", "main.cpp",
			}
		},
		RunArgv: func(int) []string { return []string{"./prog"} },
	},

	"node-22": {
		ID:         "node-22",
		Language:   "JAVASCRIPT",
		SourceFile: "main.js",
		Artifact:   "main.js",
		// V8's GC threads plus the libuv threadpool. Node will not start
		// under roughly 20.
		MaxProcs: 64,
		Env:      []string{"PATH=/usr/local/bin:/usr/bin:/bin", "HOME=/box"},
		RunArgv: func(memKB int) []string {
			// Without this, V8 sizes its heap from HOST memory, ignores the
			// cgroup cap, and gets OOM-killed mid-GC — which surfaces as a
			// mysterious runtime error instead of MLE. Classic judge bug.
			heapMB := memKB * 80 / 100 / 1024
			if heapMB < 32 {
				heapMB = 32
			}
			return []string{
				"/usr/local/bin/node",
				fmt.Sprintf("--max-old-space-size=%d", heapMB),
				"main.js",
			}
		},
	},
}

// byLanguage maps the Prisma Language enum to a default runtime id.
var byLanguage = map[string]string{
	"CPP":        "cpp-14",
	"JAVASCRIPT": "node-22",
}

func Get(id string) (*Runtime, bool) {
	rt, ok := registry[id]
	return rt, ok
}

// ForLanguage resolves a submission's language to its pinned runtime. Record
// the resolved id on the submission so a verdict stays explicable after a
// toolchain bump.
func ForLanguage(lang string) (*Runtime, error) {
	id, ok := byLanguage[lang]
	if !ok {
		return nil, fmt.Errorf("no runtime configured for language %q", lang)
	}
	return registry[id], nil
}

// Compiled reports whether this runtime has a separate compile phase.
func (r *Runtime) Compiled() bool { return r.CompileArgv != nil }
