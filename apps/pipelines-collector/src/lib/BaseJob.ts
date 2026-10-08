export abstract class BaseJob {
  abstract start(): Promise<void>;
}
