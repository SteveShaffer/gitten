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
  }, function (argv) {
    const branchName = argv.branch;
    // TODO: Make config for assuming things like feature/XXX-#### and just having to specify #### to get the branch going
    console.log('switching to', branchName);
    const git = Git(); // TODO: Consolidate this init stuff
    // TODO: Make sure there's no local changes (or stash/unstash super cleverly)
    // TODO: Make sure local branch doesn't have new changes (probably prompt the user whether they want to nuke, keep, or push local changes)
    git.fetch()
      .then(detachHead)
      .then(() => git.deleteLocalBranch(branchName)
        .then(() => console.log('deleted local copy'))
        .catch(() => {  // TODO: There is an error message written to console
          // Swallowing errors because we're fine if there is no local branch to delete
          // and simple-git doesn't support .finally
          // TODO: Do I need to return a resolve or is returning not-a-rejection enough to resolve?
          return Promise.resolve();
        })
      )
      .then(checkoutFromRemote);

    /**
     * Checkout branch from remote if it exists or check it out from origin/master if it doesn't
     * @return {Promise<simplegit.BranchSummary | never>}
     */
    function checkoutFromRemote() {
      return git.branch({'-r': null}).then(branchSummary => {
        const remoteBranchName = `origin/${branchName}`;
        if (branchSummary.branches[remoteBranchName]) {
          console.log('branch exists on origin');
          return git.checkout(['-b', branchName, remoteBranchName]).then(() => {
            console.log(`checked out branch from ${remoteBranchName}`);
          });
        } else {
          console.log('branch does not exist on origin. cutting from master');
          return git.checkout(['-b', branchName, '--no-track', 'origin/master']).then(() => {
            console.log('checked out branch from origin/master');
          });
        }
      });
    }

    /**
     * Go into detached HEAD mode so we can do whatever we want with branches
     * @return {Promise<void | never>}
     */
    function detachHead() {
      console.log('Entering detached HEAD mode');
      return git.revparse(['HEAD'])
        .then(commitHash => git.checkout(commitHash.trim()));
    }
  })
  .command('commit [message]', 'commit current changes', (yargs) => {
    yargs.positional('message', {
      type: 'string',
      describe: 'the commit message'
    })
  }, function (argv) {
    const message = argv.message;
    console.log('committing and pushing');
    const git = Git(); // TODO: Consolidate this init stuff
    // TODO: Handle errors
    // TODO: Validate this is a branch and not detached HEAD and stuff
    getCurrentBranchName()
      .then(currentBranch => (
        // TODO: Can combine add and commit into just git.commit(message, '.', ...?
        git.add('.')
          .then(() => git.commit(message))
          .then(() => git.push('origin', currentBranch, {'-u': null}))
          .then(() => console.log('done'))
      ));
  })
  .command('pr [title]', 'create a GitHub pull request from the current branch to master', yargs => {
    yargs.positional('title', {
      type: 'string',
      describe: 'the pull request title'
    })
  }, argv => {
    const title = argv.title;
    console.log('creating PR');
    getCurrentBranchName().then(currentBranch => {
      // TODO: commit & push if necessary
      getCurrentRepoGithubInfo().then(repoInfo => {
        // TODO: Handle errors
        getRepositoryId({owner: repoInfo.owner, name: repoInfo.name})
          .then(repositoryId => createPullRequest({repositoryId, headBranch: currentBranch, title}))
          .then(pullRequest => console.log(pullRequest.url))
          .catch(err => console.error(err));
      });
    });
  })
  .command('merge [number]', 'squash and merge a GitHub pull request', yargs => {
    yargs.positional('number', {
      type: 'string',
      describe: 'the pull request number'
    })
  }, argv => {
    const pullRequestNumber = argv.number;
    console.log('merging the PR');
    getCurrentRepoGithubInfo()
      .then(repoInfo => callGithubRest({ // Have to use GitHub REST API for now because GraphQL doesn't support squash-and-merge
        method: 'put',
        uri: `repos/${repoInfo.owner}/${repoInfo.name}/pulls/${pullRequestNumber}/merge`,
        data: {
          merge_method: 'squash'
        }
      }))
      .then(() => console.log('merged'));
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
function callGithubGraphql({query, variables}) {
  return callGithubBase({
    method: 'post',
    uri: 'https://api.github.com/graphql',
    data: {query, variables},
    bearerAuth: true
  }).then(resp => {
    return resp.errors
      ? Promise.reject(resp.errors)
      : resp.data;
  });
}

/**
 * Wrapper for the GitHub REST API
 * @param method {string} HTTP method
 * @param uri {string} The relative URI (to the API base)
 * @param data {object} Data to put in the request body
 * @return {*|PromiseLike<T|never>|Promise<T|never>} Response data
 */
function callGithubRest({method, uri, data}) {
  return callGithubBase({
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
function callGithubBase({method, uri, data, bearerAuth = false}) {
  const githubAccessToken = getGitHubAccessToken();
  return request({
    uri,
    method,
    headers: {
      Authorization: bearerAuth ? `bearer ${githubAccessToken}` : `Basic ${new Buffer(`${GITHUB_USERNAME}:${githubAccessToken}`).toString('base64')}`,
      'Content-Type': 'application/json',
      'User-Agent': 'gish'
    },
    body: JSON.stringify(data)
  }).then(res => {
    // TODO: Reject on error status codes
    let parsedRes;
    try {
      parsedRes = JSON.parse(res);
    } catch (e) {
      return Promise.reject('Error parsing API JSON response');
    }
    return parsedRes;
  });
}

/**
 * Creates a PR on GitHub
 * @param repositoryId
 * @param headBranch
 * @param title
 * @return {*|PromiseLike<T | never>|Promise<T | never>} The number of the created PR
 */
function createPullRequest({repositoryId, headBranch, title}) {
  // TODO: Use variables
  return callGithubGraphql({
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
  }).then(resp => resp.createPullRequest.pullRequest);
}

/**
 * Returns the current branch name checked out on disk
 * @return {Promise<string | never>} Current branch name
 */
function getCurrentBranchName() {
  const git = Git(); // TODO: Consolidate this init stuff
  // TODO: Handle errors
  // TODO: Validate this is a branch and not detached HEAD and stuff
  return git.status().then(status => status.current);
}

/**
 * Gets GitHub info for the current repo
 * @return {Promise<{owner: string, name: string, url: string} | never>}
 */
function getCurrentRepoGithubInfo() {
  const git = Git(); // TODO: Consolidate this init stuff
  return git.getRemotes(true).then(remotes => {
    const url = remotes.find(remote => remote.name === 'origin').refs.fetch; // NOTE: Doesn't support differentiating fetch vs. push URLs
    const matches = url.match(/^https:\/\/github\.com\/(.*)\/(.*)$/); // NOTE: Assumes https
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
  });
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
function getRepositoryId({owner, name}) {
  // TODO: Use variables
  return callGithubGraphql({
    query: `query {
      repository(owner: "${owner}", name: "${name}") {
        id
      }
    }`
  }).then(resp => resp.repository.id);
}
