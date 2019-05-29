#!/usr/bin/env bash

RANDOM_STRING=$(date | md5 | head -c8; echo)

cd "$(dirname "$0")"
rm -rf temp
mkdir temp
cd temp

git clone https://github.com/SteveShaffer/gish-test
cd gish-test
mkdir .github
cp ../../../.github/credentials .github/credentials # TODO: Make this not necessary

gish switch test/${RANDOM_STRING}
date >> test.txt
gish commit "test ${RANDOM_STRING}"
gish pr "test PR ${RANDOM_STRING}"
gish switch master

# TODO: Add ability to merge PR by name?
# gish merge "test PR ${RANDOM_STRING}"
