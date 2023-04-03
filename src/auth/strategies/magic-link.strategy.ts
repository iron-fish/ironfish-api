/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import jwt, { JsonWebTokenError } from 'jsonwebtoken';
import { Strategy } from 'passport';
import { ApiConfigService } from '../../api-config/api-config.service';
import { MagicLinkContext } from '../../common/interfaces/magic-link-context';
import { MagicLinkService } from '../../magic-link/magic-link.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class MagicLinkStrategy extends PassportStrategy(
  Strategy,
  'magic-link',
) {
  constructor(
    private readonly config: ApiConfigService,
    private readonly magicLinkService: MagicLinkService,
    private readonly usersService: UsersService,
  ) {
    super();
  }

  async authenticate(req: Request): Promise<void> {
    if (this.config.get('DISABLE_LOGIN')) {
      return this.fail({
        code: 'disable_login',
        message: 'Error: Login is disabled.',
      });
    }

    const { authorization } = req.headers;

    let email;
    if (authorization) {
      try {
        email = await this.magicLinkService.getEmailFromHeader(authorization);
      } catch {
        return this.fail({
          code: 'email_error',
          message: 'Error: Failed to get the email. Please try again.',
        });
      }
    } else if (req.cookies) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const token: string = req.cookies.ironfish_jwt;
        const decoded = jwt.verify(token, this.config.get('JWT_TOKEN_SECRET'));

        if (!decoded.sub || decoded.sub.toString().length === 0) {
          return this.fail({
            code: 'invalid_token',
            message: 'Error: Jwt token is missing email.',
          });
        }

        email = decoded.sub.toString();
      } catch (err) {
        if (err instanceof JsonWebTokenError) {
          return this.fail({
            code: err.name,
            message: `Error: Jwt token has error. ${err.message}`,
          });
        } else {
          return this.fail({
            code: 'token_error',
            message: `Error: Failed to verify token.`,
          });
        }
      }
    }

    if (email) {
      try {
        const user = await this.usersService.findByEmailOrThrow(email);
        req.context = {
          ...req.context,
          user,
        } as MagicLinkContext;
      } catch {
        return this.fail({
          code: 'user_not_found',
          message: 'Error: No Iron Fish account exists for this email.',
        });
      }

      return this.pass();
    }

    return this.fail({
      code: 'no_authorization',
      message: 'Error: Request is missing authorization data.',
    });
  }
}
