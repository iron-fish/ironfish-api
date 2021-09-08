/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport';
import { MagicLinkContext } from '../../common/interfaces/magic-link-context';
import { MagicLinkService } from '../../magic-link/magic-link.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class MagicLinkStrategy extends PassportStrategy(
  Strategy,
  'magic-link',
) {
  constructor(
    private readonly magicLinkService: MagicLinkService,
    private readonly usersService: UsersService,
  ) {
    super();
  }

  async authenticate(req: Request): Promise<void> {
    const { authorization } = req.headers;
    if (!authorization) {
      return this.fail();
    }
    try {
      this.magicLinkService.validate(authorization);
      const { email } = await this.magicLinkService.getMetadataByHeader(
        authorization,
      );
      if (!email) {
        throw new Error('No email found for token');
      }
      const user = await this.usersService.findOrThrowByEmail(email);
      if (!user.confirmed_at) {
        throw new Error('User not confirmed');
      }
      req.context = {
        ...req.context,
        user,
      } as MagicLinkContext;
    } catch {
      return this.fail();
    }
    return this.pass();
  }
}
