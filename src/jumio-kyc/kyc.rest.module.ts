/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { ApiConfigModule } from '../api-config/api-config.module';
import { GraphileWorkerModule } from '../graphile-worker/graphile-worker.module';
import { JumioTransactionModule } from '../jumio-transactions/jumio-transaction.module';
import { RedemptionModule } from '../redemptions/redemption.module';
import { UsersModule } from '../users/users.module';
import { KycController } from './kyc.controller';
import { KycModule } from './kyc.module';

@Module({
  controllers: [KycController],
  imports: [
    ApiConfigModule,
    KycModule,
    JumioTransactionModule,
    RedemptionModule,
    GraphileWorkerModule,
    UsersModule,
  ],
})
export class KycRestModule {}
