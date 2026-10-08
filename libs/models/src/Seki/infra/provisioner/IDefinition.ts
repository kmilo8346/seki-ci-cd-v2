
export interface IProvider {
  url: string
}

export default interface IDefinition {
  organization: string;
  product: string;
  commit: string;
  kind: string;
  identifier: string;
  outputs: {
    providers: {
      vault?: IProvider,
      secrets_manager: IProvider
    };
  };
}
