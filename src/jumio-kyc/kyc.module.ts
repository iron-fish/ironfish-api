/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { JumioApiModule } from '../jumio-api/jumio-api.module';
import { JumioTransactionModule } from '../jumio-transactions/jumio-transaction.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RedemptionModule } from '../redemptions/redemption.module';
import { UsersModule } from '../users/users.module';
import { KycService } from './kyc.service';

@Module({
  exports: [KycService],
  imports: [
    PrismaModule,
    JumioApiModule,
    RedemptionModule,
    JumioTransactionModule,
    UsersModule,
  ],
  providers: [KycService],
})
export class KycModule {}
