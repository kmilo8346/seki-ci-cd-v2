import ISchema from './ISchema';
import IBaseMessage from '../IBaseImage';
export default interface IMessage extends IBaseMessage {
  body: ISchema
}