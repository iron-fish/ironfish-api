/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { ApiConfigService } from '../../api-config/api-config.service';

@Injectable()
export class RequireSslMiddleware implements NestMiddleware {
  constructor(private readonly config: ApiConfigService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    if (
      this.config.get<string>('NODE_ENV') !== 'development' &&
      req.headers['x-forwarded-proto'] !== 'https'
    ) {
      throw new ForbiddenException({
        message: '"https" is required to access the Iron Fish API',
      });
    }
    next();
  }
}
