import IBaseMessage from "../IBaseImage";

export default interface ISchema {
  product: string;
  resource: 'cloud-component' | 'deployment';
  identifier: string;
  commit?: string;
  data: IBaseMessage;
}
