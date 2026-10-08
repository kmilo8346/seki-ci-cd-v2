import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import * as colors from 'ansi-colors';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { Github } from '@seki-ci/models';
import { v4 as uuid } from 'uuid';

interface ICommit {
  message: string;
  author: {
    name: string;
    email: string;
  }
}

interface IWorkingTreeApi {
  /**
   * Add all files to working tree
   */
  addAll: () => Promise<void>;

  /**
   * Create a commit over working tree
   */
  commit: (content: ICommit) => Promise<void>;

  /**
   * Push to working tree
   */
  push: (options?: { force: boolean }) => Promise<void>;
}

export interface IConfiguration {
  orgs: Github.TOrganizations;
  baseURL: string;
  timeout: number;
}

export default class GithubApi {
  protected config: IConfiguration;
  protected request: AxiosInstance;

  constructor(config: IConfiguration) {
    this.config = config;
    this.request = axios.create({
      baseURL: this.config.baseURL.replace(/\/+$/, ""),
      timeout: this.config.timeout,
    });
  }

  /**
   * Create a Github Client with the context of the repository
   *
   * (This method does not execute any api call), only return an instance
   * to interact with the API
   *
   * @param organization github organization name
   * @param repoName github repo name
   * @param branch github branch, default main
   * @returns {WrapperRepo}
   */
  fromRepo(organization: string, repoName: string, branch = 'main'): WrapperRepo {
    return new WrapperRepo(organization, repoName, branch, this.config);
  }

  /**
   * Create api an easy interaction with working tree
   *
   * (This method does not execute any api call), only return an instance
   * to interact with the API
   *
   * @param path
   * @returns {IWorkingTreeApi}
   */
  fromWorkingTree(path: string): IWorkingTreeApi {
    return {
      addAll: async () => {
        await this.addAllFilesToWorkingTree(path);
      },
      commit: async (content: ICommit) => {
        await this.commitToWorkingTree(path, content);
      },
      push: async (options?: { force: boolean }) => {
        await this.pushToWorkingTree(path, options);
      }
    }
  }

  getOrgApiToken(organization:string):string | null {
    if((organization in this.config.orgs)) {
      return this.config.orgs[organization].token;
    }
    return null;
  }

  /**
   * Clone the latest version of the repo
   * @param organization
   * @param repoName
   * @returns {Promise<string>}
   */
  protected async cloneRepo(organization: string, repoName: string, branch: string): Promise<string> {
    const tmpPath = path.join(os.tmpdir(), uuid());
    const repositoryUrl = `https://foo:${this.getOrgApiToken(organization)}@github.com/${organization}/${repoName}`;

    try {
      await git.clone({
        fs,
        http,
        dir: tmpPath,
        url: repositoryUrl,
        singleBranch: true,
        depth: 1,
        ref: branch,
      });

      return tmpPath;
    } catch (error) {
      console.error(colors.red(`An error has ocurred when cloning git repository: ${repositoryUrl}`));
      console.debug({
        organization,
        repoName,
        error: (error as Error).message,
      });

      throw error;
    }
  }

  /**
   * Clone the repo url in commit and return temporally url were data was saved
   * @param commit commit in git
   * @returns {Promise<string>}
   */
  protected async cloneCommitFromRepo(
    organization: string,
    repoName: string,
    commit: string
  ): Promise<string> {
    const tmpPath = path.join(os.tmpdir(), uuid());
    const repositoryUrl = `https://foo:${this.getOrgApiToken(organization)}@github.com/${organization}/${repoName}`;

    try {
      await git.clone({
        fs,
        http,
        dir: tmpPath,
        url: repositoryUrl,
        ref: commit,
        singleBranch: true,
        depth: 1,
      });

      return tmpPath;
    } catch (error) {
      console.error(colors.red('An error has ocurred when cloning git repository'));
      console.debug({
        commit,
        error: (error as Error).message,
      });

      throw error;
    }
  }

  /**
   * Check if commit exist in repo
   * @param commit Commit long version
   * @returns {Promise<boolean>}
   */
  protected async existCommitInRepo(
    organization: string,
    repoName: string,
    commit: string
  ): Promise<boolean> {
    try {
      await this.request.get(`/repos/${organization}/${repoName}/commits/${commit}`, {
        headers: {
          'Authorization': `Bearer ${this.getOrgApiToken(organization)}`
        }
      });
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response && axiosError.response?.status === 422) {
          return false;
        }
      }

