export default {
  /**
   * Name of the artifact
   */
  ARTIFACT_NAME: 'Pipelinr',

  /**
   * Required seki topic in the repository information to mark as a
   * valid Seki Product
   */
  REQUIRED_SEKI_TOPIC: 'seki-product',

  /**
   * Required seki flow topic in the repository information
   * to identify the flow to execute
   */
  REQUIRED_SEKI_FLOW_TOPIC: 'seki-flow-v2',

  /**
   * Topic to identify local mode enabled in product
   */
  LOCAL_MODE_TOPIC: 'seki-mode-local',

  /**
   * Reference text that we always need to replace in order to extract
   * the branch (main on another) or if is a git tag the id of the tag
   */
  REF_TAG_REPLACER: 'refs/tags/',

  /**
   * Path for the github organization list
   */
  GITHUB_ORGANIZATION_PATH: './config/github_organizations.json',
};
