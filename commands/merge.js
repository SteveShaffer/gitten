const git = require('../git');
const github = require('../github');

exports.command = 'merge <number>';
exports.desc = 'Squash and merge a GitHub pull request.';
exports.builder = yargs => {
  yargs.positional('number', {
    type: 'string',
    describe: 'the pull request number',
  });
};
exports.handler = async argv => {
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
