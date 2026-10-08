export default interface IResource {
  product: string;
  name: string;
  identifier: string;
  kind: string;
  hash?: string;
  state: 'CREATED' | 'UPDATED';
  type: 'PROJECT' | 'CLOUD_COMPONENT';
  created: {
    date: string;
    by: string;
  },
  updated: {
    date: string;
    by: string;
  }
}