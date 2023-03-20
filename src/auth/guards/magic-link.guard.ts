/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class MagicLinkGuard extends AuthGuard('magic-link') {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  handleRequest(err: any, user: any, info: any, context: any, status: any) {
    if (info && !user) {
      switch (info) {
        case 'no_account_found':
          throw new NotFoundException(
            'Error: No Iron Fish account exists for this email.',
          );
        case 'empty_email':
          throw new BadRequestException(
            'Error: Email can not be empty. Please try again.',
          );
        case 'disable_login':
          throw new UnauthorizedException('Error: Login is disabled.');
        default:
          throw new UnauthorizedException(info);
      }
    }

    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return user;
  }
}
