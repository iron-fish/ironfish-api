/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { BlocksTransactionsModule } from '../blocks-transactions/blocks-transactions.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { AssetsController } from './assets.controller';
import { AssetsModule } from './assets.module';

@Module({
  controllers: [AssetsController],
  imports: [AssetsModule, BlocksTransactionsModule, TransactionsModule],
})
export class AssetsRestModule {}
