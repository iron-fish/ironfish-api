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
import { Asset, Block, Transaction } from '.prisma/client';

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

  beforeEach(async () => {
    await prisma.asset.deleteMany({});
  });

  async function createRandomAsset(): Promise<{
    block: Block;
    transaction: Transaction;
    asset: Asset;
  }> {
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
        owner: uuid(),
      },
      transaction,
      prisma,
    );

    return { block: block, transaction: transaction, asset: asset };
  }

  async function verifyAsset(asset: Asset): Promise<Asset> {
    return prisma.asset.update({
      data: {
        verified_at: new Date(),
      },
      where: {
        id: asset.id,
      },
    });
  }

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

    describe('when the asset has not been added to a block', () => {
      it('returns a 404', async () => {
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

        await request(app.getHttpServer())
          .get('/assets/find')
          .query({ id: asset.identifier })
          .expect(HttpStatus.NOT_FOUND);
      });
    });

    describe('with a valid identifier', () => {
      it('returns the asset', async () => {
        const { block, transaction, asset } = await createRandomAsset();

        const { body } = await request(app.getHttpServer())
          .get('/assets/find')
          .query({ id: asset.identifier })
          .expect(HttpStatus.OK);

        expect(body).toMatchObject({
          created_transaction_hash: transaction.hash,
          created_transaction_timestamp: block.timestamp.toISOString(),
          identifier: asset.identifier,
          metadata: asset.metadata,
          name: asset.name,
          owner: asset.owner,
          supply: asset.supply.toString(),
          verified_at: null,
        });
      });
    });
  });

  describe('GET /assets', () => {
    it('returns all assets', async () => {
      const { block, transaction, asset } = await createRandomAsset();
      const {
        block: secondBlock,
        transaction: secondTransaction,
        asset: secondAsset,
      } = await createRandomAsset();

      const verifiedAsset = await verifyAsset(asset);

      const { body } = await request(app.getHttpServer())
        .get('/assets')
        .expect(HttpStatus.OK);

      expect(body).toMatchObject({
        object: 'list',
        data: [
          {
            object: 'asset',
            created_transaction_hash: secondTransaction.hash,
            created_transaction_timestamp: secondBlock.timestamp.toISOString(),
            id: secondAsset.id,
            identifier: secondAsset.identifier,
            metadata: secondAsset.metadata,
            name: secondAsset.name,
            owner: secondAsset.owner,
            supply: secondAsset.supply.toString(),
            verified_at: null,
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
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            verified_at: verifiedAsset.verified_at!.toISOString(),
          },
        ],
        metadata: {
          has_next: false,
          has_previous: false,
        },
      });
    });

    describe('with verified=true', () => {
      it('returns only verified assets', async () => {
        const { block, transaction, asset } = await createRandomAsset();
        const {
          block: _secondBlock,
          transaction: _secondTransaction,
          asset: _secondAsset,
        } = await createRandomAsset();

        const verifiedAsset = await verifyAsset(asset);

        const { body } = await request(app.getHttpServer())
          .get('/assets')
          .query({ verified: true })
          .expect(HttpStatus.OK);

        expect(body).toMatchObject({
          object: 'list',
          data: [
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
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              verified_at: verifiedAsset.verified_at!.toISOString(),
            },
          ],
          metadata: {
            has_next: false,
            has_previous: false,
          },
        });
      });
    });

    describe('with verified=false', () => {
      it('returns only unverified assets', async () => {
        const {
          block: _block,
          transaction: _transaction,
          asset,
        } = await createRandomAsset();
        const {
          block: secondBlock,
          transaction: secondTransaction,
          asset: secondAsset,
        } = await createRandomAsset();

        await verifyAsset(asset);

        const { body } = await request(app.getHttpServer())
          .get('/assets')
          .query({ verified: false })
          .expect(HttpStatus.OK);

        expect(body).toMatchObject({
          object: 'list',
          data: [
            {
              object: 'asset',
              created_transaction_hash: secondTransaction.hash,
              created_transaction_timestamp:
                secondBlock.timestamp.toISOString(),
              id: secondAsset.id,
              identifier: secondAsset.identifier,
              metadata: secondAsset.metadata,
              name: secondAsset.name,
              owner: secondAsset.owner,
              supply: secondAsset.supply.toString(),
              verified_at: null,
            },
          ],
          metadata: {
            has_next: false,
            has_previous: false,
          },
        });
      });
    });
  });
});
