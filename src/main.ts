/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { initializeTracer } from './dd-trace/tracer';
initializeTracer('api');

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
import { LoggerService } from './logger/logger.service';

async function bootstrap(): Promise<void> {
  const server = express();
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(server),
  );
  const config = app.get(ApiConfigService);
  const logger = app.get(LoggerService);

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
    methods: 'GET, POST, PUT, OPTIONS',
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
  logger.info(`Starting API on PORT ${port}`);
  http.createServer(server).listen(port);
}

/* eslint-disable no-console */
function clusterize(callback: () => Promise<void>): void {
  if (cluster.isPrimary) {
    console.log(`Starting master process PID ${process.pid}`);

    process.on('SIGINT', function () {
      if (cluster.workers) {
        for (const worker of Object.values(cluster.workers)) {
          assert.ok(worker);
          const { pid } = worker.process;
          console.log(`Killing worker ${pid ? `PID ${pid}` : ''}`);
          worker.kill();
        }
      }
      console.log(`Killing master process PID ${process.pid}`);
      process.exit(0);
    });

    const cpuCount = os.cpus().length;
    const workers = process.env.WORKER_COUNT
      ? Math.min(Number(process.env.WORKER_COUNT), cpuCount)
      : cpuCount;
    for (let i = 0; i < workers; i++) {
      cluster.fork();
    }

    cluster.on('exit', (worker, _code, signal) => {
      const { pid } = worker.process;
      console.log(
        `Worker ${pid ? `PID ${pid}` : ''} died from ${signal}. Restarting...`,
      );
      cluster.fork();
    });
  } else {
    callback().catch(console.error);
  }
}
/* eslint-enable no-console */

clusterize(bootstrap);
