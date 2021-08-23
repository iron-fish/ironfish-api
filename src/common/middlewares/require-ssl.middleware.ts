/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequireSslMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    if (
      process.env.NODE_ENV !== 'dev' &&
      req.headers['x-forwarded-proto'] !== 'https'
    ) {
      throw new ForbiddenException({
        message: '"https" is required to access the Iron Fish API',
      });
    }
    next();
  }
}
