import { IStage } from './../ISekirc';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface INonBuildableConfiguration { }

export interface IBuildableConfiguration {
  outputPath: string;
}

export type IConfigurationTypes =
  | { kind:string, buildable: false; publishable: boolean; skip: boolean; options: INonBuildableConfiguration }
  | { kind:string, buildable: true; publishable: boolean; skip: boolean; options: IBuildableConfiguration }


export interface IProject {
  name: string;
  path: string;
  hash: string;
  tags: string[];
  configuration: IConfigurationTypes;
  stages?: {
    staging: IStage;
    production?: IStage;
  };
}
