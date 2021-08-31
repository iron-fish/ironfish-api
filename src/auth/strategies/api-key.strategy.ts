/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport';
import { ApiConfigService } from '../../api-config/api-config.service';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(private readonly config: ApiConfigService) {
    super();
  }

  authenticate(request: Request): void {
    const { headers } = request;
    const apiKey = headers.authorization;
    const ironfishApiKey = this.config.get<string>('IRONFISH_API_KEY');
    if (apiKey !== `Bearer ${ironfishApiKey}`) {
      throw new UnauthorizedException();
    }
    return this.pass();
  }
}
