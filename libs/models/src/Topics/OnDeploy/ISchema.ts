import { IFileSecret } from "../../Seki/secrets";
import { IGitInformation } from "../IGitInformation";
import { ITargetBuild } from "../OnBuild";
import { IClusterMetadata } from "./IClusterMetadata";

export default interface ISchema extends ITargetBuild {
  image: string;
  project: string;
  secrets: IFileSecret[];
  subevent: string;
  git: IGitInformation;
  metadata: IClusterMetadata;
}
