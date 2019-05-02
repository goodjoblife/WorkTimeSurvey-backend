#!/bin/sh

set -euo pipefail

REPO="reg.goodjob.life/goodjob/api-server"

docker tag "goodjoblife/api-server:latest" "${REPO}:${CIRCLE_SHA1}"
docker push "${REPO}:${CIRCLE_SHA1}"

# stage image should be replaced on master branch
if [ "${CIRCLE_BRANCH}" == "master" ]; then
    docker tag "goodjoblife/api-server:latest" "${REPO}:stage"
    docker push "${REPO}:stage"
fi

# dev image should be replaced on dev branch
if [ "${CIRCLE_BRANCH}" == "dev" ]; then
    docker tag "goodjoblife/api-server:latest" "${REPO}:dev"
    docker push "${REPO}:dev"
fi
