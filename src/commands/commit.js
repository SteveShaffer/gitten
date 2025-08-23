
import * as git from '../git.js';

export const command = 'commit [message]';
export const desc = 'Commit all current changes.';
export const builder = yargs => {
  yargs.positional('message', {
    type: 'string',
    describe: 'the commit message',
    default: '.', // TODO: Have a better default commit message
  });
};
export const handler = async argv => {
  const message = argv.message;
  console.log('committing and pushing');
  // TODO: Validate this is a branch and not detached HEAD and stuff
  await git.commitAllChanges(message);
  await git.pushCurrentBranchToOrigin();
  console.log('done');
};
