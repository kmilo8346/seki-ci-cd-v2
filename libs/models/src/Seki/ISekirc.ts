export interface IStage {
  version: number;
  replicas: number;
  resources?: {
    cpu: number;
    memory: number;
    storage: number;
  };
  limits?: {
    cpu: number;
    memory: number;
    storage: number;
  };
  delete?: boolean;
  deployment_version?: string;
  update_mode?: "Off" | "Initial" | "Recreate" | "Auto"
}

export interface ITarget {
  skip?: boolean;
  alias?: string;
  description?: string;
  kind: string;
  stages?: {
    staging: IStage;
    production?: IStage;
  };
  vulnerabilities?: {
    ignores: string[];
  };
}

export interface ISekirc {
  $schema: string;
  display_name: string;
  name: string;
  description: string;
  notifications: {
    email: string;
  };
  targets: { [key: string]: ITarget };
}
