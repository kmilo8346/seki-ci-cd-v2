import { Abstractions } from '@seki-ci/core';
import { Github } from '@seki-ci/models';
import secrets from '../config/secrets';
import constants from '../constants';
import { readFileSync } from 'fs';

// resolve github orgs from config
const githubOrgs = (() => {
  const raw = readFileSync(constants.GITHUB_ORGANIZATION_PATH, 'utf8').toString();
  return JSON.parse(raw) as Github.TOrganizations;
})();

export default new Abstractions.GithubApi({
  baseURL: secrets.GITHUB_API_URL,
  timeout: secrets.GITHUB_API_TIMEOUT,
  orgs: githubOrgs
});