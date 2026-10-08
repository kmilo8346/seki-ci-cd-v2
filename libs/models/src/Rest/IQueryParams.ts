export interface IQueryParams<F extends object = object> {
  limit: number;
  offset: number;
  search?: string;
  filters?: F;
  sort?: Record<string, 'asc' | 'desc'>;
}
