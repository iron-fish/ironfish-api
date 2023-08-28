/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { bootstrapTestApp } from '../test/test-app';
import { AssetsLoader } from './assets-loader';
import { AssetsLoaderJobsController } from './assets-loader.jobs.controller';

describe('AssetsLoaderJobsController', () => {
  let app: INestApplication;
  let assetsLoaderJobsController: AssetsLoaderJobsController;
  let assetsLoader: AssetsLoader;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    assetsLoaderJobsController = app.get(AssetsLoaderJobsController);
    assetsLoader = app.get(AssetsLoader);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loadDescriptions', () => {
    it('uses the loader to process asset descriptions', async () => {
      const loadDescriptions = jest
        .spyOn(assetsLoader, 'loadDescriptions')
        .mockImplementationOnce(jest.fn());

      const identifier = 'asdflkj';
      const mint = {
        id: identifier,
        metadata: 'foo',
        name: 'bar',
        creator: 'baz',
        owner: 'baz',
        value: BigInt(10).toString(),
      };
      const burn = {
        id: identifier,
        value: BigInt(2).toString(),
      };
      const transaction = {
        hash: 'transaction-hash',
        fee: faker.datatype.number(),
        size: faker.datatype.number(),
        notes: [{ commitment: uuid() }],
        spends: [{ nullifier: uuid() }],
        mints: [mint],
        burns: [burn],
      };

      await assetsLoaderJobsController.loadDescriptions({
        main: true,
        transaction,
      });

      expect(loadDescriptions).toHaveBeenCalledTimes(1);
      expect(loadDescriptions).toHaveBeenCalledWith(true, transaction);
    });
  });
});
