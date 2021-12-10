/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { NestFactory } from '@nestjs/core';
import { ApiConfigService } from './api-config/api-config.service';
import { AppModule } from './app.module';
import { DatadogService } from './datadog/datadog.service';
import { GraphileWorkerMicroservice } from './graphile-worker/graphile-worker.microservice';
import { LoggerService } from './logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ApiConfigService);
  const datadogService = app.get(DatadogService);
  const logger = app.get(LoggerService);

  const graphileWorkerMicroservice = new GraphileWorkerMicroservice(
    config,
    datadogService,
    logger,
  );
  app.connectMicroservice({
    strategy: graphileWorkerMicroservice,
  });
  await app.startAllMicroservices();
  await app.init();
}

// eslint-disable-next-line no-console
bootstrap().catch(console.error);
