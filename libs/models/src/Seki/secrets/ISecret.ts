export interface IHeader {
  user: string;
  hash: string;
  version: number;
  content_type: string;
  created_at: string;
  updated_at: string;
}

export default interface ISecret {
  header: IHeader;
  body: Record<string, unknown>;
}

export interface IFileSecret {
  name: string;
  engine?: string
}
