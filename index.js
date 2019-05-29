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
    const git = Git(); // TODO: Is this ok for other directories and stuff?
    git.fetch().then(() => {

      // Go into detached HEAD
      // TODO: Extract into helper function and use all over the place
      console.log('Entering detached HEAD mode');
      git.revparse(['HEAD'])
        .then(commitHash => git.checkout(commitHash.trim()))
        .then(createLocalBranch);

      // TODO: Make sure there's no local changes (or stash/unstash super cleverly)
      // TODO: Make sure local branch doesn't have new changes (probably prompt the user whether they want to nuke, keep, or push local changes)

      function createLocalBranch() {
        return git.deleteLocalBranch(branchName)
          .then(checkoutFromRemote)
          .catch(checkoutFromRemote);

        function checkoutFromRemote() {
          console.log('deleted local copy');
          // TODO: Check remote branch exists
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
      }
    });
  })
  .command('commit [message]', 'commit current changes', (yargs) => {
    yargs.positional('message', {
      type: 'string',
      describe: 'the commit message'
    })
  }, function (argv) {
    const message = argv.message;
    console.log('committing');
    const git = Git(); // TODO: Is this ok for other directories and stuff?
    git.status().then(status => {
      // TODO: Handle errors
      const currentBranch = status.current; // TODO: Validate this is a branch and not detached HEAD and stuff
      git.add('.').then(() => { // TODO: Can combine into just git.commit(message, '.', ...?
        git.commit(message).then(() => {
          console.log('pushing');
          git.push('origin', currentBranch, {'-u': null}).then(() => {
            console.log('done');
          });
        });
      });
    })
  })
  .command('pr [title]', 'create a GitHub pull request from the current branch to master', yargs => {
    yargs.positional('title', {
      type: 'string',
      describe: 'the pull request title'
    })
  }, argv => {
    const title = argv.title;
    console.log('creating PR');
    const git = Git(); // TODO: Is this ok for other directories and stuff?
    git.status().then(status => {
      // TODO: Handle errors
      const currentBranch = status.current; // TODO: Validate this is a branch and not detached HEAD and stuff
      // TODO: commit & push if necessary
      // TODO: Use variables
      getCurrentRepoGithubInfo().then(repoInfo => {
        // TODO: Handle errors
        const query = `query {
          repository(owner: "${repoInfo.owner}", name: "${repoInfo.name}") {
            id
          }
        }`;
        callGithubGraphql({query})
          .then(resp => {
            // TODO: Use variables
            const query = `mutation {
              createPullRequest(input: {
                repositoryId: "${resp.repository.id}"
                baseRefName: "master"
                headRefName: "${currentBranch}"
                title: "${title}"
              }) {
                pullRequest {
                  id
                }
              }
            }`;
            callGithubGraphql({query});
            // TODO: Log the PR number, ideally with a link to view it
          })
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
    getCurrentRepoGithubInfo().then(repoInfo => {
      callGithubRest({ // Have to use GitHub REST API for now because GraphQL doesn't support squash-and-merge
        method: 'put',
        uri: `repos/${repoInfo.owner}/${repoInfo.name}/pulls/${pullRequestNumber}/merge`,
        data: {
          merge_method: 'squash'
        }
      }).then(() => {
        console.log('merged');
        // TODO: Delete the branch after merge (and maybe delete local branch too, and maybe switch to or detached head on master?)
      });
    });
  })
  .help()
  .argv;

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

function callGithubRest({method, uri, data}) {
  return callGithubBase({
    method,
    uri: `https://api.github.com/${uri}`,
    data
  });
}

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

function getCurrentRepoGithubInfo() {
  const git = Git(); // TODO: Is this ok for other directories and stuff?
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

function getGitHubAccessToken() {
  // TODO: Handle DNE
  // TODO: Traverse the directory hierarchy looking for the first folder that contains this
  return fs.readFileSync('.github/credentials').toString().trim();
}
