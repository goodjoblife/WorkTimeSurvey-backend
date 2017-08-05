#!/bin/bash

set -x

REPO="059402281999.dkr.ecr.ap-northeast-1.amazonaws.com/goodjob/api-server"

./.circleci/prepare-docker-login.sh || exit 1
docker tag "${REPO}:latest" "${REPO}:${CIRCLE_SHA1}" || exit 1
docker push "${REPO}:${CIRCLE_SHA1}" || exit 1

# stage image should be replaced on master branch
if [ "${CIRCLE_BRANCH}" == "master" ]; then
    docker tag "${REPO}:latest" "${REPO}:stage" || exit 1
    docker push "${REPO}:stage" || exit 1
fi

# dev image should be replaced on dev branch
if [ "${CIRCLE_BRANCH}" == "dev" ]; then
    docker tag "${REPO}:latest" "${REPO}:dev" || exit 1
    docker push "${REPO}:dev" || exit 1
fi
