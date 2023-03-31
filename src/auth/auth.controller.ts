/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { CookieOptions, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ApiConfigService } from '../api-config/api-config.service';
import { MS_PER_DAY } from '../common/constants';
import { MagicLinkService } from '../magic-link/magic-link.service';
import { UsersService } from '../users/users.service';
import { LoginQueryDto } from './dto/login-query.dto';

@Controller()
export class AuthController {
  constructor(
    private readonly config: ApiConfigService,
    private readonly magicLinkService: MagicLinkService,
    private readonly usersService: UsersService,
  ) {}

  @ApiExcludeEndpoint()
  @Post('login')
  async login(@Req() req: Request, @Res() res: Response): Promise<void> {
    if (this.config.get<boolean>('DISABLE_LOGIN')) {
      throw new UnauthorizedException();
    }

    let email;

    const { authorization } = req.headers;
    if (!authorization) {
      throw new UnauthorizedException();
    }

    try {
      email = await this.magicLinkService.getEmailFromHeader(authorization);
    } catch {
      throw new UnauthorizedException();
    }

    if (email) {
      const user = await this.usersService.findByEmail(email);
      if (user) {
        await this.usersService.updateLastLoginAt(user);
      } else {
        throw new UnauthorizedException({ error: 'user_invalid' });
      }
    }

    res.sendStatus(HttpStatus.OK);
  }

  @ApiExcludeEndpoint()
  @Get('login')
  async jwtLogin(
    @Query(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    { token }: LoginQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    if (this.config.get<boolean>('DISABLE_LOGIN')) {
      throw new UnauthorizedException();
    }

    const email = this.verifyEmailFromJwt(token);

    const user = await this.usersService.findByEmail(email);
    if (user) {
      await this.usersService.updateLastLoginAt(user);
    } else {
      throw new UnauthorizedException({ error: 'user_invalid' });
    }

    this.setResponseHeaders(res, token);
    res.sendStatus(HttpStatus.OK);
  }

  private verifyEmailFromJwt(token: string): string {
    try {
      const payload = jwt.verify(
        token,
        this.config.get<string>('JWT_TOKEN_SECRET'),
      );

      if (typeof payload === 'string') {
        throw new UnprocessableEntityException('Invalid payload');
      }

      if (payload.sub === undefined) {
        throw new UnprocessableEntityException('Invalid payload object');
      }

      return payload.sub;
    } catch (err) {
      if (err instanceof jwt.JsonWebTokenError) {
        throw new UnprocessableEntityException({
          code: err.name,
          message: err.message,
        });
      }

      throw new UnauthorizedException();
    }
  }

  private setResponseHeaders(res: Response, token: string): void {
    const cookieOptions: CookieOptions = {
      httpOnly: true,
      maxAge: MS_PER_DAY,
    };

    if (!this.config.isLocal()) {
      cookieOptions.domain = this.config.get<string>(
        'INCENTIVIZED_TESTNET_URL',
      );
      cookieOptions.sameSite = 'none';
      cookieOptions.secure = true;
    }

    res.cookie('ironfish_jwt', token, cookieOptions);
  }
}
