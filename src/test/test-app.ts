/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { json } from 'express';
import joi from 'joi';
import { REST_MODULES } from '../app.module';
import { AuthModule } from '../auth/auth.module';
import { BlocksModule } from '../blocks/blocks.module';
import { BlocksTransactionsModule } from '../blocks-transactions/blocks-transactions.module';
import { EventsModule } from '../events/events.module';
import { FaucetTransactionsModule } from '../faucet-transactions/faucet-transactions.module';
import { PostmarkService } from '../postmark/postmark.service';
import { TransactionsModule } from '../transactions/transactions.module';
import { UsersModule } from '../users/users.module';
import { MockPostmarkService } from './mocks/mock-postmark.service';

export async function bootstrapTestApp(): Promise<INestApplication> {
  const module = await Test.createTestingModule({
    imports: [
      AuthModule,
      BlocksModule,
      BlocksTransactionsModule,
      ConfigModule.forRoot({
        envFilePath: '.env.test',
        isGlobal: true,
        validationSchema: joi.object({
          API_URL: joi.string().required(),
          BLOCK_EXPLORER_URL: joi.string().required(),
          DATABASE_URL: joi.string().required(),
          INCENTIVIZED_TESTNET_URL: joi.string().required(),
          IRONFISH_API_KEY: joi.string().required(),
          MAGIC_SECRET_KEY: joi.string().required(),
          NETWORK_VERSION: joi.number().required(),
          NODE_ENV: joi.string().required(),
          POSTMARK_API_KEY: joi.string().required(),
        }),
      }),
      EventsModule,
      FaucetTransactionsModule,
      TransactionsModule,
      UsersModule,
      ...REST_MODULES,
    ],
  })
    .overrideProvider(PostmarkService)
    .useClass(MockPostmarkService)
    .compile();

  const app = module.createNestApplication();
  app.use(json({ limit: '10mb' }));
  return app;
}
