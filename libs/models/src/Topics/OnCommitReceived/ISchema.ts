import * as Webhooks from '../../Github/Webhooks';
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export default interface ISchema {
  github: Webhooks.TPushEvent,
  stage: {
    id: string,
    name: "production"|"staging"
  }
}