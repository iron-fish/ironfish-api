/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class MagicLinkGuard extends AuthGuard('magic-link') {
  handleRequest<User>(
    err: Error,
    user: User,
    info: string,
    _context: ExecutionContext,
  ): User {
    if (info && !user) {
      throw new UnauthorizedException(info);
    }

    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
