# gish

**HEAVILY IN-DEVELOPMENT.  DO NOT USE UNLESS YOU WANT TO REALLY MESS UP YOUR REPO!**

A narrow and opinionated way to use git that works for me :)

It relies heavily on checking out detached HEADS, doing hard resets, being super opinionated about the merging strategy,
and other things that are fringe enough to not be applicable to most workflows but are common enough to be applicable to a large amount of workflows (at least I hope).

## Setup

1. Create a GitHub personal access token at https://github.com/settings/tokens/new and give it the `repo` scopes.
1. Write the value of that token into a file called `.github/credentials` in this repo.
1. Add the `gish` command to your $PATH.

> TODOs
> 
> - Make repo owner and name dynamic based on .github/config file
> - Allow for .github/credentials to be defined in any parent directory of this repo
> - Do research on if there's any standards around sharing GitHub credentials through dotfiles
> - Provide a mechanism to interactively collect the necessary credential information and store it (i.e. by asking the user for their username and password once)

## Testing

```text
yarn test
```

## Command Reference

### `gish switch <branch-name>`

Checks out the current version of `<branch-name>` from `origin`.
If branch does not exist in `origin`, it creates it off `origin/master`.
Blows out any local copy of that branch that may already exist.

> TODOs
>
> - Check if local copy of branch is ahead of `origin`.
>   If so, switch to the local copy and inform the user.
>   If not, keep existing logic (which effectively fast-forwards the local copy if it's behind).

### `gish commit <message>`

> I'll probably end up deprecating this pretty quickly in favor of `gish save` (see below)

Commits all changes with the given message

> TODOs
>
> - Auto-prefix the message with the current ticket number (if applicable)
> - Auto-divine the message if none is provided
> - Deprecate in favor of `save`

### `gish save [message]`

"Saves" local changes to the current branch.
If `message` is provided, it will overwrite the current commit message.
If the branch on `origin` is ahead of the current local copy, it will attempt to automatically merge those.
If there are conflicts, it will instruct the user to fix those.
At the end of it all, the branch should be in sync with `origin` and have only 1 commit.

In `git` terms, it's basically like `git add . && git commit -a && git push origin --force` if you never had to worry about being out of sync with the remote tracking branch.
So there's a good amount of merging, squash-rebasing, and then force-pushing going on here.

> TODOs
>
> - Hone in default/reused messages
> - Auto-merging and conflict resolution stuff
> - Commit descriptions

### `gish pr <title>`

Creates a GitHub PR from the current branch to `origin/master`.

> TODOs
>
> - Support body
> - Auto-gen a bunch of this stuff
> - Prompt to `commit`/`save` if local changes are unsaved?

### `gish merge <pr-number>`

Merges the GitHub pull request.
Assumes squash and merge.

> TODOs
>
> - Better feedback when the merge is not possible and stuff
> - Be able to ID a PR by the ticket number (or title?) or URL
> - Support other methods of merging beyond squash?
> - Delete the branch after merge

## Assumptions

- `steveshaffer` is the only GitHub user currently supported
- `./.github/credentials` exists and contains a GitHub personal access token as its only non-whitespace content
- `origin` is the only remote and represents a GitHub repo
- `master` is the integration branch and is not intended to be committed directly to
- All commits to `master` are intended to be squashed PR merges

## Overall TODOs

- Get a better name
- Remove all debugging `console.log` statements
- Fix how it runs as a "binary."  Should be more standard and able to run with `npx`
- Make it into an actual binary with something like pkg.
- Figure out how to get prettier to run only on staged files during pre-commit hook
- Convert to TypeScript
