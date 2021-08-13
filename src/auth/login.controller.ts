/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Controller,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MagicLinkService } from '../magic-link/magic-link.service';
import { UsersService } from '../users/users.service';

@Controller('login')
export class LoginController {
  constructor(
    private readonly magicLinkService: MagicLinkService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  async login(@Req() req: Request, @Res() res: Response): Promise<void> {
    const { authorization: didToken } = req.headers;
    if (!didToken) {
      throw new UnauthorizedException();
    }
    try {
      this.magicLinkService.validate(didToken);
      const { email } = await this.magicLinkService.getMetadataByToken(
        didToken,
      );
      if (!email) {
        throw new Error('No email found for token');
      }
      await this.usersService.updateLastLoginAtByEmail(email);
    } catch {
      throw new UnauthorizedException();
    }
    res.sendStatus(HttpStatus.OK);
  }
}
