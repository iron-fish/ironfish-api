/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(private readonly config: ConfigService) {
    super();
  }

  authenticate(request: Request): void {
    const { headers } = request;
    const apiKey = headers.authorization;
    const ironfishApiKey = this.config.get<string>('IRONFISH_API_KEY');
    if (!ironfishApiKey) {
      throw new InternalServerErrorException('API Key value not configured');
    }
    if (apiKey !== `Bearer ${ironfishApiKey}`) {
      throw new UnauthorizedException();
    }
    return this.pass();
  }
}
