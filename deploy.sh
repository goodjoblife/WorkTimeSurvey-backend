#!/bin/bash

npm install apidoc -g

REV=`git describe --always`

git clone git@github.com:goodjoblife/WorkTimeSurvey-backend.git doc -b gh-pages --depth 1

apidoc -i routes/

cd doc

git add -A .
git commit -m "apidoc for $REV"
git push origin gh-pages