      console.error(colors.red('An error has ocurred trying to check existence of a commit'));
      console.debug({
        commit,
        error: (error as Error).message,
      });

      throw error;
    }
  }

  /**
   * Get github commit
   * @param commit Commit long version
   * @returns
   */
  protected async getCommitFromRepo(
    organization: string,
    repoName: string,
    commit: string
  ): Promise<Github.TCommit> {
    try {
      const response = await this.request.get(
        `repos/${organization}/${repoName}/commits/${commit}`,
        {
          headers: {
            'Authorization': `Bearer ${this.getOrgApiToken(organization)}`
          }
        }
      );
      return response.data as Github.TCommit;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response && axiosError.response?.status === 422) {
          console.error(colors.red('Repository commit does not exist'));
          console.debug({
            organization,
            repoName,
            commit,
            status: 'NOT_FOUND',
            error: error.message,
          });
          throw error;
        }
      }

      console.error(colors.red('An error has ocurred getting github commit info'));
      console.debug({
        commit,
        error: (error as Error).message,
      });

      throw error;
    }
  }

  /**
   * Add file to working tree staging area
   * @param repoPath repository path in local files
   * @returns {Promise<void>}
   */
  protected async addAllFilesToWorkingTree(repoPath: string): Promise<void> {
    try {
      const dir = repoPath;
      const status = await git.statusMatrix({ fs, dir });
      const promises: Promise<void>[] = [];
      for (let i = 0; i < status.length; i++) {
        const file = status[i];
        const [filepath, head, workDir, stage] = file;
        if (head === 1 && workDir === 1 && stage === 1) {
          continue;
        }

        if (workDir) {
          promises.push(git.add({ fs, dir, filepath }));
          continue;
        }

        promises.push(git.remove({ fs, dir, filepath }));
      }
      await Promise.all(promises);
    } catch (error) {
      console.error(colors.red('An error has ocurred when add all to working tree'));
      console.debug({
        repoPath,
        error: (error as Error).message,
      });

      throw error;
    }
  }

  /**
   * Create commit over the working tree
   * @param repoPath
   * @param commit
   * @returns {Promise<void>}
   */
  protected async commitToWorkingTree(repoPath: string, commit: ICommit): Promise<void> {
    try {
      await git.commit({
        fs,
        dir: repoPath,
        message: commit.message,
        author: {
          name: commit.author.name,
          email: commit.author.email,
        },
      });
    } catch (error) {
      console.error(colors.red('An error has ocurred when commit to working tree'));
      console.debug({
        repoPath,
        commit,
        error: (error as Error).message,
      });

      throw error;
    }
  }

  /**
   * Push to working tree
   * @param repoPath
   * @param options
   * @returns {Promise<void>}
   */
  protected async pushToWorkingTree(repoPath: string, options?: { force: boolean }): Promise<void> {
    try {
      await git.push({
        fs,
        http,
        dir: repoPath,
        ref: 'main',
        force: options?.force,
      });
    } catch (error) {
      console.error(colors.red('An error has ocurred when push to working tree'));
      console.debug({
        repoPath,
        error: (error as Error).message,
      });

      throw error;
    }
  }
}

export interface ICommitApi {
  /**
   * Check if commit exist
   */
  exists: () => Promise<boolean>;
  /**
   * Get commit info
   */
  get: () => Promise<Github.TCommit>;
  /**
   * Clone to specific commit
   */
  clone: () => Promise<string>;
}

class WrapperRepo extends GithubApi {
  private organization: string;
  private repoName: string;
  private branch: string;

  constructor(organization: string, repoName: string, branch: string, config: IConfiguration) {
    super(config);
    this.organization = organization;
    this.repoName = repoName;
    this.branch = branch;
  }

  /**
   * Clone the repo url in commit and return temporally url were data was saved
   * @returns {Promise<string>}
   */
  async clone(): Promise<string> {
    return await this.cloneRepo(this.organization, this.repoName, this.branch);
  }

  /**
   * Create a commit object
   *
   * (This method does not execute any api call), only return an instance
   * to interact with the API
   * @param commit
   * @returns {ICommitApi}
   */
  commit(commit: string): ICommitApi {
    return {
      exists: async () => {
        return await this.existCommitInRepo(this.organization, this.repoName, commit);
      },
      get: async () => {
        return await this.getCommitFromRepo(this.organization, this.repoName, commit);
      },
      clone: async () => {
        return await this.cloneCommitFromRepo(this.organization, this.repoName, commit);
      },
    };
  }
}
