const fs = require('fs');

const Git = require('simple-git'); // TODO: Switch to promises
const yargs = require('yargs');

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
        repository(owner: "steveshaffer", name: "gish") {
          id
        }
      }`;
      callGitHubApi({query}).then(resp => {
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
        callGitHubApi({query})
      })
      ;
    });
  })
  .help()
  .argv;

function callGitHubApi({query, variables}) {
  // TODO: Handle DNE
  const githubAccessToken = fs.readFileSync('.github/credentials').trim();
  fetch('https://api.github.com/graphql', {
    method: 'post',
    headers: {
      Authorization: `bearer ${githubAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({query, variables})
  }).then(res => res.json()).then(parsedRes => {
    return parsedRes.errors
      ? Promise.reject(parsedRes.errors)
      : parsedRes.data;
  });
}
