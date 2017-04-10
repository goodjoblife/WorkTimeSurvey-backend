NODE = docker-compose run --rm node

all:

.PHONY: test
test:
	$(NODE) npm test
