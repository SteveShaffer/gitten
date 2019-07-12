#!/usr/bin/env bash

RANDOM_STRING=$(date | md5 | head -c8; echo)

cd "$(dirname "$0")"
rm -rf temp
mkdir temp
cd temp

## TODO: Boil down to `gish open gish-test`
git clone https://github.com/SteveShaffer/gish-test
cd gish-test

# Testing commit and pr
gish switch test-commit/${RANDOM_STRING}
date >> test.txt
gish commit "test ${RANDOM_STRING}"
gish pr "test-commit PR ${RANDOM_STRING}"
gish switch master
# TODO: Add ability to merge PR by name? or URL
# gish merge "test-commit PR ${RANDOM_STRING}"

# Testing save and pr
gish switch test-save/${RANDOM_STRING}
date >> test.txt
gish save "test first save ${RANDOM_STRING}"
gish pr "test-save PR ${RANDOM_STRING}"
# TODO: Assert PR name is correct
date >> test.txt
gish save "test later ${RANDOM_STRING}"
# TODO: Assert the first save isn't left in the commit history
# TODO: Assert test.txt contains both lines
# TODO: Add ability to merge PR by name? or URL
# gish merge "test-save PR ${RANDOM_STRING}"

# TODO: Test saving when there's conflicts
