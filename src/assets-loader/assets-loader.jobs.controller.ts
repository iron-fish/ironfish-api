/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Controller, UseFilters } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerException } from '../graphile-worker/graphile-worker-exception';
import { GraphileWorkerHandlerResponse } from '../graphile-worker/interfaces/graphile-worker-handler-response';
import { AssetsLoader } from './assets-loader';
import { LoadDescriptionsOptions } from './interfaces/load-descriptions-options';

@Controller()
export class AssetsLoaderJobsController {
  constructor(private readonly assetsLoader: AssetsLoader) {}

  @MessagePattern(GraphileWorkerPattern.LOAD_ASSET_DESCRIPTIONS)
  @UseFilters(new GraphileWorkerException())
  async loadDescriptions({
    main,
    transaction,
  }: LoadDescriptionsOptions): Promise<GraphileWorkerHandlerResponse> {
    await this.assetsLoader.loadDescriptions(main, transaction);
    return { requeue: false };
  }
}
