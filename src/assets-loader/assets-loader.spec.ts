/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import { AssetDescriptionType } from '@prisma/client';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { AssetDescriptionsService } from '../asset-descriptions/asset-descriptions.service';
import { AssetsService } from '../assets/assets.service';
import { BlockOperation } from '../blocks/enums/block-operation';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { TransactionsService } from '../transactions/transactions.service';
import { AssetsLoader } from './assets-loader';

describe('AssetsLoader', () => {
  let app: INestApplication;
  let assetDescriptionsService: AssetDescriptionsService;
  let assetsLoader: AssetsLoader;
  let assetsService: AssetsService;
  let prisma: PrismaService;
  let transactionsService: TransactionsService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    assetDescriptionsService = app.get(AssetDescriptionsService);
    assetsLoader = app.get(AssetsLoader);
    assetsService = app.get(AssetsService);
    prisma = app.get(PrismaService);
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
        it('does nothing', async () => {
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
          const blockDto = {
            hash: uuid(),
            difficulty: faker.datatype.number(),
            type: BlockOperation.CONNECTED,
            sequence: faker.datatype.number(),
            timestamp: new Date(),
            transactions_count: 0,
            graffiti: uuid(),
            previous_block_hash: uuid(),
            size: faker.datatype.number({ min: 1 }),
            transactions: [transactionDto],
          };

          await transactionsService.createMany([transactionDto]);
          await assetsLoader.loadDescriptions(blockDto, prisma);

          const assetsUpsert = jest.spyOn(assetsService, 'upsert');
          const assetDescriptionsCreate = jest.spyOn(
            assetDescriptionsService,
            'create',
          );
          const assetsUpdateSupply = jest.spyOn(assetsService, 'updateSupply');

          await assetsLoader.loadDescriptions(blockDto, prisma);
          expect(assetsUpsert).not.toHaveBeenCalled();
          expect(assetDescriptionsCreate).not.toHaveBeenCalled();
          expect(assetsUpdateSupply).not.toHaveBeenCalled();
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
          const blockDto = {
            hash: uuid(),
            difficulty: faker.datatype.number(),
            type: BlockOperation.CONNECTED,
            sequence: faker.datatype.number(),
            timestamp: new Date(),
            transactions_count: 0,
            graffiti: uuid(),
            previous_block_hash: uuid(),
            size: faker.datatype.number({ min: 1 }),
            transactions: [transactionDto],
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
          await assetsLoader.loadDescriptions(blockDto, prisma);

          expect(assetsUpsert).toHaveBeenCalledTimes(1);
          expect(assetsUpsert).toHaveBeenCalledWith(
            {
              identifier: mint.id,
              metadata: mint.metadata,
              name: mint.name,
              owner: mint.owner,
            },
            transaction,
            prisma,
          );

          expect(assetDescriptionsCreate).toHaveBeenCalledTimes(2);
          expect(assetDescriptionsCreate).toHaveBeenCalledWith(
            AssetDescriptionType.MINT,
            BigInt(mint.value),
            expect.objectContaining({ identifier }),
            transaction,
            prisma,
          );
          expect(assetDescriptionsCreate).toHaveBeenCalledWith(
            AssetDescriptionType.BURN,
            BigInt(burn.value),
            expect.objectContaining({ identifier }),
            transaction,
            prisma,
          );

          expect(assetsUpdateSupply).toHaveBeenCalledTimes(2);
          expect(assetsUpdateSupply).toHaveBeenCalledWith(
            expect.objectContaining({ identifier }),
            BigInt(mint.value),
            prisma,
          );
          expect(assetsUpdateSupply).toHaveBeenCalledWith(
            expect.objectContaining({ identifier }),
            -BigInt(burn.value),
            prisma,
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
        const blockDto = {
          hash: uuid(),
          difficulty: faker.datatype.number(),
          type: BlockOperation.CONNECTED,
          sequence: faker.datatype.number(),
          timestamp: new Date(),
          transactions_count: 0,
          graffiti: uuid(),
          previous_block_hash: uuid(),
          size: faker.datatype.number({ min: 1 }),
          transactions: [transactionDto],
        };

        const transaction = (
          await transactionsService.createMany([transactionDto])
        )[0];
        await assetsLoader.loadDescriptions(blockDto, prisma);

        const assetDescriptionsDelete = jest.spyOn(
          assetDescriptionsService,
          'deleteByTransaction',
        );
        await assetsLoader.loadDescriptions(
          { ...blockDto, type: BlockOperation.DISCONNECTED },
          prisma,
        );

        expect(assetDescriptionsDelete).toHaveBeenCalledTimes(1);
        expect(assetDescriptionsDelete).toHaveBeenCalledWith(
          transaction,
          prisma,
        );
      });
    });
  });
});
