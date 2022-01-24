/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { VersionsService } from './versions.service';

@Module({
  exports: [VersionsService],
  imports: [PrismaModule],
  providers: [VersionsService],
})
export class VersionsModule {}
