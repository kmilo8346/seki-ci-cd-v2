export interface IHeader {
  id: string;
  version: string;
  source: string;
  /**
  * Topic name (for deadletter)
  */
  topic: string;
  created_at: string;
  content_type: 'text/html' | 'application/json' | 'application/xml' | 'application/unknown';
  [key: string]: string | number | boolean;
}


export default interface IBaseMessage {
  headers: IHeader;
  body: object | string;
}