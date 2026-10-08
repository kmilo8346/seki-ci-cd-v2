
import { IGitInformation } from "../IGitInformation";
import { IMetadata } from "./IMetadata";

export default interface ISchema {
  subevent: string;
  git: IGitInformation;
  target: IMetadata
}