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

const PORT = process.env.PORT || 8003;
const LOCAL = process.env.LOCAL || false;

async function bootstrap() {
  const server = express();
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(server),
  );
  app.enableCors({
    origin: LOCAL ? /localhost./ : /website-testnet.\.vercel\.app/,
    methods: 'GET,POST,OPTIONS',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.use(compression());
  app.use(helmet());
  app.use(json({ limit: '10mb' }));

  await app.init();
  http.createServer(server).listen(PORT);
}

// eslint-disable-next-line no-console
bootstrap().catch(console.error);
