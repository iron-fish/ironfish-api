/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MaspTransactionHeadService } from './masp-transaction-head.service';

@Module({
  exports: [MaspTransactionHeadService],
  imports: [PrismaModule],
  providers: [MaspTransactionHeadService],
})
export class MaspTransactionHeadModule {}
