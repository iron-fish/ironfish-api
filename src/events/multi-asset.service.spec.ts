/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication, NotFoundException } from '@nestjs/common';
import { EventType } from '@prisma/client';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { MultiAssetService } from './multi-asset.service';

describe('MultiAssetService', () => {
  let app: INestApplication;
  let multiAssetService: MultiAssetService;
  let graphileWorkerService: GraphileWorkerService;
  let prismaService: PrismaService;
  beforeAll(async () => {
    app = await bootstrapTestApp();
    multiAssetService = app.get(MultiAssetService);
    graphileWorkerService = app.get(GraphileWorkerService);
    prismaService = app.get(PrismaService);
    await app.init();
  });

  beforeEach(() => {
    jest
      .spyOn(graphileWorkerService, 'addJob')
      .mockImplementationOnce(jest.fn());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('when find user is called', () => {
    it('finds asset when asset exists', async () => {
      const multiAsset = await prismaService.multiAsset.create({
        data: {
          transaction_hash: 'transactionhash',
          block_hash: 'blockhash',
          asset_name: 'customeasset',
          type: EventType.MULTI_ASSET_MINT,
          block_sequence: 22,
          network_version: 1,
          main: true,
        },
      });
      const foundAsset = await multiAssetService.findOrThrow(multiAsset.id);
      expect(foundAsset.id).toEqual(multiAsset.id);
    });
    it('throws when asset id does not exist', async () => {
      await expect(multiAssetService.findOrThrow(123121232)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
