/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import { AssetDescriptionType } from '@prisma/client';
import faker from 'faker';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { AssetsService } from '../assets/assets.service';
import { BlocksService } from '../blocks/blocks.service';
import { BlockOperation } from '../blocks/enums/block-operation';
import { BlocksTransactionsService } from '../blocks-transactions/blocks-transactions.service';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { TransactionsService } from '../transactions/transactions.service';
import { AssetDescriptionsService } from './asset-descriptions.service';

describe('AssetDescriptionsController', () => {
  let app: INestApplication;
  let assetDescriptionsService: AssetDescriptionsService;
  let assetsService: AssetsService;
  let blocksService: BlocksService;
  let blocksTransactionsService: BlocksTransactionsService;
  let prisma: PrismaService;
  let transactionsService: TransactionsService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    assetDescriptionsService = app.get(AssetDescriptionsService);
    assetsService = app.get(AssetsService);
    blocksService = app.get(BlocksService);
    blocksTransactionsService = app.get(BlocksTransactionsService);
    prisma = app.get(PrismaService);
    transactionsService = app.get(TransactionsService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /asset_descriptions', () => {
    describe('with an invalid query', () => {
      it('returns a 422', async () => {
        const { body } = await request(app.getHttpServer())
          .get('/asset_descriptions')
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with a missing record', () => {
      it('returns a 404', async () => {
        await request(app.getHttpServer())
          .get('/asset_descriptions')
          .query({ asset: 'asdf' })
          .expect(HttpStatus.NOT_FOUND);
      });
    });

    describe('with a valid identifier', () => {
      it('returns the asset descriptions', async () => {
        const block = await blocksService.upsert(prisma, {
          hash: uuid(),
          sequence: faker.datatype.number(),
          difficulty: BigInt(faker.datatype.number()),
          work: BigInt(faker.datatype.number()),
          timestamp: new Date(),
          transactionsCount: 1,
          type: BlockOperation.CONNECTED,
          graffiti: uuid(),
          previousBlockHash: uuid(),
          size: faker.datatype.number(),
        });
        const transaction = (
          await transactionsService.createMany([
            {
              fee: 0,
              hash: uuid(),
              notes: [],
              size: 0,
              spends: [],
            },
          ])
        )[0];
        await blocksTransactionsService.upsert(prisma, block, transaction, 0);

        const asset = await assetsService.upsert(
          {
            identifier: uuid(),
            metadata: uuid(),
            name: uuid(),
            creator: uuid(),
            owner: uuid(),
          },
          transaction,
          prisma,
        );

        await assetDescriptionsService.create(
          AssetDescriptionType.MINT,
          BigInt(1),
          asset,
          transaction,
          prisma,
        );

        const secondTransaction = (
          await transactionsService.createMany([
            {
              fee: 0,
              hash: uuid(),
              notes: [],
              size: 0,
              spends: [],
            },
          ])
        )[0];
        await blocksTransactionsService.upsert(
          prisma,
          block,
          secondTransaction,
          1,
        );
        const secondAssetDescription = await assetDescriptionsService.create(
          AssetDescriptionType.MINT,
          BigInt(1),
          asset,
          secondTransaction,
          prisma,
        );

        const thirdTransaction = (
          await transactionsService.createMany([
            {
              fee: 0,
              hash: uuid(),
              notes: [],
              size: 0,
              spends: [],
            },
          ])
        )[0];
        await blocksTransactionsService.upsert(
          prisma,
          block,
          thirdTransaction,
          2,
        );
        const thirdAssetDescription = await assetDescriptionsService.create(
          AssetDescriptionType.BURN,
          BigInt(1),
          asset,
          thirdTransaction,
          prisma,
        );

        const { body } = await request(app.getHttpServer())
          .get('/asset_descriptions')
          .query({ asset: asset.identifier, limit: 2 })
          .expect(HttpStatus.OK);

        expect(body).toMatchObject({
          object: 'list',
          data: [
            {
              object: 'asset_description',
              id: thirdAssetDescription.id,
              block_timestamp: block.timestamp.toISOString(),
              transaction_hash: thirdTransaction.hash,
              type: AssetDescriptionType.BURN,
              value: thirdAssetDescription.value.toString(),
            },
            {
              object: 'asset_description',
              id: secondAssetDescription.id,
              block_timestamp: block.timestamp.toISOString(),
              transaction_hash: secondTransaction.hash,
              type: AssetDescriptionType.MINT,
              value: secondAssetDescription.value.toString(),
            },
          ],
          metadata: {
            has_next: true,
            has_previous: false,
          },
        });
      });
    });
  });
});
