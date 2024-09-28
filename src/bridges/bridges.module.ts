/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ApiConfigModule } from '../api-config/api-config.module';
import { LoggerModule } from '../logger/logger.module';
import { ChainportService } from './chainport.service';

@Module({
  exports: [ChainportService],
  imports: [ApiConfigModule, HttpModule, LoggerModule],
  providers: [ChainportService],
})
export class BridgesModule {}
