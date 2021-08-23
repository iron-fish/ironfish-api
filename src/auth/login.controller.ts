/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Controller, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { MagicLinkGuard } from './guards/magic-link.guard';

@Controller('login')
export class LoginController {
  @Post()
  @UseGuards(MagicLinkGuard)
  login(@Res() res: Response): void {
    res.sendStatus(HttpStatus.OK);
  }
}
