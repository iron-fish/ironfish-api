/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  Res,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { ParsedUrlQueryInput, stringify } from 'querystring';
import { ApiConfigService } from '../api-config/api-config.service';
import { Context } from '../common/decorators/context';
import { MagicLinkContext } from '../common/interfaces/magic-link-context';
import { MagicLinkService } from '../magic-link/magic-link.service';
import { UsersService } from '../users/users.service';
import { MagicLinkCallbackDto } from './dto/magic-link-callback.dto';
import { MagicLinkGuard } from './guards/magic-link.guard';

@Controller()
export class AuthController {
  constructor(
    private readonly config: ApiConfigService,
    private readonly magicLinkService: MagicLinkService,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  @UseGuards(MagicLinkGuard)
  async login(
    @Context() { user }: MagicLinkContext,
    @Res() res: Response,
  ): Promise<void> {
    await this.usersService.updateLastLoginAt(user);
    res.sendStatus(HttpStatus.OK);
  }

  @Get('auth/callback')
  async callback(
    @Query(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    )
    { magic_credential: magicCredential }: MagicLinkCallbackDto,
    @Res() res: Response,
  ): Promise<void> {
    let queryParameters: ParsedUrlQueryInput = {};
    let email;

    try {
      email = await this.magicLinkService.getEmailFromToken(magicCredential);
    } catch {
      queryParameters = { error: 'user_invalid' };
    }

    if (email) {
      const user = await this.usersService.findConfirmedByEmail(email);
      if (user) {
        await this.usersService.updateLastLoginAt(user);
        queryParameters = { magic_credential: magicCredential };
      } else {
        const unconfirmedUsers = await this.usersService.listByEmail(email);
        if (unconfirmedUsers.length > 0) {
          queryParameters = { error: 'user_unconfirmed' };
        } else {
          queryParameters = { error: 'user_invalid' };
        }
      }
    }

    res.redirect(
      `${this.config.get<string>(
        'INCENTIVIZED_TESTNET_URL',
      )}/callback?${stringify(queryParameters)}`,
    );
  }
}
