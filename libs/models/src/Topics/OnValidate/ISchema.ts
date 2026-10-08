import { AvailableSubEvents } from "./AvailableSubEvents";


export default interface ISchema {
  environment: string;
  organization: string;
  product: string;
  commit: string;
  subevent: AvailableSubEvents;
}