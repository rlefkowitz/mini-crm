.PHONY=build up down itgo itstop clean api db migration test regen-requirements setup-environment
SHELL=/bin/bash
GIT_HASH=$(shell git rev-parse HEAD)

build: # builds the api and db docker images
	docker compose build --build-arg GIT_HASH=$(GIT_HASH)

up: # builds and runs api and db, stays attached to aggregated logs
	docker compose up
down: # destroys api and db containers, including the contents of the DB
	docker compose down

itreset: down up # for when you screw something up and want to hit reset

itgo: # starts the containers in background
	docker compose start
itstop: # stops the containers, preserving data
	docker compose stop
attach: # attach to the background containers' aggregated log stream
	docker compose logs --follow

clean: # nuke everything (containers, images, networks, volumes)
	docker compose stop;
	docker compose down --rmi all --volumes --remove-orphans;
	docker system prune -a -f;

api: # run just the api container and detach
	docker compose up api -d
db: # run just the db container and detach
	docker compose up db -d

# following commands are all run from within an ephemeral api container
migration: db # ensures a db container is running and generates a migration
	@if [[ $$MSG == "" ]]; then echo -e "\nUSAGE:\n\tMSG='summary of changes' make migration\n"; exit 1; fi
	docker compose run --rm api alembic revision --autogenerate -m "$(MSG)"

test: get-test-data # Usage: `make test` or `TESTS="quote" make test`
	@if [ ! -z $$TESTS ]; then docker compose run --rm api pytest -v -k $$TESTS; \
	else docker compose run --rm api pytest -v; fi

regen-requirements: # regenerate requirements.txt package versions
	pip install pip-tools && cp requirements.txt requirements.in && sed -i '' 's/[><=].*//' requirements.txt && pip-compile --upgrade --no-annotate --allow-unsafe --no-header && rm requirements.in && pip install -r requirements.txt

setup-environment: # setup the environment for the first time (or reconfigure if existing components)
	./scripts/setup_environment.sh
