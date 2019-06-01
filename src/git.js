const Git = require('simple-git/promise');

// TODO: Unit test these
module.exports = {
  checkoutBranchFromOrigin,
  commitAllChanges,
  deleteLocalBranch,
  detachHead,
  fetch: () => Git().fetch,
  getCurrentBranchName,
  getCurrentRepoGithubInfo,
  pushCurrentBranchToOrigin,
};

/**
 * Checks out the given branch from origin
 * or creates a new branch off origin/master if it doesn't exist yet
 * @param branchName {string}
 * @return {Promise<void>}
 */
async function checkoutBranchFromOrigin(branchName) {
  const git = Git(); // TODO: Consolidate all this init stuff
  let branchSummary = await git.branch({ '-r': null });
  const remoteBranchName = `origin/${branchName}`;
  if (branchSummary.branches[remoteBranchName]) {
    console.log(`checking out branch from ${remoteBranchName}`);
    await git.checkout(['-b', branchName, remoteBranchName]);
  } else {
    console.log('checking out branch from origin/master');
    await git.checkout(['-b', branchName, '--no-track', 'origin/master']);
  }
}

/**
 * Commits all changes in the working directory
 * @param message {string}
 * @return {Promise<void>}
 */
async function commitAllChanges(message) {
  const git = Git();
  // TODO: Can combine add and commit into just git.commit(message, '.', ...?
  await git.add('.');
  await git.commit(message);
}

/**
 * Deletes a local branch if it exists
 * @param branchName {string}
 * @return {Promise<void>}
 */
async function deleteLocalBranch(branchName) {
  const git = Git();
  try {
    await git.deleteLocalBranch(branchName);
    console.log('deleted local copy');
  } catch (e) {
    // TODO: Check for expected error type
    // TODO: There is still an error message written to console even if we swallow
    console.log('no local copy to delete');
  }
}

/**
 * Go into detached HEAD mode so we can do whatever we want with branches
 * @return {Promise<void>}
 * @todo Convert this into a shared function and use all over the place (along with fetch)
 */
async function detachHead() {
  const git = Git();
  console.log('Entering detached HEAD mode');
  let commitHash = await git.revparse(['HEAD']);
  await git.checkout(commitHash.trim());
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
 * @return {Promise<{owner: string, name: string, url: string}>}
 */
async function getCurrentRepoGithubInfo() {
  const git = Git(); // TODO: Consolidate this init stuff
  // noinspection JSUnresolvedFunction
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
    url,
  };
}

/**
 * Pushes the current branch to origin
 * @return {Promise<void>}
 */
async function pushCurrentBranchToOrigin() {
  const git = Git();
  const currentBranch = await getCurrentBranchName();
  await git.push('origin', currentBranch, { '-u': null });
}
