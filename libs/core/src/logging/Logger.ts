/* eslint-disable @typescript-eslint/no-explicit-any */
import * as colors from 'ansi-colors';
import * as winston from 'winston';

import { ITimer } from './ITimer';

interface IFormat extends winston.Logform.TransformableInfo {
  timestamp: string;
  context?: string | number;
}
interface ILoggerOptions {
  name?: string;
}

export class Logger {
  private logger: winston.Logger;

  constructor(options: ILoggerOptions) {
    const colorizer = winston.format.colorize();
    winston.addColors({
      info: 'white', // fontStyle color
      warn: 'yellow',
      error: 'bold red',
      debug: 'green',
    });

    this.logger = winston.createLogger({
      defaultMeta: options,
      level: 'debug',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY/MM/DD HH:mm:ss ' }),
        winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] })
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.simple(),
            winston.format.splat(),
            winston.format.printf((info) => {
              const timestamp = (info as IFormat).timestamp;
              const context = (info as IFormat).context;

              return [
                context ? `${context} - ` : '',
                timestamp,
                ' ',
                info.level.toLocaleUpperCase().padStart(8, ' '),
                ' ',
                options.name ? colors.yellow(`[${options.name}] `) : '',
                colorizer.colorize(info.level, info.message),
              ].join('');
            })
          ),
        }),
      ],
    });
  }

  withContext(context: string | number): ContextualizedLogger {
    return new ContextualizedLogger(this, context);
  }

  startTimer(): ITimer {
    const startAt = process.hrtime();
    let endAt: [number, number] | undefined = undefined;
    let diffTimeInMiliseconds = -1;
    let diffTimeInSeconds = -1;
    let diffTimeInMinutes = -1;

    return {
      inMiliseconds: () => diffTimeInMiliseconds,
      inSeconds: () => diffTimeInSeconds,
      inMinutes: () => diffTimeInMinutes,
      toString: () => {
        let output = `+${diffTimeInMiliseconds}ms`;

        if (diffTimeInMinutes >= 1) {
          output = `+${diffTimeInMinutes}mins`;
        } else if (diffTimeInSeconds >= 1) {
          output = `+${diffTimeInSeconds}secs`;
        }

        return colors.yellow(output);
      },

      stop() {
        endAt = process.hrtime(startAt);
        diffTimeInMiliseconds = Math.round(endAt[0] * 1e3 + endAt[1] * 1e-6);
        diffTimeInSeconds = Math.round(diffTimeInMiliseconds / 1000);
        diffTimeInMinutes = Math.round(diffTimeInSeconds / 60);
      },
    };
  }

  log(message: any, context?: string | number): any {
    if ('object' === typeof message) {
      const { message: msg, ...meta } = message;

      return this.logger.info(msg as string, { context, ...meta });
    }

    return this.logger.info(message, { context });
  }

  error(message: any, trace?: string, context?: string | number): any {
    if (message instanceof Error) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { message: msg, name, stack, ...meta } = message;

      return this.logger.error(msg, { context, stack: [trace || message.stack], ...meta });
    }

    if ('object' === typeof message) {
      const { message: msg, ...meta } = message;
      return this.logger.error(msg as string, { context, stack: [trace], ...meta });
    }

    return this.logger.error(message, { context, stack: [trace] });
  }

  warn(message: any, context?: string | number): any {
    if ('object' === typeof message) {
      const { message: msg, ...meta } = message;

      return this.logger.warn(msg as string, { context, ...meta });
    }

    return this.logger.warn(message, { context });
  }

  debug(message: any, context?: string | number): any {
    if ('object' === typeof message) {
      return this.logger.debug(message, { context });
    }

    return this.logger.debug(message, { context });
  }

  verbose(message: any, context?: string | number): any {
    if ('object' === typeof message) {
      const { message: msg, ...meta } = message;

      return this.logger.verbose(msg as string, { context, ...meta });
    }

    return this.logger.verbose(message, { context });
  }
}

export class ContextualizedLogger {
  private context: number | string;
  private parentLogger: Logger;
  private timer?: ITimer;

  constructor(parentLogger: Logger, context: string | number) {
    this.parentLogger = parentLogger;
    this.context = context;
  }

  start(): void {
    this.timer = this.parentLogger.startTimer();
  }

  stop(): ITimer {
    if (this.timer) {
      this.timer.stop();
      return this.timer;
    }

    return {
      inMiliseconds: () => 0,
      inMinutes: () => 0,
      inSeconds: () => 0,
      stop: () => null,
    } as ITimer;
  }

  startTimer(): ITimer {
    return this.parentLogger.startTimer();
  }

  public log(message: string): any {
    return this.parentLogger.log(message, this.context);
  }

  public error(message: string, trace?: string): any {
    return this.parentLogger.error(message, trace, this.context);
  }

  public warn(message: string): any {
    return this.parentLogger.warn(message, this.context);
  }

  public debug(message: any): any {
    return this.parentLogger.debug(message, this.context);
  }

  public verbose(message: any): any {
    return this.parentLogger.verbose(message, this.context);
  }
}
