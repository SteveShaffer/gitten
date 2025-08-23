
import * as git from '../git.js';
import * as github from '../github.js';

export const command = 'merge <number>';
export const desc = 'Squash and merge a GitHub pull request.';
export const builder = yargs => {
  yargs.positional('number', {
    type: 'string',
    describe: 'the pull request number',
  });
};
export const handler = async argv => {
  const pullRequestNumber = argv.number;
  console.log('merging the PR');
  const repoInfo = await git.getCurrentRepoGithubInfo();
  await github.mergePullRequest({
    repoOwner: repoInfo.owner,
    repoName: repoInfo.name,
    pullRequestNumber,
  });
  console.log('merged');
  // TODO: Delete the branch after merge (and maybe delete local branch too, and maybe switch to or detached head on master?)
};
