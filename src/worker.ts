/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GraphileWorkerMicroservice } from './graphile-worker/graphile-worker.microservice';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice({
    strategy: new GraphileWorkerMicroservice(app.get(ConfigService)),
  });
  await app.init();
}

// eslint-disable-next-line no-console
bootstrap().catch(console.error);
