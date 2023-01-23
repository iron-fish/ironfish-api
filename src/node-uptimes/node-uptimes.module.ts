/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NodeUptimesService } from './node-uptimes.service';

@Module({
  exports: [NodeUptimesService],
  imports: [PrismaModule],
  providers: [NodeUptimesService],
})
export class NodeUptimesModule {}
