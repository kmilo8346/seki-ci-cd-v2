/* eslint-disable @typescript-eslint/no-empty-interface */
import { Runners } from '@seki-ci/models';
import { spawn, SpawnOptionsWithoutStdio } from 'child_process';
import { isArray, merge } from 'lodash';

const DEFAULT_SHELL = "/bin/sh";

export interface IRunnerConfiguration {
}

export interface ICommandOptions extends SpawnOptionsWithoutStdio {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export class ShellRunner implements Runners.IShellRunner {
  config: IRunnerConfiguration;

  constructor(config?: IRunnerConfiguration) {
    this.config = config || {};
  }

  execute(command: string | string[], options?: ICommandOptions): Promise<Runners.IResult> {
    return new Promise((resolve) => {
      command = isArray(command) ? command : [command];

      const cmdOptions = merge({
        shell: DEFAULT_SHELL,
      } as SpawnOptionsWithoutStdio, options || {});

      const rawCommand = command.join(" && ");
      const child = spawn(rawCommand, cmdOptions);

      const chunks: string[] = [];
      const errorChunks: string[] = [];
      child.stdout.on('data', b => chunks.push(b.toString()));
      child.stderr.on('data', b => errorChunks.push(b.toString()));

      child.on('close', function (code) {
        const stdout = chunks.join('')
        const stderr = errorChunks.join('')

        if (code === 0) {
          resolve({
            success: true,
            data: stdout,
            stdout: stdout,
            stderr: stderr
          })
        } else {
          resolve({
            success: false,
            error: new Error(stderr),
            stdout: stdout,
            stderr: stderr
          })
        }
      });

    })
  }
};
