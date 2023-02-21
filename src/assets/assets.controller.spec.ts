/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import faker from 'faker';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { BlocksService } from '../blocks/blocks.service';
import { BlockOperation } from '../blocks/enums/block-operation';
import { BlocksTransactionsService } from '../blocks-transactions/blocks-transactions.service';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { TransactionsService } from '../transactions/transactions.service';
import { AssetsService } from './assets.service';

describe('AssetsController', () => {
  let app: INestApplication;
  let assetsService: AssetsService;
  let blocksService: BlocksService;
  let blocksTransactionsService: BlocksTransactionsService;
  let prisma: PrismaService;
  let transactionsService: TransactionsService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
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

  describe('GET /assets/find', () => {
    describe('with an invalid query', () => {
      it('returns a 422', async () => {
        const { body } = await request(app.getHttpServer())
          .get('/assets/find')
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with a missing record', () => {
      it('returns a 404', async () => {
        await request(app.getHttpServer())
          .get('/assets/find')
          .query({ id: 'asdf' })
          .expect(HttpStatus.NOT_FOUND);
      });
    });

    describe('with a valid identifier', () => {
      it('returns the asset', async () => {
        const { block } = await blocksService.upsert(prisma, {
          hash: uuid(),
          sequence: faker.datatype.number(),
          difficulty: faker.datatype.number(),
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
            owner: uuid(),
          },
          transaction,
          prisma,
        );

        const { body } = await request(app.getHttpServer())
          .get('/assets/find')
          .query({ id: asset.identifier })
          .expect(HttpStatus.OK);

        expect(body).toMatchObject({
          created_transaction_hash: transaction.hash,
          created_transaction_timestamp: transaction.timestamp.toISOString(),
          identifier: asset.identifier,
          metadata: asset.metadata,
          name: asset.name,
          owner: asset.owner,
          supply: asset.supply.toString(),
        });
      });
    });
  });

  describe('GET /assets', () => {
    it('returns the asset descriptions', async () => {
      const { block } = await blocksService.upsert(prisma, {
        hash: uuid(),
        sequence: faker.datatype.number(),
        difficulty: faker.datatype.number(),
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
          owner: uuid(),
        },
        transaction,
        prisma,
      );

      const secondTransaction = (
        await transactionsService.createMany([
          {
            fee: 0,
            hash: 'foo',
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
      const secondAsset = await assetsService.upsert(
        {
          identifier: uuid(),
          metadata: uuid(),
          name: uuid(),
          owner: uuid(),
        },
        secondTransaction,
        prisma,
      );

      const { body } = await request(app.getHttpServer())
        .get('/assets')
        .query({ limit: 2 })
        .expect(HttpStatus.OK);

      expect(body).toMatchObject({
        object: 'list',
        data: [
          {
            object: 'asset',
            created_transaction_hash: secondTransaction.hash,
            created_transaction_timestamp: block.timestamp.toISOString(),
            id: secondAsset.id,
            identifier: secondAsset.identifier,
            metadata: secondAsset.metadata,
            name: secondAsset.name,
            owner: secondAsset.owner,
            supply: secondAsset.supply.toString(),
          },
          {
            object: 'asset',
            created_transaction_hash: transaction.hash,
            created_transaction_timestamp: block.timestamp.toISOString(),
            id: asset.id,
            identifier: asset.identifier,
            metadata: asset.metadata,
            name: asset.name,
            owner: asset.owner,
            supply: asset.supply.toString(),
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
