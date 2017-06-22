#!/bin/bash

set -x

git config --global user.email "findyourgoodjob@gmail.com"
git config --global user.name "goodjob team (via CI)"

git clone git@github.com:goodjoblife/WorkTimeSurvey-backend.git _apidoc -b gh-pages

mkdir -p "_apidoc/${CIRCLE_BRANCH}"

cp -r apidoc/* "_apidoc/${CIRCLE_BRANCH}"

cd _apidoc
git add -A .
git commit -m "apidoc for ${CIRCLE_SHA1}"
git push origin gh-pages
