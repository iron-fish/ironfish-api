/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { json } from 'express';
import joi from 'joi';
import { JOBS_MODULES, REST_MODULES } from '../app.module';
import { AssetDescriptionsModule } from '../asset-descriptions/asset-descriptions.module';
import { AssetsModule } from '../assets/assets.module';
import { AuthModule } from '../auth/auth.module';
import { DatadogModule } from '../datadog/datadog.module';

export async function bootstrapTestApp(): Promise<INestApplication> {
  const module = await Test.createTestingModule({
    imports: [
      AuthModule,
      ConfigModule.forRoot({
        envFilePath: '.env.test',
        isGlobal: true,
        validationSchema: joi.object({
          API_URL: joi.string().required(),
          BLOCK_EXPLORER_URL: joi.string().required(),
          CHECK_EVENT_OCCURRED_AT: joi.boolean().default(true),
          CHECK_USER_CREATED_AT: joi.boolean().default(true),
          DATABASE_CONNECTION_POOL_URL: joi.string().required(),
          DATABASE_URL: joi.string().required(),
          DATADOG_URL: joi.string().required(),
          DISABLE_FAUCET: joi.boolean().default(false),
          DISABLE_LOGIN: joi.boolean().default(false),
          GRAPHILE_CONCURRENCY: joi.number().required(),
          INCENTIVIZED_TESTNET_URL: joi.string().required(),
          INFLUXDB_API_TOKEN: joi.string().required(),
          INFLUXDB_BUCKET: joi.string().required(),
          INFLUXDB_ORG: joi.string().required(),
          INFLUXDB_URL: joi.string().required(),
          IRONFISH_API_KEY: joi.string().required(),
          MAGIC_SECRET_KEY: joi.string().required(),
          NETWORK_VERSION: joi.number().required(),
          NODE_ENV: joi.string().required(),
          PORT: joi.number().default(8003),
        }),
      }),
      DatadogModule,
      ...JOBS_MODULES,
      ...REST_MODULES,
      // TODO(rohanjadvani): Remove when loader is added
      AssetsModule,
      AssetDescriptionsModule,
    ],
  }).compile();

  const app = module.createNestApplication();
  app.use(json({ limit: '10mb' }));
  return app;
}
