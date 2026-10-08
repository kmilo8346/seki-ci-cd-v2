
import IBaseMessage from '../IBaseImage';
import ISchema from './ISchema';
export default interface IMessage extends IBaseMessage {
  body: ISchema
}
