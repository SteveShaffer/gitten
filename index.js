const fs = require('fs');

const Git = require('simple-git/promise');
const request = require('request-promise');
const yargs = require('yargs');

// TODO: Make these configurable from a config file (or actually I think you can figure it out from the credentials)
const GITHUB_USERNAME = 'steveshaffer';

// noinspection BadExpressionStatementJS
yargs
  .scriptName('gish')
  .usage('$0 <cmd> [args]')
  .command('switch [branch]', 'switch to a branch', (yargs) => {
    yargs.positional('branch', {
      type: 'string',
      describe: 'the branch name (in origin) that you want to switch to (i.e. checkout)'
    })
  }, async argv => {
    const branchName = argv.branch;
    // TODO: Make config for assuming things like feature/XXX-#### and just having to specify #### to get the branch going
    console.log('switching to', branchName);
    const git = Git(); // TODO: Consolidate this init stuff
    // TODO: Make sure there's no local changes (or stash/unstash super cleverly)
    // TODO: Make sure local branch doesn't have new changes (probably prompt the user whether they want to nuke, keep, or push local changes)
    await git.fetch();
    await detachHead();
    try {
      await git.deleteLocalBranch(branchName);
      console.log('deleted local copy');
    } catch(e) {
      // TODO: Check for expected error type
      // TODO: There is still an error message written to console even if we swallow
      console.log('no local copy to delete');
    }
    let branchSummary = await git.branch({'-r': null});
    const remoteBranchName = `origin/${branchName}`;
    if (branchSummary.branches[remoteBranchName]) {
      console.log(`checking out branch from ${remoteBranchName}`);
      await git.checkout(['-b', branchName, remoteBranchName]);
    } else {
      console.log('checking out branch from origin/master');
      await git.checkout(['-b', branchName, '--no-track', 'origin/master']);
    }

    /**
     * Go into detached HEAD mode so we can do whatever we want with branches
     * @return {Promise<void | never>}
     * @todo Convert this into a shared function and use all over the place (along with fetch)
     */
    async function detachHead() {
      console.log('Entering detached HEAD mode');
      let commitHash = await git.revparse(['HEAD']);
      await git.checkout(commitHash.trim());
    }
  })
  .command('commit [message]', 'commit current changes', (yargs) => {
    yargs.positional('message', {
      type: 'string',
      describe: 'the commit message'
    })
  }, async argv => {
    const message = argv.message;
    console.log('committing and pushing');
    const git = Git(); // TODO: Consolidate this init stuff
    // TODO: Validate this is a branch and not detached HEAD and stuff
    const currentBranch = await getCurrentBranchName();

    // TODO: Can combine add and commit into just git.commit(message, '.', ...?
    await git.add('.');
    await git.commit(message);
    await git.push('origin', currentBranch, {'-u': null});
    console.log('done');
  })
  .command('pr [title]', 'create a GitHub pull request from the current branch to master', yargs => {
    yargs.positional('title', {
      type: 'string',
      describe: 'the pull request title'
    })
  }, async argv => {
    const title = argv.title;
    console.log('creating PR');
    const currentBranch = await getCurrentBranchName();
    // TODO: commit & push if necessary
    const repoInfo = await getCurrentRepoGithubInfo();
    const repositoryId = await getRepositoryId({owner: repoInfo.owner, name: repoInfo.name});
    const pullRequest = await createPullRequest({repositoryId, headBranch: currentBranch, title});
    console.log(pullRequest.url);
  })
  .command('merge [number]', 'squash and merge a GitHub pull request', yargs => {
    yargs.positional('number', {
      type: 'string',
      describe: 'the pull request number'
    })
  }, async argv => {
    const pullRequestNumber = argv.number;
    console.log('merging the PR');
    const repoInfo = await getCurrentRepoGithubInfo();
    await callGithubRest({ // Have to use GitHub REST API for now because GraphQL doesn't support squash-and-merge
      method: 'put',
      uri: `repos/${repoInfo.owner}/${repoInfo.name}/pulls/${pullRequestNumber}/merge`,
      data: {
        merge_method: 'squash'
      }
    });
    console.log('merged');
    // TODO: Delete the branch after merge (and maybe delete local branch too, and maybe switch to or detached head on master?)
  })
  .help()
  .argv;

