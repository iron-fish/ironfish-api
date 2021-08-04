/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { BlocksController } from './blocks.controller';
import { BlocksModule } from './blocks.module';

@Module({
  controllers: [BlocksController],
  imports: [BlocksModule, UsersModule],
})
export class BlocksRestModule {}
