/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { ApiConfigModule } from '../api-config/api-config.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UserPointsModule } from '../user-points/user-points.module';
import { UsersService } from './users.service';

@Module({
  exports: [UsersService],
  imports: [ApiConfigModule, PrismaModule, UserPointsModule],
  providers: [UsersService],
})
export class UsersModule {}
