import { IWorkspace } from "../../Seki/workspaces";

export interface ICommit {
  id: string; 
  createdAt: string;
  committer: {
    username?: string;
    name?: string;
    email: string;
  };
}

export default interface ISchema {
  product: string;
  commit: ICommit;
  data: IWorkspace
}
