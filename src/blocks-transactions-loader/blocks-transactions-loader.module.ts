/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { BlocksModule } from '../blocks/blocks.module';
import { BlocksTransactionsModule } from '../blocks-transactions/blocks-transactions.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { BlocksTransactionsLoaderService } from './block-transactions-loader.service';

@Module({
  exports: [BlocksTransactionsLoaderService],
  imports: [
    BlocksModule,
    BlocksTransactionsModule,
    PrismaModule,
    TransactionsModule,
  ],
  providers: [BlocksTransactionsLoaderService],
})
export class BlocksTransactionsLoaderModule {}
