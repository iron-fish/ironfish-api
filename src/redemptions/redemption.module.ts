/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { ApiConfigModule } from '../api-config/api-config.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RedemptionService } from './redemption.service';
import { RedemptionsController } from './redemptions.controller';

@Module({
  exports: [RedemptionService],
  imports: [PrismaModule, ApiConfigModule],
  providers: [RedemptionService],
  controllers: [RedemptionsController],
})
export class RedemptionModule {}
