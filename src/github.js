const _ = require('lodash');
const request = require('request-promise');

const { getConfig } = require('./util');

// TODO: Unit test these
module.exports = {
  createPullRequest,
  getRepositoryId,
  mergePullRequest,
};

/**
 * Wrapper for the GitHub GraphQL API
 * @param query {string} The GraphQL query/mutation
 * @param variables {object} The GraphQL variables
 * @return {PromiseLike<never> | Promise<never>} Response data
 */
async function callGithubGraphql({ query, variables }) {
  const resp = await callGithubBase({
    method: 'post',
    uri: 'https://api.github.com/graphql',
    data: { query, variables },
    bearerAuth: true,
  });
  if (resp.errors) {
    throw new Error(
      `Error calling GitHub GraphQL API. ${JSON.stringify(resp.errors)}`,
    );
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
async function callGithubRest({ method, uri, data }) {
  return await callGithubBase({
    method,
    uri: `https://api.github.com/${uri}`,
    data,
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
async function callGithubBase({ method, uri, data, bearerAuth = false }) {
  const githubAccessToken = getGitHubAccessToken();
  let authorization = `bearer ${githubAccessToken}`;
  if (!bearerAuth) {
    const githubUsername = getGitHubUserName(githubAccessToken);
    authorization = `Basic ${new Buffer(
      `${githubUsername}:${githubAccessToken}`,
    ).toString('base64')}`;
  }
  let res = await request({
    uri,
    method,
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
      'User-Agent': 'gitten',
    },
    body: JSON.stringify(data),
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
async function createPullRequest({ repositoryId, headBranch, title }) {
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
    }`,
  });
  return resp.createPullRequest.pullRequest;
}

/**
 * Gets the user's github access token from the config file on disk
 * @return {string} The access token
 * @todo Find a way to detect when we've hit rock bottom and remove the recursion limit
 * @todo Probably don't actually error out
 */
function getGitHubAccessToken() {
  const accessToken = _.get(getConfig(), 'github.accessToken');
  if (!accessToken) {
    throw new Error('No GitHub access token found in any .gitten.json files.');
  }
  return accessToken;
}

/**
 * Get the username of the user who owns the given token
 * @param accessToken {string} The access token
 * @return {Promise<*>} The user name
 */
async function getGitHubUserName(accessToken) {
  const resp = await callGithubGraphql({
    query: `query { 
      viewer { 
        login
      }
    }`,
  });
  return resp.viewer.login;
}

/**
 * Get repository ID from owner and name
 * @param owner
 * @param name
 * @return {*|PromiseLike<T | never>|Promise<T | never>} The repository ID
 */
async function getRepositoryId({ owner, name }) {
  // TODO: Use variables
  let resp = await callGithubGraphql({
    query: `query {
      repository(owner: "${owner}", name: "${name}") {
        id
      }
    }`,
  });
  return resp.repository.id;
}

/**
 * Merges the pull request. Assumes squash and merge
 * @param repoOwner {string}
 * @param repoName {string}
 * @param pullRequestNumber {number}
 * @return {Promise<void>}
 */
async function mergePullRequest({ repoOwner, repoName, pullRequestNumber }) {
  await callGithubRest({
    // Have to use GitHub REST API for now because GraphQL doesn't support squash-and-merge
    method: 'put',
    uri: `repos/${repoOwner}/${repoName}/pulls/${pullRequestNumber}/merge`,
    data: {
      merge_method: 'squash',
    },
  });
}
