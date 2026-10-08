import IBaseMessage from '../IBaseImage';
import ISchema from './ISchema';
export default interface IMessage<T> extends IBaseMessage {
  body: ISchema<T>
}