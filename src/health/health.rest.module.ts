/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { PostmarkModule } from '../postmark/postmark.module';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
  imports: [PostmarkModule],
})
export class HealthRestModule {}
