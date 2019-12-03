# gitten

<img src="gitten.png" height="200" alt="gitten logo">

git for humans

**⚠️ WARNING: THIS IS HEAVILY IN-DEVELOPMENT.  DO NOT USE UNLESS YOU'RE WILLING TO MESS UP YOUR REPO!**

## The Vision

The current goal is to make git get out of the way and allow work flows that have just a few human-friendly commands 
like `open`, `switch`, `save`, `pr`, and `merge` and rely on upfront configuration (often shared amongst an entire team)
for sensible defaults so there's very little data collection needed at command time.

```bash
~ $ gitten open my-repo-name
Cloned repo https://github.com/steveshaffer/my-repo-name 

my-repo-name $ gitten switch 12345 # Where ABC-12345 is a ticket number
Switched to branch feature/ABC-12345 and set ticket [ABC-12345 Users cannot login] status to "In Progress"

# Edit files on disk...

my-repo-name $ gitten save "Fix login"
Saved all changes with label "ABC-12345 Fix login" and pushed to GitHub

my-repo-name $ gitten pr
Created pull request https://github.com/steveshaffer/my-repo-name/pull/42
```

*Go get the PR reviewed but there were changed requested...*

```bash
~ $ gitten open my-repo-name@12345
Opened ~/projects/github.com/steveshaffer/my-repo-name on branch feature/ABC-12345

my-repo-name $ gitten save
Saved all changes with label "ABC-12345 Fix login" and pushed to GitHub
```

*Go get the PR approved...*

```bash
~ gitten open my-repo-name
Opened ~/projects/github.com/steveshaffer/my-repo-name on branch master

my-repo-name $ gitten merge 42
Merged pull request https://github.com/steveshaffer/my-repo-name/pull/42
```

This is possible if we know your...

- on-disk project directory (e.g. `~/projects`)
- on-disk filing methodology (e.g. `~/projects/github.com/<owner>/<repo>`, `~/projects/<repo>`)
- centralized source code hosting platform (e.g. GitHub) and credentials
- branching methodology (e.g. trunk-based, git-flow, github-flow)
- ticket system (e.g. Jira, GitHub issues)
- ticket naming convention (e.g. ABC-12345)
- commit message convention (e.g. "ABC-12345 <description>")
- coordination between ticket system statuses and branching methodology (e.g. In Progress on checkout, Peer Review upon PR, Closed upon merge to master)

The cross-product of the answers to all these questions could be bundled into a "plugin" for gitten
so we could support all kinds of different work flows from the same core set of commands.

### The "gitten-flow"?..

The initial flow being supported is an unusual one that's useful for this because it happens to map 1:1 with the core commands.
It's something like trunk-based development with a protected master branch and GitHub PRs that are squash-merged.
But every commit is also pushed, and the squashing happens continually and forcefully upon every commit so there's only ever 1 commit on the branch/PR.

It forces the reconciliation of conflicts between multiple developers working on the same branch to happen early and often (since commit and push are coupled).
And it throws out any concern of a detailed commit history within the branch (since you're just going to squash-merge it anyway).

It relies heavily on checking out detached HEADS, doing hard resets, being super opinionated about the merging strategy,
and other things that are fringe enough to not be applicable to many work flows but are common enough to be applicable to a large amount of work flows (at least I hope).

The future hope is that we could also map these core commands to other more standard and complex workflows

## Setup

1. Create a GitHub personal access token at https://github.com/settings/tokens/new and give it the `repo` scopes.
1. Write `{"github": {"accessToken": "<the access token>"} }` into `~/.gitten.json` (or actually any `.gitten.json` file in any directory above where you're going to run the gitten commands).
1. Add the [bin](bin) directory command (in this project) to your $PATH.

> TODOs
> 
> - Build `config` or `init` command to initialize `~/.gitten.json` file
> - Do research on if there's any standards around sharing GitHub credentials through dotfiles
> - Provide a mechanism to interactively collect the necessary credential information and store it (i.e. by asking the user for their username and password once)

## Testing

`yarn test` will run a happy-path script that tries out all the commands.
It assumes you have git properly configured on the machine.
There's no assertions or anything so it's possible for it to run without failure and still be executing incorrectly.
Right now it's just a safety net for me as I'm hacking away.

> TODOs
>
> - Use an actual testing framework and stuff

## Command Reference

### `gitten switch <branch-name>`

Checks out the current version of `<branch-name>` from `origin`.
If branch does not exist in `origin`, it creates it off `origin/master`.
Blows out any local copy of that branch that may already exist.

> TODOs
>
> - Check if local copy of branch is ahead of `origin`.
>   If so, switch to the local copy and inform the user.
>   If not, keep existing logic (which effectively fast-forwards the local copy if it's behind).

### `gitten commit <message>`

> I'll probably end up deprecating this pretty quickly in favor of `gitten save` (see below)

Commits all changes with the given message

> TODOs
>
> - Auto-prefix the message with the current ticket number (if applicable)
> - Auto-divine the message if none is provided
> - Deprecate in favor of `save`

### `gitten save [message]`

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

### `gitten pr <title>`

Creates a GitHub PR from the current branch to `origin/master`.

> TODOs
>
> - Support body
> - Auto-gen a bunch of this stuff
> - Prompt to `commit`/`save` if local changes are unsaved?
> - Make STDOUT have a more narrative message by default but configurable to just give the PR ID, number, or URL so it can be called transactionally

### `gitten merge <pr-number>`

Merges the GitHub pull request.
Assumes squash and merge.

> TODOs
>
> - Better feedback when the merge is not possible and stuff
> - Be able to ID a PR by the ticket number (or title?) or URL
> - Support other methods of merging beyond squash?
> - Delete the branch after merge

## Assumptions

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
- Build a plugin framework to support various work flows (i.e. trunk-based, github-flow, git-flow, etc.)
- Build a GUI cuz humans use GUIs
