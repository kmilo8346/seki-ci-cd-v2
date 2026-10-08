export default {
  /**
  * Require Golden tag inside project.json
  */
  GOLDEN_REQUIRED_TAG: 'REQUIRED:GOLDEN',


  /**
   * Reference text that we always need to replace in order to extract
   * the branch (main on another) or if is a git tag the id of the tag
   */
  REF_TAG_REPLACER: 'refs/tags/',

  /**
  * Artifact name to use to identify the source in a dead letter queue
  *
  * (Also use in pubsub plugin to assign the consumer id)
  */
  ARTIFACT_NAME: "seki-ci-cd-v2.commit-to-tasks",

  /**
   * Message version for publishing message
   *
   * (You can use this variable to filter message version processing)
   *
   * More info: https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md
   */
  MESSAGE_VERSION: "v1.0.0",

  /**
   * Template:
   *  Event: CI_VALIDATION
   *  Subevent: VALIDATE:WORKSPACE
   *  status: ERROR
   */
  TEMPLATE_WORKSPACE_ERROR: 'templates/workspace_error.md',

  /**
   * Template:
   *  Event: CI_VALIDATION
   *  Subevent: VALIDATE:WORKSPACE
   *  status: SUCCESS
   */
  TEMPLATE_WORKSPACE_SUCCESS: 'templates/workspace_success.md',

  /**
   * Path for the github organization list
   */
  GITHUB_ORGANIZATION_PATH: './config/github_organizations.json',

}
