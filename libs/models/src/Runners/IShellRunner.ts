import { ICommandOptions } from "./ICommandOptions";

export type IResult = {
  success: true;
  data: string;
  stdout: string
  stderr: string
} |  {
  success: false;
  error: Error;
  stdout: string
  stderr: string
}

export interface IShellRunner {
  execute: (command: string | string[], options: ICommandOptions) => Promise<IResult>
}
