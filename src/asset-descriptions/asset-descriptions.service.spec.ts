/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import { AssetDescriptionType } from '@prisma/client';
import { AssetsService } from '../assets/assets.service';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { TransactionsService } from '../transactions/transactions.service';
import { AssetDescriptionsService } from './asset-descriptions.service';

describe('AssetDescriptionsService', () => {
  let app: INestApplication;
  let assetDescriptionsService: AssetDescriptionsService;
  let assetsService: AssetsService;
  let prisma: PrismaService;
  let transactionsService: TransactionsService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    assetDescriptionsService = app.get(AssetDescriptionsService);
    assetsService = app.get(AssetsService);
    prisma = app.get(PrismaService);
    transactionsService = app.get(TransactionsService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('create', () => {
    it('creates an asset description record', async () => {
      const transaction = (
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

      const asset = await assetsService.upsert(
        {
          identifier: 'foo',
          metadata: 'test',
          name: 'bar',
          owner: 'baz',
        },
        transaction,
        prisma,
      );

      const assetDescription = await assetDescriptionsService.create(
        AssetDescriptionType.MINT,
        BigInt(1),
        asset,
        transaction,
        prisma,
      );
      expect(assetDescription).toMatchObject({
        type: AssetDescriptionType.MINT,
        value: BigInt(1),
        asset_id: asset.id,
        transaction_id: transaction.id,
      });
    });
  });

  describe('findByTransaction', () => {
    it('returns record with matching transaction ids', async () => {
      const transaction = (
        await transactionsService.createMany([
          {
            fee: 0,
            hash: 'find-by-hash',
            notes: [],
            size: 0,
            spends: [],
          },
        ])
      )[0];
      const asset = await assetsService.upsert(
        {
          identifier: 'foo',
          metadata: 'test',
          name: 'bar',
          owner: 'baz',
        },
        transaction,
        prisma,
      );
      const assetDescription = await assetDescriptionsService.create(
        AssetDescriptionType.MINT,
        BigInt(1),
        asset,
        transaction,
        prisma,
      );

      const otherTransaction = (
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
      await assetDescriptionsService.create(
        AssetDescriptionType.MINT,
        BigInt(1),
        asset,
        otherTransaction,
        prisma,
      );

      expect(
        await assetDescriptionsService.findByTransaction(transaction, prisma),
      ).toEqual([assetDescription]);
    });
  });

  describe('deleteByTransaction', () => {
    it('deletes records with matching transaction ids', async () => {
      const transaction = (
        await transactionsService.createMany([
          {
            fee: 0,
            hash: 'delete-hash',
            notes: [],
            size: 0,
            spends: [],
          },
        ])
      )[0];
      const asset = await assetsService.upsert(
        {
          identifier: 'foo',
          metadata: 'test',
          name: 'bar',
          owner: 'baz',
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

      await assetDescriptionsService.deleteByTransaction(transaction, prisma);
      expect(
        await assetDescriptionsService.findByTransaction(transaction, prisma),
      ).toEqual([]);
    });
  });
});
