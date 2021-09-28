/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { NestFactory } from '@nestjs/core';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
import compression from 'compression';
import express from 'express';
import { json } from 'express';
import helmet from 'helmet';
import http from 'http';
import { AppModule } from './app.module';

// TODO(rohanjadvani): Move these into a custom config service
// https://linear.app/ironfish/issue/IRO-1015/create-custom-config-service-to-wrap-default-nestjs
const BLOCK_EXPLORER_URL =
  process.env.BLOCK_EXPLORER_URL || 'http://localhost:3000';
const INCENTIVIZED_TESTNET_URL =
  process.env.INCENTIVIZED_TESTNET_URL || 'http://localhost:3001';
const PORT = process.env.PORT || 8003;

async function bootstrap() {
  const server = express();
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(server),
  );

  const defaultOrigins = [BLOCK_EXPLORER_URL, INCENTIVIZED_TESTNET_URL];
  const enabledOrigins =
    process.env.NODE_ENV === 'staging'
      ? [
          ...defaultOrigins,
          /localhost/,
          /block-explorer.*\.vercel\.app/,
          /website-testnet.*\.vercel\.app/,
        ]
      : defaultOrigins;

  app.enableCors({
    origin: enabledOrigins,
    methods: 'GET, POST, OPTIONS',
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
    credentials: true,
  });

  app.use(compression());
  app.use(helmet());
  app.use(json({ limit: '10mb' }));

  await app.init();
  http.createServer(server).listen(PORT);
}

// eslint-disable-next-line no-console
bootstrap().catch(console.error);
