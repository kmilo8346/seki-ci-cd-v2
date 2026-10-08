export type TContext = string;

export interface IGitInformation {
  organization: string;
  product: string;
  commit: string;
  commit_message: string;
  stage: 'production' | 'staging';
  event: 'git.tag' | 'git.commit';
  ref: string;
  pipeline: {
    context: TContext;
    version: number;
  };
}
