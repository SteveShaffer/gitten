const git = require('../git');

exports.command = 'save [message]';
exports.desc = 'Save changes locally and to the server';
exports.builder = yargs => {
  yargs.positional('message', {
    type: 'string',
    describe: 'the commit message',
    default: '.', // TODO: Have a better default commit message
  });
};
exports.handler = async argv => {
  git.fetch();
  // TODO: Make sure origin is not ahead of local.  If it is, attempt to merge.
  //  If that fails go into "oh no! looks like you and ____ edited the same stuff. Probably talk to them" mode
  //  and lead them through resolving conflicts.
  // TODO: If current commit is HEAD of master, then require a commit message (or I guess use the default).
  //  If it's ahead of HEAD of master, then when we squash rebase, use the existing commit message if none was passed
  await git.commitAllChanges(argv.message);
  // TODO: Merge origin/master in and ensure no conflicts
  await git.squashRebaseCurrentBranchAgainstOriginMaster(argv.message);
  await git.pushCurrentBranchToOrigin(true);
};
