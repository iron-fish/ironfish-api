/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { pino } from 'pino';

@Injectable()
export class LoggerService {
  readonly logger: pino.Logger;

  constructor() {
    this.logger = pino({
      redact: {
        paths: ['req.headers.authorization'],
      },
    });
  }

  error(message: string, stackTrace: string): void {
    this.logger.error({ error: stackTrace }, message);
  }

  warn(message: string): void {
    this.logger.warn(message);
  }

  info(message: string): void {
    this.logger.info(message);
  }

  debug(message: string): void {
    this.logger.debug(message);
  }
}
