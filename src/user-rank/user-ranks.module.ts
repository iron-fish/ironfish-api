/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { GraphileWorkerModule } from '../graphile-worker/graphile-worker.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { UserRanksJobsController } from './user-ranks.job.controller';
import { UserRanksLoader } from './user-ranks.loader.service';
import { UserRanksService } from './user-ranks.service';

@Module({
  exports: [UserRanksService, UserRanksLoader],
  imports: [PrismaModule, UsersModule, GraphileWorkerModule],
  providers: [UserRanksService, UserRanksLoader],
  controllers: [UserRanksJobsController],
})
export class UserRanksModule {}
