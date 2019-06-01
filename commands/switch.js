const git = require('../git');

exports.command = 'switch <branch>';
exports.desc = 'Switch to a branch.';
exports.builder = yargs => {
  yargs.positional('branch', {
    type: 'string',
    describe:
      'the branch name (in origin) that you want to switch to (i.e. checkout)',
    // TODO: Make optional with default to master?
  });
};
exports.handler = async argv => {
  const branchName = argv.branch;
  // TODO: Make config for assuming things like feature/XXX-#### and just having to specify #### to get the branch going
  console.log('switching to', branchName);
  // TODO: Make sure there's no local changes (or stash/unstash super cleverly)
  // TODO: Make sure local branch doesn't have new changes (probably prompt the user whether they want to nuke, keep, or push local changes)
  await git.fetch();
  await git.detachHead();
  await git.deleteLocalBranch(branchName);
  await git.checkoutBranchFromOrigin(branchName);
};
