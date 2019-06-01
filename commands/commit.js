const git = require('../git');

exports.command = 'commit [message]';
exports.desc = 'Commit all current changes.';
exports.builder = yargs => {
  yargs.positional('message', {
    type: 'string',
    describe: 'the commit message',
    default: '.' // TODO: Have a better default commit message
  })
};
exports.handler = async argv => {
  const message = argv.message;
  console.log('committing and pushing');
  // TODO: Validate this is a branch and not detached HEAD and stuff
  await git.commitAllChanges(message);
  await git.pushCurrentBranchToOrigin();
  console.log('done');
};
