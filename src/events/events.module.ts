/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { ApiConfigModule } from '../api-config/api-config.module';
import { BlocksModule } from '../blocks/blocks.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsService } from './events.service';

@Module({
  exports: [EventsService],
  imports: [ApiConfigModule, BlocksModule, PrismaModule],
  providers: [EventsService],
})
export class EventsModule {}
