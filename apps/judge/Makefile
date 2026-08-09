.PHONY: build run test lint tidy docker up logs down shell clean

BINARY := dist/judge
IMAGE  := litecode-judge:dev

# Native and Docker need DIFFERENT values — JUDGE_SANDBOX (local vs isolate)
# and the DATABASE_URL host (localhost vs host.docker.internal) — so they get
# separate files. `.env` is the Docker one, since compose reads it directly.
# Override with: make run ENV_FILE=.env
ENV_FILE ?= $(if $(wildcard .env.native),.env.native,.env)

build:
	go build -o $(BINARY) ./cmd/judge

# Native run. Go reads only the process environment, so the file has to be
# sourced here — nothing in the app parses .env.
run:
	set -a && . ./$(ENV_FILE) && set +a && go run ./cmd/judge

test:
	go test ./...

lint:
	go vet ./...

tidy:
	go mod tidy

# Builds the full runtime image: isolate + g++ (with precompiled headers) + node.
# Takes a few minutes the first time, mostly the PCH step.
docker:
	docker build -t $(IMAGE) .

# Run the worker. Flags (privileged, tmpfs, cgroup ns, host alias) live in
# docker-compose.yml so they can't be forgotten.
up:
	docker compose up --build judge

logs:
	docker compose logs -f judge

down:
	docker compose down

# Interactive shell in the same image — for diagnosing isolate and cgroups.
shell:
	docker compose run --rm shell

clean:
	rm -rf dist
