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
import { VerifiedAssetMetadataDto } from './dto/update-verified-assets-dto';
import { Asset, Block, Transaction } from '.prisma/client';

const API_KEY = 'test';

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
    metadata: VerifiedAssetMetadataDto;
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

    const metadata = {
      identifier: asset.identifier,
      symbol: uuid(),
      decimals: Math.floor(Math.random() * 10),
      logoURI: uuid(),
      website: uuid(),
    };

    return { block: block, transaction: transaction, asset: asset, metadata };
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

    it('sets Last-Modified', async () => {
      const {
        block: _block,
        transaction: _transaction,
        asset,
      } = await createRandomAsset();
      const lastModified = asset.updated_at.toUTCString();
      await request(app.getHttpServer())
        .get('/assets')
        .expect(HttpStatus.OK)
        .expect('Last-Modified', lastModified);
    });

    it('returns 304 when If-Modified-Since matches Last-Modified', async () => {
      const {
        block: _block,
        transaction: _transaction,
        asset,
      } = await createRandomAsset();
      const lastModified = asset.updated_at.toUTCString();
      const { text } = await request(app.getHttpServer())
        .get('/assets')
        .set('If-Modified-Since', lastModified)
        .expect(HttpStatus.NOT_MODIFIED)
        .expect('Last-Modified', lastModified);
      expect(text).toBeFalsy();
    });

    it('returns 304 when If-Modified-Since is after Last-Modified', async () => {
      const {
        block: _block,
        transaction: _transaction,
        asset,
      } = await createRandomAsset();
      const lastModified = asset.updated_at.toUTCString();
      const oneMinuteAfterLastModified = new Date(
        asset.updated_at.valueOf() + 60_000,
      ).toUTCString();
      const { text } = await request(app.getHttpServer())
        .get('/assets')
        .set('If-Modified-Since', oneMinuteAfterLastModified)
        .expect(HttpStatus.NOT_MODIFIED)
        .expect('Last-Modified', lastModified);
      expect(text).toBeFalsy();
    });

    it('returns 200 when If-Modified-Since is before Last-Modified', async () => {
      const { block, transaction, asset } = await createRandomAsset();
      const lastModified = asset.updated_at.toUTCString();
      const oneMinuteBeforeLastModified = new Date(
        asset.updated_at.valueOf() - 60_000,
      ).toUTCString();
      const { body } = await request(app.getHttpServer())
        .get('/assets')
        .set('If-Modified-Since', oneMinuteBeforeLastModified)
        .expect(HttpStatus.OK)
        .expect('Last-Modified', lastModified);

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
            verified_at: null,
          },
        ],
        metadata: {
          has_next: false,
          has_previous: false,
        },
      });
    });

    it('returns 200 when If-Modified-Since is an invalid date', async () => {
      const { block, transaction, asset } = await createRandomAsset();
      const lastModified = asset.updated_at.toUTCString();
      const { body } = await request(app.getHttpServer())
        .get('/assets')
        .set('If-Modified-Since', 'not a valid date')
        .expect(HttpStatus.OK)
        .expect('Last-Modified', lastModified);

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
            verified_at: null,
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

  describe('GET /assets/verified', () => {
    it('returns the IDs of all verified assets', async () => {
      const {
        block: _block,
        transaction: _transaction,
        asset,
      } = await createRandomAsset();
      const {
        block: _secondBlock,
        transaction: _secondTransaction,
        asset: _secondAsset,
      } = await createRandomAsset();
      const {
        block: _thirdBlock,
        transaction: _thirdTransaction,
        asset: thirdAsset,
      } = await createRandomAsset();

      await verifyAsset(asset);
      await verifyAsset(thirdAsset);

      const { body } = await request(app.getHttpServer())
        .get('/assets/verified')
        .expect(HttpStatus.OK);

      expect(body).toMatchObject({
        assets: [
          {
            identifier: asset.identifier,
          },
          {
            identifier: thirdAsset.identifier,
          },
        ],
      });
    });

    it('sets Last-Modified', async () => {
      const {
        block: _block,
        transaction: _transaction,
        asset,
      } = await createRandomAsset();
      const lastModified = asset.updated_at.toUTCString();
      await request(app.getHttpServer())
        .get('/assets/verified')
        .expect(HttpStatus.OK)
        .expect('Last-Modified', lastModified);
    });

    it('returns 304 when If-Modified-Since matches Last-Modified', async () => {
      const {
        block: _block,
        transaction: _transaction,
        asset,
      } = await createRandomAsset();
      const lastModified = asset.updated_at.toUTCString();
      const { text } = await request(app.getHttpServer())
        .get('/assets/verified')
        .set('If-Modified-Since', lastModified)
        .expect(HttpStatus.NOT_MODIFIED)
        .expect('Last-Modified', lastModified);
      expect(text).toBeFalsy();
    });

    it('returns 304 when If-Modified-Since is after Last-Modified', async () => {
      const {
        block: _block,
        transaction: _transaction,
        asset,
      } = await createRandomAsset();
      const lastModified = asset.updated_at.toUTCString();
      const oneMinuteAfterLastModified = new Date(
        asset.updated_at.valueOf() + 60_000,
      ).toUTCString();
      const { text } = await request(app.getHttpServer())
        .get('/assets/verified')
        .set('If-Modified-Since', oneMinuteAfterLastModified)
        .expect(HttpStatus.NOT_MODIFIED)
        .expect('Last-Modified', lastModified);
      expect(text).toBeFalsy();
    });

    it('returns 200 when If-Modified-Since is before Last-Modified', async () => {
      const {
        block: _block,
        transaction: _transaction,
        asset,
      } = await createRandomAsset();
      await verifyAsset(asset);

      const lastModified = asset.updated_at.toUTCString();
      const oneMinuteBeforeLastModified = new Date(
        asset.updated_at.valueOf() - 60_000,
      ).toUTCString();
      const { body } = await request(app.getHttpServer())
        .get('/assets/verified')
        .set('If-Modified-Since', oneMinuteBeforeLastModified)
        .expect(HttpStatus.OK)
        .expect('Last-Modified', lastModified);

      expect(body).toMatchObject({
        assets: [
          {
            identifier: asset.identifier,
          },
        ],
      });
    });

    it('returns 200 when If-Modified-Since is an invalid date', async () => {
      const {
        block: _block,
        transaction: _transaction,
        asset,
      } = await createRandomAsset();
      await verifyAsset(asset);

      const lastModified = asset.updated_at.toUTCString();
      const { body } = await request(app.getHttpServer())
        .get('/assets/verified')
        .set('If-Modified-Since', 'not a valid date')
        .expect(HttpStatus.OK)
        .expect('Last-Modified', lastModified);

      expect(body).toMatchObject({
        assets: [
          {
            identifier: asset.identifier,
          },
        ],
      });
    });
  });

  describe('POST /assets/update_verified', () => {
    it('adds metadata for all assets that exist', async () => {
      const { metadata: metadata1 } = await createRandomAsset();
      const { metadata: metadata2 } = await createRandomAsset();

      const verifiedMetadata = [metadata1, metadata2];

      const { body } = await request(app.getHttpServer())
        .post('/assets/verified')
        .set('Authorization', `Bearer ${API_KEY}`)
        .send({ schemaVersion: 2, assets: verifiedMetadata });

      expect(body).toMatchObject({ missing: [] });

      const allMetadata = await prisma.verifiedAssetMetadata.findMany({});
      expect(allMetadata).toHaveLength(2);
      for (const metadata of verifiedMetadata) {
        expect(allMetadata).toContainEqual({
          identifier: metadata.identifier,
          symbol: metadata.symbol,
          decimals: metadata.decimals,
          logo_uri: metadata.logoURI,
          website: metadata.website,
          created_at: expect.any(Date),
          updated_at: expect.any(Date),
        });
      }
    });

    it('updates metadata for assets that already have metadata', async () => {
      const { asset } = await createRandomAsset();

      const assetMetadata1 = {
        identifier: asset.identifier,
        symbol: 'ETH',
        decimals: 5,
        logoURI: 'https://example.com/eth.png',
        website: 'https://example.com',
      };

      const { body: body1 } = await request(app.getHttpServer())
        .post('/assets/verified')
        .set('Authorization', `Bearer ${API_KEY}`)
        .send({
          schemaVersion: 2,
          assets: [assetMetadata1],
        });

      expect(body1).toMatchObject({ missing: [] });

      await expect(prisma.verifiedAssetMetadata.findMany({})).resolves.toEqual([
        {
          identifier: assetMetadata1.identifier,
          symbol: assetMetadata1.symbol,
          decimals: assetMetadata1.decimals,
          logo_uri: assetMetadata1.logoURI,
          website: assetMetadata1.website,
          created_at: expect.any(Date),
          updated_at: expect.any(Date),
        },
      ]);

      const assetMetadata2 = {
        identifier: asset.identifier,
        symbol: 'BTC',
        decimals: 3,
        logoURI: 'https://newexample.com/btc.png',
        website: 'https://newexample.com',
      };

      const { body: body2 } = await request(app.getHttpServer())
        .post('/assets/verified')
        .set('Authorization', `Bearer ${API_KEY}`)
        .send({ schemaVersion: 2, assets: [assetMetadata2] });

      expect(body2).toMatchObject({ missing: [] });

      await expect(prisma.verifiedAssetMetadata.findMany({})).resolves.toEqual([
        {
          identifier: assetMetadata2.identifier,
          symbol: assetMetadata2.symbol,
          decimals: assetMetadata2.decimals,
          logo_uri: assetMetadata2.logoURI,
          website: assetMetadata2.website,
          created_at: expect.any(Date),
          updated_at: expect.any(Date),
        },
      ]);
    });

    it('only updates metadata for assets that exist and returns those not found', async () => {
      const {
        block: _block,
        transaction: _transaction,
        asset,
      } = await createRandomAsset();

      const assets = [
        {
          identifier: asset.identifier,
          symbol: 'ETH',
          decimals: 8,
          logoURI: 'https://example.com/eth.png',
          website: 'https://example.com',
        },
        {
          identifier: uuid(),
          symbol: 'BTC',
          decimals: 8,
          logoURI: 'https://example2.com/btc.png',
          website: 'https://example2.com',
        },
      ];

      const { body } = await request(app.getHttpServer())
        .post('/assets/verified')
        .set('Authorization', `Bearer ${API_KEY}`)
        .send({ schemaVersion: 2, assets });

      expect(body).toMatchObject({
        missing: [assets[1]],
      });

      await expect(prisma.verifiedAssetMetadata.findMany({})).resolves.toEqual([
        {
          identifier: assets[0].identifier,
          symbol: assets[0].symbol,
          decimals: assets[0].decimals,
          logo_uri: assets[0].logoURI,
          website: assets[0].website,
          created_at: expect.any(Date),
          updated_at: expect.any(Date),
        },
      ]);
    });

    it('deletes metadata items that are not in the list', async () => {
      const { metadata, asset } = await createRandomAsset();

      await request(app.getHttpServer())
        .post('/assets/verified')
        .set('Authorization', `Bearer ${API_KEY}`)
        .send({ schemaVersion: 2, assets: [metadata] });

      await expect(prisma.verifiedAssetMetadata.findMany({})).resolves.toEqual([
        {
          identifier: metadata.identifier,
          symbol: metadata.symbol,
          decimals: metadata.decimals,
          logo_uri: metadata.logoURI,
          website: metadata.website,
          created_at: expect.any(Date),
          updated_at: expect.any(Date),
        },
      ]);

      await request(app.getHttpServer())
        .post('/assets/verified')
        .set('Authorization', `Bearer ${API_KEY}`)
        .send({ schemaVersion: 2, assets: [] });

      await expect(prisma.verifiedAssetMetadata.findMany({})).resolves.toEqual(
        [],
      );

      // Make sure asset itself is not deleted
      await expect(prisma.asset.findMany({})).resolves.toEqual([asset]);
    });

    it('deletes metadata if the asset is deleted', async () => {
      const { metadata, asset } = await createRandomAsset();

      await request(app.getHttpServer())
        .post('/assets/verified')
        .set('Authorization', `Bearer ${API_KEY}`)
        .send({ schemaVersion: 2, assets: [metadata] });

      await expect(
        prisma.verifiedAssetMetadata.findMany({}),
      ).resolves.toHaveLength(1);

      await prisma.asset.delete({ where: { id: asset.id } });

      await expect(
        prisma.verifiedAssetMetadata.findMany({}),
      ).resolves.toHaveLength(0);
    });
  });
});
