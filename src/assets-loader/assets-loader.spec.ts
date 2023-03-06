/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import { AssetDescriptionType } from '@prisma/client';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { AssetDescriptionsService } from '../asset-descriptions/asset-descriptions.service';
import { AssetsService } from '../assets/assets.service';
import { bootstrapTestApp } from '../test/test-app';
import { TransactionsService } from '../transactions/transactions.service';
import { AssetsLoader } from './assets-loader';

describe('AssetsLoader', () => {
  let app: INestApplication;
  let assetDescriptionsService: AssetDescriptionsService;
  let assetsLoader: AssetsLoader;
  let assetsService: AssetsService;
  let transactionsService: TransactionsService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    assetDescriptionsService = app.get(AssetDescriptionsService);
    assetsLoader = app.get(AssetsLoader);
    assetsService = app.get(AssetsService);
    transactionsService = app.get(TransactionsService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loadDescriptions', () => {
    describe('for a main block', () => {
      describe('when the transaction has already been loaded', () => {
        it('deletes and reprocesses descriptions', async () => {
          const identifier = 'asdflkjasdf';
          const mint = {
            id: identifier,
            metadata: 'foo',
            name: 'bar',
            owner: 'baz',
            value: BigInt(10).toString(),
          };
          const burn = {
            id: identifier,
            value: BigInt(2).toString(),
          };

          const transactionDto = {
            hash: 'transaction-hash-no-update',
            fee: faker.datatype.number(),
            size: faker.datatype.number(),
            notes: [{ commitment: uuid() }],
            spends: [{ nullifier: uuid() }],
            mints: [mint],
            burns: [burn],
          };

          const transaction = (
            await transactionsService.createMany([transactionDto])
          )[0];
          await assetsLoader.loadDescriptions(true, transactionDto);

          const assetsUpsert = jest.spyOn(assetsService, 'upsert');
          const assetDescriptionsCreate = jest.spyOn(
            assetDescriptionsService,
            'create',
          );
          const assetsUpdateSupply = jest.spyOn(assetsService, 'updateSupply');

          await assetsLoader.loadDescriptions(true, transactionDto);
          expect(assetsUpsert).toHaveBeenCalledTimes(1);
          expect(assetsUpsert.mock.calls[0][0]).toEqual({
            identifier: mint.id,
            metadata: mint.metadata,
            name: mint.name,
            owner: mint.owner,
          });
          expect(assetsUpsert.mock.calls[0][1]).toEqual(transaction);

          expect(assetDescriptionsCreate).toHaveBeenCalledTimes(2);
          expect(assetDescriptionsCreate.mock.calls[0][0]).toEqual(
            AssetDescriptionType.MINT,
          );
          expect(assetDescriptionsCreate.mock.calls[0][1]).toEqual(
            BigInt(mint.value),
          );
          expect(assetDescriptionsCreate.mock.calls[0][2].identifier).toEqual(
            identifier,
          );
          expect(assetDescriptionsCreate.mock.calls[1][0]).toEqual(
            AssetDescriptionType.BURN,
          );
          expect(assetDescriptionsCreate.mock.calls[1][1]).toEqual(
            BigInt(burn.value),
          );
          expect(assetDescriptionsCreate.mock.calls[1][2].identifier).toEqual(
            identifier,
          );

          expect(assetsUpdateSupply).toHaveBeenCalledTimes(4);
          expect(assetsUpdateSupply.mock.calls[0][0].identifier).toEqual(
            identifier,
          );
          expect(assetsUpdateSupply.mock.calls[0][1]).toEqual(
            -BigInt(mint.value),
          );
          expect(assetsUpdateSupply.mock.calls[1][0].identifier).toEqual(
            identifier,
          );
          expect(assetsUpdateSupply.mock.calls[1][1]).toEqual(
            BigInt(burn.value),
          );
          expect(assetsUpdateSupply.mock.calls[2][0].identifier).toEqual(
            identifier,
          );
          expect(assetsUpdateSupply.mock.calls[2][1]).toEqual(
            BigInt(mint.value),
          );
          expect(assetsUpdateSupply.mock.calls[3][0].identifier).toEqual(
            identifier,
          );
          expect(assetsUpdateSupply.mock.calls[3][1]).toEqual(
            -BigInt(burn.value),
          );
        });
      });

      describe('when the transaction does not exist', () => {
        it('creates descriptions', async () => {
          const identifier = 'asdflkj';
          const mint = {
            id: identifier,
            metadata: 'foo',
            name: 'bar',
            owner: 'baz',
            value: BigInt(10).toString(),
          };
          const burn = {
            id: identifier,
            value: BigInt(2).toString(),
          };

          const transactionDto = {
            hash: 'transaction-hash',
            fee: faker.datatype.number(),
            size: faker.datatype.number(),
            notes: [{ commitment: uuid() }],
            spends: [{ nullifier: uuid() }],
            mints: [mint],
            burns: [burn],
          };

          const assetsUpsert = jest.spyOn(assetsService, 'upsert');
          const assetDescriptionsCreate = jest.spyOn(
            assetDescriptionsService,
            'create',
          );
          const assetsUpdateSupply = jest.spyOn(assetsService, 'updateSupply');

          const transaction = (
            await transactionsService.createMany([transactionDto])
          )[0];
          await assetsLoader.loadDescriptions(true, transactionDto);

          expect(assetsUpsert).toHaveBeenCalledTimes(1);
          expect(assetsUpsert.mock.calls[0][0]).toEqual({
            identifier: mint.id,
            metadata: mint.metadata,
            name: mint.name,
            owner: mint.owner,
          });
          expect(assetsUpsert.mock.calls[0][1]).toEqual(transaction);

          expect(assetDescriptionsCreate).toHaveBeenCalledTimes(2);
          expect(assetDescriptionsCreate.mock.calls[0][0]).toEqual(
            AssetDescriptionType.MINT,
          );
          expect(assetDescriptionsCreate.mock.calls[0][1]).toEqual(
            BigInt(mint.value),
          );
          expect(assetDescriptionsCreate.mock.calls[0][2].identifier).toEqual(
            identifier,
          );
          expect(assetDescriptionsCreate.mock.calls[1][0]).toEqual(
            AssetDescriptionType.BURN,
          );
          expect(assetDescriptionsCreate.mock.calls[1][1]).toEqual(
            BigInt(burn.value),
          );
          expect(assetDescriptionsCreate.mock.calls[1][2].identifier).toEqual(
            identifier,
          );

          expect(assetsUpdateSupply).toHaveBeenCalledTimes(2);
          expect(assetsUpdateSupply.mock.calls[0][0].identifier).toEqual(
            identifier,
          );
          expect(assetsUpdateSupply.mock.calls[0][1]).toEqual(
            BigInt(mint.value),
          );
          expect(assetsUpdateSupply.mock.calls[1][0].identifier).toEqual(
            identifier,
          );
          expect(assetsUpdateSupply.mock.calls[1][1]).toEqual(
            -BigInt(burn.value),
          );
        });
      });
    });

    describe('for a non main block', () => {
      it('deletes descriptions', async () => {
        const identifier = 'asdflkj';
        const mint = {
          id: identifier,
          metadata: 'foo',
          name: 'bar',
          owner: 'baz',
          value: BigInt(10).toString(),
        };
        const burn = {
          id: identifier,
          value: BigInt(2).toString(),
        };

        const transactionDto = {
          hash: 'transaction-hash',
          fee: faker.datatype.number(),
          size: faker.datatype.number(),
          notes: [{ commitment: uuid() }],
          spends: [{ nullifier: uuid() }],
          mints: [mint],
          burns: [burn],
        };

        const transaction = (
          await transactionsService.createMany([transactionDto])
        )[0];
        await assetsLoader.loadDescriptions(true, transactionDto);

        const assetDescriptionsDelete = jest.spyOn(
          assetDescriptionsService,
          'deleteByTransaction',
        );
        await assetsLoader.loadDescriptions(false, transactionDto);

        expect(assetDescriptionsDelete).toHaveBeenCalledTimes(1);
        expect(assetDescriptionsDelete.mock.calls[0][0].id).toEqual(
          transaction.id,
        );
      });
    });
  });
});
