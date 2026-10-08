
import { ICloudComponentBuild } from "./ICloudComponentBuild";
import { ITargetBuild } from "./ITargetBuild";

export type IMetadata = {
  type: "infrastructure",
  data: ICloudComponentBuild,
} |
{
  type: "target",
  region: "us-east1",
  data: ITargetBuild,
}