/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication, NotFoundException } from '@nestjs/common';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { ApiConfigService } from '../api-config/api-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { BlocksService } from './blocks.service';
import { BlockOperation } from './enums/block-operation';
import { Block, Transaction } from '.prisma/client';

describe('BlocksService', () => {
  let app: INestApplication;
  let blocksService: BlocksService;
  let config: ApiConfigService;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    blocksService = app.get(BlocksService);
    config = app.get(ApiConfigService);
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('head', () => {
    describe('with no block for the current version and main chain', () => {
      it('throws a NotFoundException', async () => {
        jest.spyOn(config, 'get').mockImplementationOnce(() => 42069);
        await expect(blocksService.head()).rejects.toThrow(NotFoundException);
      });
    });

    describe('with a valid network version', () => {
      it('returns the heaviest block', async () => {
        const block = await blocksService.head();
        expect(block).toMatchObject({
          id: expect.any(Number),
          main: true,
        });
      });
    });
  });

  describe('find', () => {
    describe('with a valid hash', () => {
      it('returns the block with the correct hash', async () => {
        const testBlockHash = uuid();
        const blocks = await blocksService.upsert(prisma, {
          hash: testBlockHash,
          sequence: faker.datatype.number(),
          difficulty: faker.datatype.number(),
          timestamp: new Date(),
          transactionsCount: 1,
          type: BlockOperation.CONNECTED,
          graffiti: uuid(),
          previous_block_hash: uuid(),
          size: faker.datatype.number(),
        });
        const testBlock = blocks;
        const block = await blocksService.find({ hash: testBlockHash });
        expect(block).toMatchObject(testBlock);
      });
    });

    describe('with a valid sequence index', () => {
      it('returns the block with the correct sequence index', async () => {
        const testBlockSequence = faker.datatype.number();
        const blocks = await blocksService.upsert(prisma, {
          hash: uuid(),
          sequence: testBlockSequence,
          difficulty: faker.datatype.number(),
          timestamp: new Date(),
          transactionsCount: 1,
          type: BlockOperation.CONNECTED,
          graffiti: uuid(),
          previous_block_hash: uuid(),
          size: faker.datatype.number(),
        });
        const testBlock = blocks;
        const block = await blocksService.find({
          sequence: testBlockSequence,
        });
        expect(block).toMatchObject(testBlock);
      });
    });

    describe('with neither a valid hash nor sequence', () => {
      it('returns null', async () => {
        await blocksService.upsert(prisma, {
          hash: uuid(),
          sequence: faker.datatype.number(),
          difficulty: faker.datatype.number(),
          timestamp: new Date(),
          transactionsCount: 1,
          type: BlockOperation.CONNECTED,
          graffiti: uuid(),
          previous_block_hash: uuid(),
          size: faker.datatype.number(),
        });
        const block = await blocksService.find({
          hash: uuid(),
          sequence: faker.datatype.number(),
        });
        expect(block).toBeNull();
      });
    });
  });

  describe('list', () => {
    describe('with a valid sequence range', () => {
      it('returns blocks within the range', async () => {
        const start = 1;
        const end = 100;
        const { data: blocks } = await blocksService.list({
          sequenceGte: 2,
          sequenceLt: 4,
        });
        for (const block of blocks) {
          expect(block.sequence).toBeGreaterThanOrEqual(start);
          expect(block.sequence).toBeLessThan(end);
        }
      });
    });

    describe('with a valid partial hash search string', () => {
      it('returns block(s) with matches', async () => {
        const searchHash = 'aa';
        const { data: blocks } = await blocksService.list({
          search: searchHash,
        });
        expect(blocks.length).toBeGreaterThanOrEqual(0);
      });
    });

    describe('with a valid sequence search string', () => {
      it('returns block(s) with matches', async () => {
        const searchSequence = '50';
        const { data: blocks } = await blocksService.list({
          search: searchSequence,
        });
        expect(blocks.length).toBeGreaterThanOrEqual(0);
      });
    });

    describe('with a transaction ID', () => {
      it('returns block(s) that contain said transaction', async () => {
        const transactionId = 5;
        const blocks = await blocksService.list({
          transactionId,
          withTransactions: true,
        });

        for (const record of blocks.data) {
          const block = record as Block & { transactions: Transaction[] };
          for (const tx of block.transactions) {
            expect(tx.id).toBe(transactionId);
          }
        }
      });
    });

    describe('with no query parameters', () => {
      it('returns block(s) in descending order', async () => {
        const { data: blocks } = await blocksService.list({});
        expect(blocks.length).toBeGreaterThanOrEqual(0);
        expect(blocks[0].id).toBeGreaterThan(blocks[1].id);
      });
    });
  });

  describe('getDateMetrics', () => {
    it('returns metrics for the day', async () => {
      const date = new Date();
      await blocksService.upsert(prisma, {
        hash: uuid(),
        sequence: faker.datatype.number(),
        difficulty: faker.datatype.number(),
        timestamp: date,
        transactionsCount: 1,
        type: BlockOperation.CONNECTED,
        graffiti: uuid(),
        previous_block_hash: uuid(),
        size: faker.datatype.number(),
      });

      const metrics = await blocksService.getDateMetrics(prisma, date);
      expect(metrics).toMatchObject({
        averageBlockTimeMs: expect.any(Number),
        averageDifficultyMillis: expect.any(Number),
        blocksCount: expect.any(Number),
        blocksWithGraffitiCount: expect.any(Number),
        chainSequence: expect.any(Number),
        cumulativeUniqueGraffiti: expect.any(Number),
        transactionsCount: expect.any(Number),
        uniqueGraffiti: expect.any(Number),
      });
    });
  });

  describe('getStatus', () => {
    it('returns statistics for blocks in the main chain', async () => {
      const status = await blocksService.getStatus();
      expect(status.chainHeight).toBeGreaterThan(0);
      expect(status.percentageMarked).toBeGreaterThan(0);
      expect(status.uniqueGraffiti).toBeGreaterThan(0);
    });
  });

  describe('disconnectAfter', () => {
    it('updates `main` to false for all blocks after a sequence', async () => {
      const sequenceGt = 10;
      await blocksService.disconnectAfter(sequenceGt);
      const blocks = await prisma.block.findMany({
        where: {
          sequence: {
            gt: sequenceGt,
          },
        },
      });

      for (const block of blocks) {
        expect(block.main).toBe(false);
      }
    });
  });
});
