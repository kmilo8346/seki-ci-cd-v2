import { IProject } from './IProject';
import { ICloudComponentRc } from './../cloud/ICloudComponentRc';
import { IFileSecret } from '../secrets';

export interface IWorkspace {
  name: string;
  base_path: string;
  hash: string;
  projects: IProject[];
  secrets: IFileSecret[];
  cloud: {
    components: ICloudComponentRc[]
  }
}
