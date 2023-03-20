/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { ApiConfigModule } from '../api-config/api-config.module';
import { JumioTransactionModule } from '../jumio-transactions/jumio-transaction.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UserPointsModule } from '../user-points/user-points.module';
import { UsersModule } from '../users/users.module';
import { RedemptionService } from './redemption.service';

@Module({
  exports: [RedemptionService],
  imports: [
    PrismaModule,
    UserPointsModule,
    UsersModule,
    JumioTransactionModule,
    ApiConfigModule,
  ],
  providers: [RedemptionService],
})
export class RedemptionModule {}
