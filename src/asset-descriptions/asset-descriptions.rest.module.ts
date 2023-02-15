/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { AssetDescriptionsController } from './asset-descriptions.controller';
import { AssetDescriptionsModule } from './asset-descriptions.module';

@Module({
  controllers: [AssetDescriptionsController],
  imports: [AssetDescriptionsModule, AssetsModule, TransactionsModule],
})
export class AssetDescriptionsRestModule {}
