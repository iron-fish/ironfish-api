/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import { VerifiedAssetMetadata } from '@prisma/client';
import faker from 'faker';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { BlocksService } from '../blocks/blocks.service';
import { BlockOperation } from '../blocks/enums/block-operation';
import { BlocksTransactionsService } from '../blocks-transactions/blocks-transactions.service';
import { ASSET_METADATA_SCHEMA_VERSION } from '../common/constants';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { TransactionsService } from '../transactions/transactions.service';
import { AssetsService } from './assets.service';
import { VerifiedAssetMetadataDto } from './dto/update-verified-assets-dto';
import { serializeVerifiedAssetMetadata } from './interfaces/serialized-asset';
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

  async function verifyAsset(asset: Asset): Promise<VerifiedAssetMetadata> {
    const metadata = createRandomVerifiedMetadata(asset.identifier);
    return prisma.verifiedAssetMetadata.create({
      data: {
        identifier: metadata.identifier,
        symbol: metadata.symbol,
        decimals: metadata.decimals,
        logo_uri: metadata.logoURI,
        website: metadata.website,
      },
    });
  }

  function createRandomVerifiedMetadata(
    identifier: string,
    populateOptionalFields = true,
  ): VerifiedAssetMetadataDto {
    return {
      identifier,
      symbol: uuid(),
      decimals: populateOptionalFields
        ? Math.floor(Math.random() * 10)
        : undefined,
      logoURI: populateOptionalFields ? uuid() : undefined,
      website: populateOptionalFields ? uuid() : undefined,
    };
  }

  /*
   * Convert a verified asset metadata request object to its database form
   */
  function expectedDatabaseMetadata(
    metadata: VerifiedAssetMetadataDto,
    created_at?: Date,
    updated_at?: Date,
  ): VerifiedAssetMetadata {
    return {
      identifier: metadata.identifier,
      symbol: metadata.symbol,
      decimals: metadata.decimals === undefined ? null : metadata.decimals,
      logo_uri: metadata.logoURI === undefined ? null : metadata.logoURI,
      website: metadata.website === undefined ? null : metadata.website,
      created_at: created_at || expect.any(Date),
      updated_at: updated_at || expect.any(Date),
    };
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
          verified_metadata: null,
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

      const verifiedAssetMetadata = await verifyAsset(asset);

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
            verified_metadata: null,
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
            verified_metadata: serializeVerifiedAssetMetadata(
              verifiedAssetMetadata,
            ),
            verified_at: verifiedAssetMetadata.created_at.toISOString(),
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
            verified_metadata: null,
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
            verified_metadata: null,
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

        const verifiedAssetMetadata = await verifyAsset(asset);

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
              verified_at: verifiedAssetMetadata.created_at.toISOString(),
              verified_metadata: serializeVerifiedAssetMetadata(
                verifiedAssetMetadata,
              ),
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
              verified_metadata: null,
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

      const verifiedAssetMetadata = await verifyAsset(asset);
      const lastModified = verifiedAssetMetadata.created_at.toUTCString();
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
      const verifiedAssetMetadata = await verifyAsset(asset);
      const lastModified = verifiedAssetMetadata.created_at.toUTCString();
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
      const verifiedAssetMetadata = await verifyAsset(asset);
      const lastModified = verifiedAssetMetadata.created_at.toUTCString();

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

  describe('POST /assets/verified', () => {
    it('adds metadata for all assets that exist', async () => {
      const { asset: asset1 } = await createRandomAsset();
      const { asset: asset2 } = await createRandomAsset();

      const verifiedMetadataJSON = {
        schemaVersion: 2,
        assets: [
          createRandomVerifiedMetadata(asset1.identifier),
          createRandomVerifiedMetadata(asset2.identifier),
        ],
      };

      const { body } = await request(app.getHttpServer())
        .post('/assets/verified')
        .set('Authorization', `Bearer ${API_KEY}`)
        .send(verifiedMetadataJSON);

      expect(body).toMatchObject({ missing: [] });

      const allMetadata = await prisma.verifiedAssetMetadata.findMany({});
      expect(allMetadata.sort()).toEqual(
        verifiedMetadataJSON.assets
          .map((asset) => expectedDatabaseMetadata(asset))
          .sort(),
      );
    });

    it('updates metadata for assets that already have metadata', async () => {
      const { asset } = await createRandomAsset();

      const verifiedMetadataJSON1 = {
        schemaVersion: 2,
        assets: [createRandomVerifiedMetadata(asset.identifier)],
      };

      const { body: body1 } = await request(app.getHttpServer())
        .post('/assets/verified')
        .set('Authorization', `Bearer ${API_KEY}`)
        .send(verifiedMetadataJSON1);

      expect(body1).toMatchObject({ missing: [] });

      await expect(prisma.verifiedAssetMetadata.findMany({})).resolves.toEqual(
        verifiedMetadataJSON1.assets.map((asset) =>
          expectedDatabaseMetadata(asset),
        ),
      );

      const verifiedMetadataJSON2 = {
        schemaVersion: 2,
        assets: [createRandomVerifiedMetadata(asset.identifier)],
      };

      const { body: body2 } = await request(app.getHttpServer())
        .post('/assets/verified')
        .set('Authorization', `Bearer ${API_KEY}`)
        .send(verifiedMetadataJSON2);

      expect(body2).toMatchObject({ missing: [] });

      await expect(prisma.verifiedAssetMetadata.findMany({})).resolves.toEqual(
        verifiedMetadataJSON2.assets.map((asset) =>
          expectedDatabaseMetadata(asset),
        ),
      );
    });

    it('only updates metadata for assets that exist and returns those not found', async () => {
      const { asset } = await createRandomAsset();

      const verifiedMetadataJSON = {
        schemaVersion: 2,
        assets: [
          createRandomVerifiedMetadata(asset.identifier),
          createRandomVerifiedMetadata(uuid()),
        ],
      };

      const { body } = await request(app.getHttpServer())
        .post('/assets/verified')
        .set('Authorization', `Bearer ${API_KEY}`)
        .send(verifiedMetadataJSON);

      expect(body).toMatchObject({
        missing: [verifiedMetadataJSON.assets[1]],
      });

      await expect(prisma.verifiedAssetMetadata.findMany({})).resolves.toEqual([
        expectedDatabaseMetadata(verifiedMetadataJSON.assets[0]),
      ]);
    });

    it('deletes metadata items that are not in the list', async () => {
      const { asset: asset1 } = await createRandomAsset();
      const { asset: asset2 } = await createRandomAsset();

      const verifiedMetadataJSON1 = {
        schemaVersion: 2,
        assets: [
          createRandomVerifiedMetadata(asset1.identifier),
          createRandomVerifiedMetadata(asset2.identifier),
        ],
      };

      await request(app.getHttpServer())
        .post('/assets/verified')
        .set('Authorization', `Bearer ${API_KEY}`)
        .send(verifiedMetadataJSON1);

      const allMetadata1 = await prisma.verifiedAssetMetadata.findMany({});
      expect(allMetadata1.sort()).toEqual(
        verifiedMetadataJSON1.assets
          .map((asset) => expectedDatabaseMetadata(asset))
          .sort(),
      );

      const verifiedMetadataJSON2 = {
        schemaVersion: 2,
        assets: [createRandomVerifiedMetadata(asset1.identifier)],
      };

      await request(app.getHttpServer())
        .post('/assets/verified')
        .set('Authorization', `Bearer ${API_KEY}`)
        .send(verifiedMetadataJSON2);

      const allMetadata2 = await prisma.verifiedAssetMetadata.findMany({});
      expect(allMetadata2.sort()).toEqual(
        verifiedMetadataJSON2.assets
          .map((asset) => expectedDatabaseMetadata(asset))
          .sort(),
      );

      // Both assets should still be in the database
      await expect(
        prisma.asset.findMany({
          where: { identifier: asset1.identifier },
        }),
      ).resolves.toHaveLength(1);

      await expect(
        prisma.asset.findMany({
          where: { identifier: asset2.identifier },
        }),
      ).resolves.toHaveLength(1);
    });

    it('deletes metadata if the asset is deleted', async () => {
      const { asset } = await createRandomAsset();

      const verifiedMetadataJSON = {
        schemaVersion: 2,
        assets: [createRandomVerifiedMetadata(asset.identifier)],
      };

      await request(app.getHttpServer())
        .post('/assets/verified')
        .set('Authorization', `Bearer ${API_KEY}`)
        .send(verifiedMetadataJSON);

      await expect(
        prisma.verifiedAssetMetadata.findMany({}),
      ).resolves.toHaveLength(1);

      await prisma.asset.delete({ where: { id: asset.id } });

      await expect(
        prisma.verifiedAssetMetadata.findMany({}),
      ).resolves.toHaveLength(0);
    });
  });

  describe('GET /assets/verified_metadata', () => {
    it('includes the correct schemaVersion', async () => {
      const response = await request(app.getHttpServer()).get(
        '/assets/verified_metadata',
      );
      expect(response.body.schemaVersion).toEqual(
        ASSET_METADATA_SCHEMA_VERSION,
      );
    });

    it('returns an empty array of assets if none exist', async () => {
      const response = await request(app.getHttpServer()).get(
        '/assets/verified_metadata',
      );
      expect(response.body.assets).toEqual([]);
    });

    it('returns all of the verified asset metadata', async () => {
      const { asset: asset1 } = await createRandomAsset();
      const asset1Metadata = createRandomVerifiedMetadata(
        asset1.identifier,
        false,
      );

      const { asset: asset2 } = await createRandomAsset();
      const asset2Metadata = createRandomVerifiedMetadata(asset2.identifier);

      const { asset: asset3 } = await createRandomAsset();
      const asset3Metadata = createRandomVerifiedMetadata(asset3.identifier);

      // Insert the asset metadata for the test setup
      const verifiedMetadataJSON = {
        schemaVersion: 2,
        assets: [asset1Metadata, asset2Metadata, asset3Metadata],
      };

      await request(app.getHttpServer())
        .post('/assets/verified')
        .set('Authorization', `Bearer ${API_KEY}`)
        .send(verifiedMetadataJSON);

      // Fetch the verified asset metadata
      const response = await request(app.getHttpServer()).get(
        '/assets/verified_metadata',
      );

      expect(response.body).toEqual({
        schemaVersion: ASSET_METADATA_SCHEMA_VERSION,
        assets: [
          {
            identifier: asset1Metadata.identifier,
            symbol: asset1Metadata.symbol,
          },
          {
            identifier: asset2Metadata.identifier,
            symbol: asset2Metadata.symbol,
            decimals: asset2Metadata.decimals,
            logoURI: asset2Metadata.logoURI,
            website: asset2Metadata.website,
          },
          {
            identifier: asset3Metadata.identifier,
            symbol: asset3Metadata.symbol,
            decimals: asset3Metadata.decimals,
            logoURI: asset3Metadata.logoURI,
            website: asset3Metadata.website,
          },
        ],
      });
    });
  });
});
