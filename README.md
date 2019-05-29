# gish

A narrow and opinionated way to use git that works for me :)

It relies heavily on checking out revisions

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
TODO: Auto-push? with auto rebase or merge if possible and interactive feedback if not
