import { IStage } from "../../Seki";
import { ITargetMetadata } from "../OnBuild";

export interface IClusterMetadata extends ITargetMetadata {
  stage?: IStage;
}