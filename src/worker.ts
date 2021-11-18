/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GraphileWorkerMicroservice } from './graphile-worker/graphile-worker.microservice';

const PORT = 8004;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const graphileWorkerMicroservice = new GraphileWorkerMicroservice(
    app.get(ConfigService),
  );
  app.connectMicroservice({
    strategy: graphileWorkerMicroservice,
  });
  await app.init();

  await app.startAllMicroservices();
  await app.listen(PORT);
}

// eslint-disable-next-line no-console
bootstrap().catch(console.error);
