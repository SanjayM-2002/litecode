.PHONY: build run test lint tidy docker up logs down shell clean

BINARY := dist/judge
IMAGE  := litecode-judge:dev

ENV_FILE ?= $(if $(wildcard .env.native),.env.native,.env)

build:
	go build -o $(BINARY) ./cmd/judge

run:
	set -a && . ./$(ENV_FILE) && set +a && go run ./cmd/judge

test:
	go test ./...

lint:
	go vet ./...

tidy:
	go mod tidy

docker:
	docker build -t $(IMAGE) .

up:
	docker compose up --build judge

logs:
	docker compose logs -f judge

down:
	docker compose down

shell:
	docker compose run --rm shell

clean:
	rm -rf dist
