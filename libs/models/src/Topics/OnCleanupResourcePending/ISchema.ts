export default interface ISchema {
  commit: string;
  product: string;
  environment: string;
  resource: 'cloud-component' | 'deployment';
  identifier: string;
}
