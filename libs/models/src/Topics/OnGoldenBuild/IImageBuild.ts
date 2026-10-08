export default interface IImageBuild {
    name: string;
    kind: string;
    sha1: string;
    image: string;
    region: string;
    project: string;
  }