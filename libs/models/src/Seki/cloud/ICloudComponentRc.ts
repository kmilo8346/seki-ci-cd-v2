/**
 *
 * This interface intends to get all the configuration need to for
 * creation a cloud component
 */
export interface ICloudComponentRc {

  /**
   * Cloud component identifier
   */
  identifier: string;

  /**
   * Cloud component type
   */
  kind: string;

  /**
   * Cloud component version
   */
  version: string;

  /**
   * Custom settings depends on the cloud component type ($$schema validation)
   */
  properties: {
    [key: string]: string | number | boolean | object;
  };

  /**
   * Cloud component output files
   */
  output: string

  /**
   * The product where the cloud component was created.
   * This is the only product allowed to edit it.
   */
  creator?: string

  /**
   * The URL to the Github repository where the terraform code resides.
   * If not provided, the curated repository is asumed: https://github.com/Cencosud-xlabs/x-provisioners
   */
  srcRepoUrl?: string
}
