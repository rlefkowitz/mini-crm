.PHONY=build up down db clean migration regen-requirements setup-environment
SHELL=/bin/bash

build: # builds the api and db docker images
	docker compose build

up: # builds and runs api and db, stays attached to aggregated logs
	docker compose up
down: # destroys api and db containers, including the contents of the DB
	docker compose down

db: # ensures a db container is running
	docker compose up -d db

clean: # nuke everything (containers, images, networks, volumes)
	docker compose stop;
	docker compose down --rmi all --volumes --remove-orphans;
	docker system prune -a -f;

migration: db # ensures a db container is running and generates a migration
	@if [[ $$MSG == "" ]]; then echo -e "\nUSAGE:\n\tMSG='summary of changes' make migration\n"; exit 1; fi
	docker compose run --rm api alembic revision --autogenerate -m "$(MSG)"

regen-requirements: # regenerate requirements.txt package versions
	pip install pip-tools && cp requirements.txt requirements.in && sed -i '' 's/[><=].*//' requirements.txt && pip-compile --upgrade --no-annotate --allow-unsafe --no-header && rm requirements.in && pip install -r requirements.txt

setup-environment: # setup the environment for the first time (or reconfigure if existing components)
	./scripts/setup_environment.sh
