/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { NestFactory } from '@nestjs/core';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import assert from 'assert';
import cluster from 'cluster';
import compression from 'compression';
import express from 'express';
import { json } from 'express';
import helmet from 'helmet';
import http from 'http';
import os from 'os';
import { ApiConfigService } from './api-config/api-config.service';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const server = express();
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(server),
  );
  const config = app.get(ApiConfigService);

  const defaultOrigins = [
    config.get<string>('BLOCK_EXPLORER_URL'),
    config.get<string>('INCENTIVIZED_TESTNET_URL'),
  ];
  const enabledOrigins = config.isStaging()
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Iron Fish API')
    .setDescription('The Rest API to enable public access to Iron Fish data')
    .setVersion('')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'Iron Fish API Documentation',
  });

  await app.init();

  const port = config.get<number>('PORT');
  http.createServer(server).listen(port);
}

function clusterize(callback: () => Promise<void>): void {
  if (cluster.isPrimary) {
    process.on('SIGINT', function () {
      if (cluster.workers) {
        for (const worker of Object.values(cluster.workers)) {
          assert.ok(worker);
          worker.kill();
        }
      }
      process.exit(0);
    });

    const workers = os.cpus().length;
    for (let i = 0; i < workers; i++) {
      cluster.fork();
    }

    cluster.on('exit', () => {
      // Restart worker
      cluster.fork();
    });
  } else {
    // eslint-disable-next-line no-console
    callback().catch(console.error);
  }
}

clusterize(bootstrap);
