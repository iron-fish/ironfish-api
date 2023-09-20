/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { BlocksTransactionsModule } from '../blocks-transactions/blocks-transactions.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { BridgeController } from './bridge.controller';
import { BridgeModule } from './bridge.module';

@Module({
  controllers: [BridgeController],
  imports: [BridgeModule, BlocksTransactionsModule, TransactionsModule],
})
export class BridgeRestModule {}
