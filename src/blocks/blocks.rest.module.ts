/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { AssetDescriptionsModule } from '../asset-descriptions/asset-descriptions.module';
import { BlocksDailyModule } from '../blocks-daily/blocks-daily.module';
import { BlocksTransactionsLoaderModule } from '../blocks-transactions-loader/blocks-transactions-loader.module';
import { UsersModule } from '../users/users.module';
import { BlocksController } from './blocks.controller';
import { BlocksModule } from './blocks.module';

@Module({
  controllers: [BlocksController],
  imports: [
    AssetDescriptionsModule,
    BlocksDailyModule,
    BlocksModule,
    BlocksTransactionsLoaderModule,
    UsersModule,
  ],
})
export class BlocksRestModule {}
