export interface IExportCreate<T> {
  id?: string;
  index: string;
  type: 'create';
  content: T;
}

export interface IExportUpdate<T> {
  id: string;
  index: string;
  type: 'update';
  content: Partial<T>;
}

type ISchema<T> = IExportCreate<T> | IExportUpdate<T>;

export default ISchema;
