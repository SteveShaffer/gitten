#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PATH="${DIR}/../bin:$PATH"

# I think if one of these fails, it'll just move on to the next one,
# so either way you should get a random string at the end of it.
RANDOM_STRING=$(date | md5 | head -c8; echo)  # Works on OSX
RANDOM_STRING=$(openssl rand -hex 12)  # Works on Ubuntu (not tested on OSX yet)

# TODO: Switch to using an ACTUAL tmp space
cd "$(dirname "$0")"
rm -rf temp
mkdir temp
cd temp

## TODO: Boil down to `gish open gish-test`
git clone https://github.com/SteveShaffer/gish-test
cd gish-test

# Need to configure git user
git config user.email "test@shaffer.tech"
git config user.name "test account"

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
