/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { BlocksModule } from '../blocks/blocks.module';
import { BlocksDailyModule } from '../blocks-daily/blocks-daily.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BlocksDailyLoader } from './blocks-daily-loader';

@Module({
  exports: [BlocksDailyLoader],
  imports: [BlocksDailyModule, BlocksModule, PrismaModule],
  providers: [BlocksDailyLoader],
})
export class BlocksDailyLoaderModule {}
