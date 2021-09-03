/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Controller, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { Context } from '../common/decorators/context';
import { MagicLinkContext } from '../common/interfaces/magic-link-context';
import { UsersService } from '../users/users.service';
import { MagicLinkGuard } from './guards/magic-link.guard';

@Controller('login')
export class LoginController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(MagicLinkGuard)
  async login(
    @Context() { user }: MagicLinkContext,
    @Res() res: Response,
  ): Promise<void> {
    await this.usersService.updateLastLoginAt(user);
    res.sendStatus(HttpStatus.OK);
  }
}
