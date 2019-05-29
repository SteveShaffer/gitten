# gish

**HEAVILY IN-DEVELOPMENT.  DO NOT USE UNLESS YOU WANT TO REALLY MESS UP YOUR REPO!**

A narrow and opinionated way to use git that works for me :)

It relies heavily on checking out detached HEADS, doing hard resets, being super opinionated about the merging strategy,
and other things that are fringe enough to not be applicable to most workflows but are common enough to be applicable to a large amount of workflows (at least I hope).

## Setup

1. Create a GitHub personal access token at https://github.com/settings/tokens/new and give it the `repo` scopes.
1. Write the value of that token into a file called `.github/credentials` in this repo.

- TODO: Make repo owner and name dynamic based on .github/config file
- TODO: Allow for .github/credentials to be defined in any parent directory of this repo
- TODO: Do research on if there's any standards around sharing GitHub credentials through dotfiles
- TODO: Provide a mechanism to interactively collect the necessary credential information and store it (i.e. by asking the user for their username and password once)

## Command Reference

### `gish switch <branch-name>`

Checks out the current version of `<branch-name>` from `origin`.
If branch does not exist in `origin`, it creates it off `origin/master`.
Blows out any local copy of that branch that may already exist.

- TODO: Check if local copy of branch is ahead of `origin`.
If so, switch to the local copy and inform the user.
If not, keep existing logic (which effectively fast-forwards the local copy if it's behind).

### `gish commit <message>`

Commits all changes with the given message

- TODO: Auto-prefix the message with the current ticket number (if applicable)
- TODO: Auto-divine the message if none is provided
- TODO: Auto-push: add auto rebase or merge if possible and interactive feedback if not

### `gish pr <title>`

Creates a GitHub PR from the current branch to `origin/master`.

- TODO: Support body
- TODO: Auto-gen a bunch of this stuff
- TODO: Prompt to `commit` if local changes are unsaved?

### `gish merge <pr-number>`

Merges the GitHub pull request.
Assumes squash and merge.

- TODO: Better feedback when the merge is not possible and stuff
- TODO: Be able to ID a PR by the ticket number (or title?)
- TODO: Support other methods of merging
- TODO: Delete the branch after merge

## TODOs

- Use completely separate commands to reduce any confusion with git
  - `save` commit locally without pushing
  - `send`? (commit and) push
- Remove all `console.log` statements
