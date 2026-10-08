import { IGitInformation } from "../IGitInformation";
import { AvailableSubEvents } from "./AvailableSubEvents";
import IImageBuild from "./IImageBuild";



export default interface ISchema extends IImageBuild {
  kind: "golden";
  subevent: AvailableSubEvents;
  git: IGitInformation;
}