export default interface ISchema {
  environment: string;
  organization: string;
  project: string;
  region: string;
  product: string;
  commit: string;
  name: string;
  kind: string;
  sha1: string;
  image: string;
  buildable: boolean;
  publishable: boolean;
  test_command: string;
  skip_test: boolean;
  subevent: string;
}