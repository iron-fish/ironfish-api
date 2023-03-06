/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { ApiConfigModule } from '../api-config/api-config.module';
import { AssetsLoaderModule } from '../assets-loader/assets-loader.module';
import { BlocksModule } from '../blocks/blocks.module';
import { BlocksDailyModule } from '../blocks-daily/blocks-daily.module';
import { BlocksTransactionsModule } from '../blocks-transactions/blocks-transactions.module';
import { EventsModule } from '../events/events.module';
import { GraphileWorkerModule } from '../graphile-worker/graphile-worker.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { BlocksTransactionsLoader } from './blocks-transactions-loader';

@Module({
  exports: [BlocksTransactionsLoader],
  imports: [
    ApiConfigModule,
    AssetsLoaderModule,
    BlocksDailyModule,
    BlocksModule,
    BlocksTransactionsModule,
    GraphileWorkerModule,
    PrismaModule,
    TransactionsModule,
    EventsModule,
  ],
  providers: [BlocksTransactionsLoader],
})
export class BlocksTransactionsLoaderModule {}
