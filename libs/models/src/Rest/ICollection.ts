export interface ICollection<T>{
  offset: number
  limit: number
  total: number
  items: T[]
}