/**
 * Wrapper for the GitHub GraphQL API
 * @param query {string} The GraphQL query/mutation
 * @param variables {object} The GraphQL variables
 * @return {PromiseLike<never> | Promise<never>} Response data
 */
async function callGithubGraphql({query, variables}) {
  const resp = await callGithubBase({
    method: 'post',
    uri: 'https://api.github.com/graphql',
    data: {query, variables},
    bearerAuth: true
  });
  if (resp.errors) {
    throw new Error(`Error calling GitHub GraphQL API. ${JSON.stringify(resp.errors)}`);
  }
  return resp.data;
}

/**
 * Wrapper for the GitHub REST API
 * @param method {string} HTTP method
 * @param uri {string} The relative URI (to the API base)
 * @param data {object} Data to put in the request body
 * @return {*|PromiseLike<T|never>|Promise<T|never>} Response data
 */
async function callGithubRest({method, uri, data}) {
  return await callGithubBase({
    method,
    uri: `https://api.github.com/${uri}`,
    data
  });
}

/**
 * Base GitHub API caller
 * @param method {string} HTTP method
 * @param uri {string} The full URI to call
 * @param data {object} Data to put in the request body
 * @param bearerAuth {boolean=false} Use bearer auth. Otherwise use Basic auth
 * @return {*|PromiseLike<T | never>|Promise<T | never>} Response data
 */
async function callGithubBase({method, uri, data, bearerAuth = false}) {
  const githubAccessToken = getGitHubAccessToken();
  let res = await request({
    uri,
    method,
    headers: {
      Authorization: bearerAuth ? `bearer ${githubAccessToken}` : `Basic ${new Buffer(`${GITHUB_USERNAME}:${githubAccessToken}`).toString('base64')}`,
      'Content-Type': 'application/json',
      'User-Agent': 'gish'
    },
    body: JSON.stringify(data)
  });
  return JSON.parse(res);
}

/**
 * Creates a PR on GitHub
 * @param repositoryId
 * @param headBranch
 * @param title
 * @return {*|PromiseLike<T | never>|Promise<T | never>} The number of the created PR
 */
async function createPullRequest({repositoryId, headBranch, title}) {
  // TODO: Use variables
  let resp = await callGithubGraphql({
    query: `mutation {
      createPullRequest(input: {
        repositoryId: "${repositoryId}"
        baseRefName: "master"
        headRefName: "${headBranch}"
        title: "${title}"
      }) {
        pullRequest {
          number
          url
        }
      }
    }`
  });
  return resp.createPullRequest.pullRequest;
}

/**
 * Returns the current branch name checked out on disk
 * @return {Promise<string>} Current branch name
 */
async function getCurrentBranchName() {
  // TODO: Consolidate git init stuff
  // TODO: Handle errors
  // TODO: Validate this is a branch and not detached HEAD and stuff
  let status = await Git().status();
  return status.current;
}

/**
 * Gets GitHub info for the current repo
 * @return {Promise<{owner: string, name: string, url: string} | never>}
 */
async function getCurrentRepoGithubInfo() {
  const git = Git(); // TODO: Consolidate this init stuff
  let remotes = await git.getRemotes(true);
  const url = remotes.find(remote => remote.name === 'origin').refs.fetch;
  const matches = url.match(/^https:\/\/github\.com\/(.*)\/(.*)$/);
  if (matches.length !== 3) {
    throw new Error('Invalid GitHub URL found for remote origin');
  }
  const owner = matches[1];
  let name = matches[2];
  const GIT_SUFFIX = '.git';
  if (name.endsWith(GIT_SUFFIX)) {
    name = name.slice(0, name.length - GIT_SUFFIX.length);
  }
  return {
    owner,
    name,
    url
  };
}

/**
 * Gets the user's github access token from the config file on disk
 * @return {string} The access token
 */
function getGitHubAccessToken() {
  // TODO: Handle DNE
  // TODO: Traverse the directory hierarchy looking for the first folder that contains this
  return fs.readFileSync('.github/credentials').toString().trim();
}

/**
 * Get repository ID from owner and name
 * @param owner
 * @param name
 * @return {*|PromiseLike<T | never>|Promise<T | never>} The repository ID
 */
async function getRepositoryId({owner, name}) {
  // TODO: Use variables
  let resp = await callGithubGraphql({
    query: `query {
      repository(owner: "${owner}", name: "${name}") {
        id
      }
    }`
  });
  return resp.repository.id;
}
