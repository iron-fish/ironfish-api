/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { PrismaModule } from '../prisma/prisma.module';
import { NodeUptimesModule } from './node-uptimes.module';
import { NodeUptimesLoader } from './node-uptimes-loader';

@Module({
  exports: [NodeUptimesLoader],
  imports: [EventsModule, NodeUptimesModule, PrismaModule],
  providers: [NodeUptimesLoader],
})
export class NodeUptimesLoaderModule {}
