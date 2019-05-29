const fs = require('fs');
const path = require('path');

const Git = require('simple-git'); // TODO: Switch to promises
const request = require('request-promise');
const yargs = require('yargs');

// TODO: Make these configurable from a config file
const REPO_OWNER = 'steveshaffer';
const REPO_NAME = 'gish';
const GITHUB_USERNAME = REPO_OWNER;

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
    git.fetch(() => {
      console.log('fetched');
      // TODO: Switch to detached head
      // TODO: Make sure there's no local changes (or stash/unstash super cleverly)
      // TODO: Make sure local branch doesn't have new changes (probably prompt the user whether they want to nuke, keep, or push local changes)

      git.deleteLocalBranch(branchName, () => {
        console.log('deleted local copy');
        // TODO: Check remote branch exists
        git.branch({'-r': null}, (err, branchSummary) => {
          const remoteBranchName = `origin/${branchName}`;
          if (branchSummary.branches[remoteBranchName]) {
            console.log('branch exists on origin');
            git.checkout(['-b', branchName, remoteBranchName], () => {
              console.log(`checked out branch from ${remoteBranchName}`);
            });
          } else {
            console.log('branch does not exist on origin. cutting from master');
            git.checkout(['-b', branchName, '--no-track', 'origin/master'], () => {
              console.log('checked out branch from origin/master');
            });
          }
        });
      });
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
    git.status((err, status) => {
      // TODO: Handle errors
      const currentBranch = status.current; // TODO: Validate this is a branch and not detached HEAD and stuff
      git.add('.', () => { // TODO: Can combine into just git.commit(message, '.', ...?
        git.commit(message, () => {
          console.log('pushing');
          git.push('origin', currentBranch, {'-u': null}, () => {
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
    git.status((err, status) => {
      // TODO: Handle errors
      const currentBranch = status.current; // TODO: Validate this is a branch and not detached HEAD and stuff
      // TODO: commit & push if necessary
      // TODO: Use variables
      // TODO: Pull repo owner and name from config
      const query = `query {
        repository(owner: "${REPO_OWNER}", name: "${REPO_NAME}") {
          id
        }
      }`;
      callGithubGraphql({query}).then(resp => {
        // TODO: Use variables
        const query = `mutation {
          createPullRequest(input: {
            repositoryId: "${resp.repository.id}="
            baseRefName: "master"
            headRefName: "${currentBranch}"
            title: "${title}"
          }) {
            pullRequest {
              id
            }
          }
        }`;
        callGithubGraphql({query})
      })
      ;
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
    callGithubRest({ // Have to use GitHub REST API for now because GraphQL doesn't support squash-and-merge
      method: 'put',
      path: `/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${pullRequestNumber}/merge`,
      data: {
        merge_method: 'squash'
      }
    }).then(() => {
      console.log('merged');
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

function callGithubRest({method, path, data}) {
  return callGithubBase({
    method,
    uri: path.join('https://api.github.com', path),
    data
  });
}

function callGithubBase({method, uri, data, bearerAuth = true}) {
  const githubAccessToken = getGitHubAccessToken();
  return request({
    uri,
    method,
    headers: {
      Authorization: bearerAuth ? `bearer ${githubAccessToken}` : `Basic ${new Buffer(`${REPO_OWNER}:${githubAccessToken}`).toString('base64')}`,
      'Content-Type': 'application/json',
      'User-Agent': 'gish'
    },
    body: JSON.stringify(data)
  }).then(res => {
    // TODO: Check for status code
    let parsedRes;
    try {
      parsedRes = JSON.parse(res);
    } catch (e) {
      return Promise.reject('Error parsing API JSON response');
    }
    return parsedRes;
  });
}

function getGitHubAccessToken() {
  // TODO: Handle DNE
  // TODO: Traverse the directory hierarchy looking for the first folder that contains this
  const githubAccessToken = fs.readFileSync('.github/credentials').toString().trim();
}
