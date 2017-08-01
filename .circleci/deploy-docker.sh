#!/bin/bash

set -x

REPO="059402281999.dkr.ecr.ap-northeast-1.amazonaws.com/goodjob/api-server"

./.circleci/prepare-docker-login.sh || exit 1
docker tag "${REPO}:latest" "${REPO}:${CIRCLE_SHA1}" || exit 1
docker tag "${REPO}:latest" "${REPO}:stage" || exit 1
docker push "${REPO}:${CIRCLE_SHA1}" || exit 1
docker push "${REPO}:stage" || exit 1
