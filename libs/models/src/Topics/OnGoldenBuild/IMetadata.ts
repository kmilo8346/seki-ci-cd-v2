export type IMetadata = {
  needed: true,
  data: {
    region: string,
    kind: "golden"
    sha1: string
    image: string
    registry: string
    project:string
  }
} | {
  needed: false,
  data: undefined
}