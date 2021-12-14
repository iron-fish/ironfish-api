/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { BlocksModule } from '../blocks/blocks.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from './users.module';
import { UsersUpdater } from './users-updater';

@Module({
  exports: [UsersUpdater],
  imports: [BlocksModule, PrismaModule, UsersModule],
  providers: [UsersUpdater],
})
export class UsersUpdaterModule {}
