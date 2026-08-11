package runtime

import "fmt"

type Runtime struct {
	ID          string
	Language    string // matches the Prisma `Language` enum
	SourceFile  string
	Artifact    string
	MaxProcs    int
	Env         []string
	CompileArgv func(includeDir string) []string
	RunArgv     func(memKB int) []string
}

var registry = map[string]*Runtime{
	"cpp-14": {
		ID:         "cpp-14",
		Language:   "CPP",
		SourceFile: "main.cpp",
		Artifact:   "prog",
		MaxProcs:   64,
		Env:        []string{"PATH=/usr/bin:/bin"},
		CompileArgv: func(includeDir string) []string {
			return []string{
				"/usr/bin/g++",
				"-O2", "-std=c++20", "-static",
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
		MaxProcs:   64,
		Env:        []string{"PATH=/usr/local/bin:/usr/bin:/bin", "HOME=/box"},
		RunArgv: func(memKB int) []string {
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

var byLanguage = map[string]string{
	"CPP":        "cpp-14",
	"JAVASCRIPT": "node-22",
}

func Get(id string) (*Runtime, bool) {
	rt, ok := registry[id]
	return rt, ok
}

func ForLanguage(lang string) (*Runtime, error) {
	id, ok := byLanguage[lang]
	if !ok {
		return nil, fmt.Errorf("no runtime configured for language %q", lang)
	}
	return registry[id], nil
}

func (r *Runtime) Compiled() bool { return r.CompileArgv != nil }
