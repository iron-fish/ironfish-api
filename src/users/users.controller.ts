/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Param,
  Post,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { Secret, sign, SignOptions } from 'jsonwebtoken';
import { ApiConfigService } from '../api-config/api-config.service';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { IntIsSafeForPrismaPipe } from '../common/pipes/int-is-safe-for-prisma.pipe';
import { EventsService } from '../events/events.service';
import { CreateUserDto } from './dto/create-user.dto';
import { SerializedUserLoginUrl } from './interfaces/serialized-user-login-url';
import { UsersService } from './users.service';
import { User } from '.prisma/client';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly config: ApiConfigService,
    private readonly eventsService: EventsService,
    private readonly usersService: UsersService,
  ) {}

  @ApiExcludeEndpoint()
  @Post()
  async create(
    @Body(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    dto: CreateUserDto,
  ): Promise<User> {
    if (!this.config.get<string>('ENABLE_SIGNUP')) {
      throw new HttpException(
        'Signup has been disabled',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return this.usersService.create({
      email: dto.email,
      graffiti: dto.graffiti,
      countryCode: dto.country_code,
      discord: dto.discord,
      telegram: dto.telegram,
      github: dto.github,
    });
  }

  @ApiExcludeEndpoint()
  @Post(':id/token')
  @UseGuards(ApiKeyGuard)
  async createAuthToken(
    @Param('id', new IntIsSafeForPrismaPipe())
    id: number,
  ): Promise<SerializedUserLoginUrl> {
    const user = await this.usersService.findOrThrow(id);

    const secret: Secret = this.config.get<string>('JWT_TOKEN_SECRET');
    const options: SignOptions = {
      algorithm: 'HS256',
      expiresIn: '1d',
    };

    const token: string = sign(
      { sub: user.email, iat: Math.floor(Date.now() / 1000) },
      secret,
      options,
    );

    return {
      url: `https://api.ironfish.network/login?token=${token}`,
      email: user.email,
    };
  }
}
