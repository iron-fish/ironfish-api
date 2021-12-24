/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { ApiConfigModule } from '../api-config/api-config.module';
import { PrismaService } from './prisma.service';

@Module({
  exports: [PrismaService],
  imports: [ApiConfigModule],
  providers: [PrismaService],
})
export class PrismaModule {}
