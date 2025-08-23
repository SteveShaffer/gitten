# Contributing to gitten

## Development Environment

1. Install [deno](https://deno.com)
2. `deno install`

## Testing

`yarn test` will run a happy-path script that tries out all the commands.
It assumes you have git properly configured on the machine.
There's no assertions or anything so it's possible for it to run without failure and still be executing incorrectly.
Right now it's just a safety net for me as I'm hacking away.

> TODOs
>
> - Use an actual testing framework and stuff