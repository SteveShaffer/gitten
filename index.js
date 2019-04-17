const Git = require('simple-git');
const yargs = require('yargs');

// noinspection BadExpressionStatementJS
yargs
  .scriptName('gish')
  .usage('$0 <cmd> [args]')
  .command('switch [branch]', 'switch to a branch', (yargs) => {
    yargs.positional('branch', {
      type: 'string',
      describe: 'the branch name (in origin) that you want to switch to (i.e. checkout)'
    })
  }, function (argv) {
    const branchName = argv.branch;
    // TODO: Make config for assuming things like feature/XXX-#### and just having to specify #### to get the branch going
    console.log('switching to', branchName);
    const git = Git();
    // TODO: Switch to promises
    git.fetch(() => {
      console.log('fetched');
      // TODO: Make sure there's no local changes (or stash/unstash super cleverly)
      // TODO: Make sure local branch doesn't have new changes (probably prompt the user whether they want to nuke, keep, or push local changes)

      git.deleteLocalBranch(branchName, () => {
        console.log('deleted local copy');
        // TODO: Check remove branch exists
        git.checkout(['-b', branchName, 'origin/master'], () => {
          console.log('checked out from origin');
        })
      });
    });
  })
  .help()
  .argv;
