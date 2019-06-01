const git = require('../git');
const github = require('../github');

exports.command = 'pr <title>';
exports.desc =
  'Create a GitHub pull request from the current branch to master.';
exports.builder = yargs => {
  yargs.positional('title', {
    type: 'string',
    describe: 'the pull request title',
    default: "Hey look it's a PR!",
  });
};
exports.handler = async argv => {
  const title = argv.title;
  console.log('creating PR');
  const currentBranch = await git.getCurrentBranchName();
  // TODO: commit & push if necessary
  const repoInfo = await git.getCurrentRepoGithubInfo();
  const repositoryId = await github.getRepositoryId({
    owner: repoInfo.owner,
    name: repoInfo.name,
  });
  const pullRequest = await github.createPullRequest({
    repositoryId,
    headBranch: currentBranch,
    title,
  });
  console.log(pullRequest.url);
};
