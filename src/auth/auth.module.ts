/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { ApiConfigModule } from '../api-config/api-config.module';
import { MagicLinkModule } from '../magic-link/magic-link.module';
import { UsersModule } from '../users/users.module';
import { ApiKeyGuard } from './guards/api-key.guard';
import { MagicLinkGuard } from './guards/magic-link.guard';
import { ApiKeyStrategy } from './strategies/api-key.strategy';
import { MagicLinkStrategy } from './strategies/magic-link.strategy';

@Module({
  imports: [ApiConfigModule, MagicLinkModule, UsersModule],
  providers: [ApiKeyGuard, ApiKeyStrategy, MagicLinkGuard, MagicLinkStrategy],
})
export class AuthModule {}
