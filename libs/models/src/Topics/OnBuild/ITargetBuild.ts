import { ITargetMetadata } from "./ITargetMetadata"

export interface ITargetBuild {
  kind: string
  sha1: string
  name: string
  build_command: string
  output_path: string
  buildable: boolean;
  publishable: boolean;
  tags: string[];
  metadata: ITargetMetadata
}