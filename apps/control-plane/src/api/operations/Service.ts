import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Nest } from '@seki-ci/core';
import { Operations } from '@seki-ci/models';
import { AxiosError, AxiosHeaders } from 'axios';
import RunnersService from '../runners/Service';

@Injectable()
export class OperationService {
  private readonly logger: Logger;

  constructor(
    private readonly httpService: HttpService,
    private readonly runnersService: RunnersService
  ) {
    this.logger = new Logger('OperationService');
  }

  /**
   * Execute an operation in a runner
   * @param model
   * @returns
   */
  async execute(model: Operations.TModel) {
    try {
      const runner = await this.runnersService.getById(model.command);

      const headers = new AxiosHeaders();
      if (runner.api_key) {
        headers.set('Authorization', `Bearer ${runner.api_key}`);
      }

      const response = await this.httpService.axiosRef.post(
        `${runner.endpoint}`,
        model.command_args,
        {
          headers,
          timeout: 30 * 1000,
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed executing operation', error);
      this.logger.debug({
        model,
      });

      // Check if the error is a OperationException
      // And throw it to inform the client
      const _error = error as AxiosError<{
        code: string;
        error: { code: string; message: string };
      }>;
      if (_error.response && _error.response.data.code === 'OPERATION_EXCEPTION') {
        throw new Nest.Exceptions.OperationException(
          _error.response.data.error.code,
          _error.response.data.error.message
        );
      }

      // Otherwise, throw a generic error
      throw new HttpException('Failed executing operation', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

export default OperationService;
