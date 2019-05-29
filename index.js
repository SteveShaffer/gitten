const Git = require('simple-git'); // TODO: Switch to promises
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
    const git = Git(); // TODO: Is this ok for other directories and stuff?
    git.fetch(() => {
      console.log('fetched');
      // TODO: Switch to detached head
      // TODO: Make sure there's no local changes (or stash/unstash super cleverly)
      // TODO: Make sure local branch doesn't have new changes (probably prompt the user whether they want to nuke, keep, or push local changes)

      git.deleteLocalBranch(branchName, () => {
        console.log('deleted local copy');
        // TODO: Check remote branch exists
        git.branch({'-r': null}, (err, branchSummary) => {
          const remoteBranchName = `origin/${branchName}`;
          if (branchSummary.branches[remoteBranchName]) {
            console.log('branch exists on origin');
            git.checkout(['-b', branchName, remoteBranchName], () => {
              console.log(`checked out branch from ${remoteBranchName}`);
            });
          } else {
            console.log('branch does not exist on origin. cutting from master');
            git.checkout(['-b', branchName, '--no-track', 'origin/master'], () => {
              console.log('checked out branch from origin/master');
            });
          }
        });
      });
    });
  })
  .command('commit [message]', 'commit current changes', (yargs) => {
    yargs.positional('message', {
      type: 'string',
      describe: 'the commit message'
    })
  }, function (argv) {
    const message = argv.message;
    const git = Git(); // TODO: Is this ok for other directories and stuff?
    console.log('committing');
    git.status((err, status) => {
      // TODO: Handle errors
      const currentBranch = status.current; // TODO: Validate this is a branch and not detached HEAD and stuff
      git.add('.', () => { // TODO: Can combine into just git.commit(message, '.', ...?
        git.commit(message, () => {
          git.push('origin', currentBranch, {'-u': null}, () => {
            console.log('done');
          });
        });
      });
    })
  })
  .help()
  .argv;
