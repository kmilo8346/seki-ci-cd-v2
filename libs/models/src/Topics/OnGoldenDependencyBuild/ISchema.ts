import { IGitInformation } from "../IGitInformation";
import IImageBuild from "../OnGoldenBuild/IImageBuild";

export default interface ISchema extends IImageBuild {
  build_command: string
  output_path: string
  golden : {
    image: string
  };
  subevent: string;
  buildable: boolean;
  publishable: boolean;
  git: IGitInformation;
}