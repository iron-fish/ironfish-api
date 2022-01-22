/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { VersionsController } from './versions.controller';
import { VersionsModule } from './versions.module';

@Module({
  controllers: [VersionsController],
  imports: [VersionsModule],
})
export class VersionsRestModule {}
