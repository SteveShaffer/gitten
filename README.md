# gish

**HEAVILY IN-DEVELOPMENT.  DO NOT USE UNLESS YOU WANT TO REALLY MESS UP YOUR REPO!**

A narrow and opinionated way to use git that works for me :)

It relies heavily on checking out detached HEADS, doing hard resets, being super opinionated about the merging strategy,
and other things that are fringe enough to not be applicable to most workflows but are common enough to be applicable to a large amount of workflows (at least I hope).

## `gish switch <branch-name>`

Checks out the current version of `<branch-name>` from `origin`.
If branch does not exist in `origin`, it creates it off `origin/master`.
Blows out any local copy of that branch that may already exist.

TODO: Check if local copy of branch is ahead of `origin`.
If so, switch to the local copy and inform the user.
If not, keep existing logic (which effectively fast-forwards the local copy if it's behind).

## `gish commit <message>`

Commits all changes with the given message

TODO: Auto-prefix the message with the current ticket number (if applicable)
TODO: Auto-divine the message if none is provided
TODO: Auto-push: add auto rebase or merge if possible and interactive feedback if not
