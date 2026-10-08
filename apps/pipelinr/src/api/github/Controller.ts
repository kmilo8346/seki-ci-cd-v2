import { Body, Controller, Headers, Logger, Post, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { Nest } from '@seki-ci/core';
import { Github } from '@seki-ci/models';
import DevKit from '@team_seki/dev-kit';
import { Public } from '@team_seki/nestjs-jwt-module';
import constants from '../../constants';
import GithubService from './Service';

const ZodValidation = Nest.Pipes.ZodValidation;

@Controller('github')
@Public()
export default class GithubController {
  constructor(private readonly service: GithubService) {}

  @Post('/webhooks')
  async create(
    @Res() response: Response,
    @Body(new ZodValidation(Github.Webhooks.PushEventSchema)) gitEvent: Github.Webhooks.TPushEvent,
    @Headers() headers: Record<string, string>
  ) {
    //------------------------------------------------
    // Preconditions
    // Must be a push event
    if (headers['x-github-event'] !== 'push') {
      Logger.warn('The git event must be push, ci skipped...');
      Logger.debug({
        repository: headers['x-github-event'] === 'ping' ? '' : gitEvent.repository?.name,
        expected: 'push',
        received: headers['x-github-event'],
      });
      return response.status(HttpStatus.NO_CONTENT).send();
    }

    //------------------------------------------------
    // Must be over main or a tag over main branch
    const allowedRefs = ['refs/heads/main', constants.REF_TAG_REPLACER];
    if (allowedRefs.every((allowedRef) => gitEvent.ref.indexOf(allowedRef) === -1)) {
      Logger.warn('The branch must be main or a tag over main, ci skipped...');
      Logger.debug({
        repository: gitEvent.repository?.name,
        reference: gitEvent.ref,
      });
      return response.status(HttpStatus.NO_CONTENT).send();
    }

    //------------------------------------------------
    // Check if the tag contains build information
    if (gitEvent.ref.includes(constants.REF_TAG_REPLACER)) {
      const stage_id = gitEvent.ref.replace(constants.REF_TAG_REPLACER, '');
      if (
        /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[a-zA-Z\d][-a-zA-Z.\d]*)?\+sha\.[a-zA-Z\d][-a-zA-Z.\d]*/gi.test(
          stage_id
        )
      ) {
        Logger.warn('The tag is the result of a compilation, ci skipped...');
        Logger.debug({
          repository: gitEvent.repository?.name,
          reference: gitEvent.ref,
        });
        return response.status(HttpStatus.NO_CONTENT).send();
      }
    }

    //------------------------------------------------
    // The commit message must not contain ci skip message
    if (gitEvent.head_commit.message.toLocaleLowerCase().includes('[ci skip]')) {
      Logger.warn('The commit message has [ci skip] tag, ci skipped...');
      Logger.debug({
        repository: gitEvent.repository?.name,
        reference: gitEvent.ref,
        message: gitEvent.head_commit.message,
      });
      return response.status(HttpStatus.NO_CONTENT).send();
    }

    //------------------------------------------------
    // The repository must have a valid seki topic
    if (!gitEvent.repository?.topics.includes(constants.REQUIRED_SEKI_TOPIC)) {
      throw new Nest.Exceptions.RequiredTopicInCommitException(
        gitEvent.repository.name,
        [constants.REQUIRED_SEKI_TOPIC],
        gitEvent.repository.topics
      );
    }

    //------------------------------------------------
    // The repository must have a valid seki flow topic
    if (!gitEvent.repository?.topics.includes(constants.REQUIRED_SEKI_FLOW_TOPIC)) {
      throw new Nest.Exceptions.RequiredTopicInCommitException(
        gitEvent.repository.name,
        [constants.REQUIRED_SEKI_FLOW_TOPIC],
        gitEvent.repository.topics
      );
    }

    //------------------------------------------------
    // Skip product with local mode if has the topic &&
    // this artifact is not running in developer machine
    if (gitEvent.repository?.topics.includes(constants.LOCAL_MODE_TOPIC) && !DevKit.isLocal()) {
      throw new Nest.Exceptions.LocalModeException(gitEvent.repository.name);
    }

    await this.service.publish(gitEvent);

    response.status(201).send({
      commit: gitEvent.head_commit.id,
      repository: gitEvent.repository.name,
      organization: gitEvent.organization.login,
      status: 'Published',
    });
  }
}
