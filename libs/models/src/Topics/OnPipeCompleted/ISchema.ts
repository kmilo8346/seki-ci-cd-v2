export default interface ISchema {
  state: 'SUCCESS' | 'FAILED';
  organization: string;
  product: string;
  commit: string;
  environment: string;
  commit_message: string;
}