/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { AssetDescriptionsModule } from '../asset-descriptions/asset-descriptions.module';
import { AssetsModule } from '../assets/assets.module';
import { BlocksModule } from '../blocks/blocks.module';
import { LoggerModule } from '../logger/logger.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { AssetsLoader } from './assets-loader';

@Module({
  exports: [AssetsLoader],
  imports: [
    AssetsModule,
    AssetDescriptionsModule,
    BlocksModule,
    LoggerModule,
    PrismaModule,
    TransactionsModule,
  ],
  providers: [AssetsLoader],
})
export class AssetsLoaderModule {}
