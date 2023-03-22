/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
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
    const { authorization } = req.headers;
    if (!authorization) {
      return this.fail('Error: Request header is invalid.');
    }

    if (this.config.get('DISABLE_LOGIN')) {
      return this.fail('Error: Login is disabled.');
    }

    let email;
    try {
      email = await this.magicLinkService.getEmailFromHeader(authorization);
    } catch {
      return this.fail('Error: Failed to get the email. Please try again.');
    }

    try {
      const user = await this.usersService.findByEmailOrThrow(email);
      req.context = {
        ...req.context,
        user,
      } as MagicLinkContext;
    } catch {
      return this.fail('Error: No Iron Fish account exists for this email.');
    }

    return this.pass();
  }
}
