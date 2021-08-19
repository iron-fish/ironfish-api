/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { BlocksService } from './blocks.service';
import { BlockOperation } from './enums/block-operation';

describe('EventsService', () => {
  let app: INestApplication;
  let blocksService: BlocksService;
  let config: ConfigService;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    blocksService = app.get(BlocksService);
    config = app.get(ConfigService);
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('bulkUpsert', () => {
    describe('when a hash does not exist for the network version', () => {
      it('stores a block record', async () => {
        const blocks = await blocksService.bulkUpsert({
          blocks: [
            {
              hash: uuid(),
              sequence: faker.datatype.number(),
              difficulty: uuid(),
              timestamp: new Date(),
              transactions_count: 0,
              type: BlockOperation.CONNECTED,
              graffiti: uuid(),
              previous_block_hash: uuid(),
            },
          ],
        });
        expect(blocks[0]).toMatchObject({
          id: expect.any(Number),
          hash: expect.any(String),
          sequence: expect.any(Number),
          difficulty: expect.any(String),
          main: true,
          timestamp: expect.any(Date),
          transactions_count: expect.any(Number),
          graffiti: expect.any(String),
          previous_block_hash: expect.any(String),
        });
      });
    });

    describe('when a hash exists for the network version', () => {
      it('updates the block record', async () => {
        const previousBlockHash = uuid();
        const blocks = await blocksService.bulkUpsert({
          blocks: [
            {
              hash: uuid(),
              sequence: faker.datatype.number(),
              difficulty: uuid(),
              timestamp: new Date(),
              transactions_count: 0,
              type: BlockOperation.CONNECTED,
              graffiti: uuid(),
              previous_block_hash: uuid(),
            },
          ],
        });
        const newSequence = faker.datatype.number();
        const newDifficulty = uuid();
        const newGraffiti = uuid();
        const block = blocks[0];
        const newBlocks = await blocksService.bulkUpsert({
          blocks: [
            {
              hash: block.hash,
              sequence: newSequence,
              difficulty: newDifficulty,
              timestamp: new Date(),
              transactions_count: 0,
              type: BlockOperation.CONNECTED,
              graffiti: newGraffiti,
              previous_block_hash: previousBlockHash,
            },
          ],
        });
        expect(newBlocks[0]).toMatchObject({
          id: block.id,
          hash: block.hash,
          sequence: newSequence,
          difficulty: newDifficulty,
          main: true,
          timestamp: expect.any(Date),
          transactions_count: block.transactions_count,
          graffiti: newGraffiti,
          previous_block_hash: previousBlockHash,
        });
      });
    });
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
        const test_block_hash = uuid();
        const blocks = await blocksService.bulkUpsert({
          blocks: [
            {
              hash: test_block_hash,
              sequence: faker.datatype.number(),
              difficulty: uuid(),
              timestamp: new Date(),
              transactions_count: 0,
              type: BlockOperation.CONNECTED,
              graffiti: uuid(),
              previous_block_hash: uuid(),
            },
          ],
        });
        const test_block = blocks[0];
        const block = await blocksService.find({ hash: test_block_hash });
        expect(block).toMatchObject(test_block);
      });
    });

    describe('with a valid sequence index', () => {
      it('returns the block with the correct sequence index', async () => {
        const test_block_sequence = faker.datatype.number();
        const blocks = await blocksService.bulkUpsert({
          blocks: [
            {
              hash: uuid(),
              sequence: test_block_sequence,
              difficulty: uuid(),
              timestamp: new Date(),
              transactions_count: 0,
              type: BlockOperation.CONNECTED,
              graffiti: uuid(),
              previous_block_hash: uuid(),
            },
          ],
        });
        const test_block = blocks[0];
        const block = await blocksService.find({
          sequence: test_block_sequence,
        });
        expect(block).toMatchObject(test_block);
      });
    });
    describe('with neither a valid hash nor sequence', () => {
      it('returns null', async () => {
        await blocksService.bulkUpsert({
          blocks: [
            {
              hash: uuid(),
              sequence: faker.datatype.number(),
              difficulty: uuid(),
              timestamp: new Date(),
              transactions_count: 0,
              type: BlockOperation.CONNECTED,
              graffiti: uuid(),
              previous_block_hash: uuid(),
            },
          ],
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
    it('returns blocks within the sequence range', async () => {
      const start = 1;
      const end = 100;
      const blocks = await blocksService.list(2, 4);
      for (const block of blocks) {
        expect(block.sequence).toBeGreaterThanOrEqual(start);
        expect(block.sequence).toBeLessThan(end);
      }
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
