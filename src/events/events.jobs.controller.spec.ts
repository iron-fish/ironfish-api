/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import { EventType } from '@prisma/client';
import assert from 'assert';
import faker from 'faker';
import { ulid } from 'ulid';
import { BlocksService } from '../blocks/blocks.service';
import { BlockOperation } from '../blocks/enums/block-operation';
import { LoggerService } from '../logger/logger.service';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import { EventsJobsController } from './events.jobs.controller';
import { EventsService } from './events.service';

describe('EventsJobsController', () => {
  let app: INestApplication;
  let blocksService: BlocksService;
  let eventsJobsController: EventsJobsController;
  let eventsService: EventsService;
  let loggerService: LoggerService;
  let prisma: PrismaService;
  let usersService: UsersService;

  let logError: jest.SpyInstance;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    blocksService = app.get(BlocksService);
    eventsJobsController = app.get(EventsJobsController);
    eventsService = app.get(EventsService);
    loggerService = app.get(LoggerService);
    prisma = app.get(PrismaService);
    usersService = app.get(UsersService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    logError = jest
      .spyOn(loggerService, 'error')
      .mockImplementationOnce(jest.fn());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createEvent', () => {
    it('creates an event record', async () => {
      const user = await usersService.create({
        email: faker.internet.email(),
        graffiti: ulid(),
        countryCode: faker.address.countryCode('alpha-3'),
      });
      const occurredAt = new Date();
      const type = EventType.BUG_CAUGHT;
      const points = 10;

      await eventsJobsController.createEvent({
        userId: user.id,
        type,
        points,
        occurredAt,
      });

      const { data } = await eventsService.list({ userId: user.id });
      expect(data).toHaveLength(1);
      assert.ok(data[0]);
      expect(data[0]).toMatchObject({
        id: expect.any(Number),
        user_id: user.id,
        type,
      });
    });
  });

  describe('upsertBlockMinedEvent', () => {
    describe('with a missing user', () => {
      it('logs an error', async () => {
        await eventsJobsController.upsertBlockMinedEvent({
          block_id: 12345,
          user_id: 12345,
        });

        expect(logError).toHaveBeenCalledTimes(1);
      });

      it('does not requeue', async () => {
        const { requeue } = await eventsJobsController.upsertBlockMinedEvent({
          block_id: 12345,
          user_id: 12345,
        });

        expect(requeue).toBe(false);
      });
    });

    describe('with a missing block', () => {
      it('logs an error', async () => {
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: ulid(),
          countryCode: faker.address.countryCode('alpha-3'),
        });

        await eventsJobsController.upsertBlockMinedEvent({
          block_id: 12345,
          user_id: user.id,
        });

        expect(logError).toHaveBeenCalledTimes(1);
      });

      it('does not requeue', async () => {
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: ulid(),
          countryCode: faker.address.countryCode('alpha-3'),
        });

        const { requeue } = await eventsJobsController.upsertBlockMinedEvent({
          block_id: 12345,
          user_id: user.id,
        });

        expect(requeue).toBe(false);
      });
    });

    describe('with a valid payload', () => {
      it('does not requeue', async () => {
        const { block } = await blocksService.upsert(prisma, {
          hash: ulid(),
          sequence: faker.datatype.number(),
          difficulty: faker.datatype.number(),
          work: faker.datatype.number(),
          timestamp: new Date(),
          transactionsCount: 1,
          type: BlockOperation.CONNECTED,
          graffiti: ulid(),
          previousBlockHash: ulid(),
          size: faker.datatype.number(),
        });
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: ulid(),
          countryCode: faker.address.countryCode('alpha-3'),
        });

        const { requeue } = await eventsJobsController.upsertBlockMinedEvent({
          block_id: block.id,
          user_id: user.id,
        });

        expect(requeue).toBe(false);
      });

      it('upserts a block mined event', async () => {
        const { block } = await blocksService.upsert(prisma, {
          hash: ulid().toLowerCase(),
          sequence: faker.datatype.number(),
          difficulty: faker.datatype.number(),
          work: faker.datatype.number(),
          timestamp: new Date(),
          transactionsCount: 1,
          type: BlockOperation.CONNECTED,
          graffiti: ulid(),
          previousBlockHash: ulid(),
          size: faker.datatype.number(),
        });
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: ulid(),
          countryCode: faker.address.countryCode('alpha-3'),
        });

        const upsertBlockMined = jest.spyOn(eventsService, 'upsertBlockMined');
        await eventsJobsController.upsertBlockMinedEvent({
          block_id: block.id,
          user_id: user.id,
        });

        expect(upsertBlockMined).toHaveBeenCalledTimes(1);
        assert.ok(upsertBlockMined.mock.calls);
        expect(upsertBlockMined.mock.calls[0][0].id).toBe(block.id);
        expect(upsertBlockMined.mock.calls[0][1].id).toBe(user.id);
      });
    });
  });

  describe('deleteBlockMinedEvent', () => {
    describe('with a missing user', () => {
      it('logs an error', async () => {
        await eventsJobsController.deleteBlockMinedEvent({
          block_id: 12345,
        });

        expect(logError).toHaveBeenCalledTimes(1);
      });

      it('does not requeue', async () => {
        const { requeue } = await eventsJobsController.deleteBlockMinedEvent({
          block_id: 12345,
        });

        expect(requeue).toBe(false);
      });
    });

    describe('with a missing block', () => {
      it('logs an error', async () => {
        await eventsJobsController.deleteBlockMinedEvent({
          block_id: 12345,
        });

        expect(logError).toHaveBeenCalledTimes(1);
      });

      it('does not requeue', async () => {
        const { requeue } = await eventsJobsController.deleteBlockMinedEvent({
          block_id: 12345,
        });

        expect(requeue).toBe(false);
      });
    });

    describe('with a valid payload', () => {
      it('does not requeue', async () => {
        const { block } = await blocksService.upsert(prisma, {
          hash: ulid(),
          sequence: faker.datatype.number(),
          difficulty: faker.datatype.number(),
          work: faker.datatype.number(),
          timestamp: new Date(),
          transactionsCount: 1,
          type: BlockOperation.CONNECTED,
          graffiti: ulid(),
          previousBlockHash: ulid(),
          size: faker.datatype.number(),
        });

        const { requeue } = await eventsJobsController.deleteBlockMinedEvent({
          block_id: block.id,
        });

        expect(requeue).toBe(false);
      });

      it('upserts a block mined event', async () => {
        const { block } = await blocksService.upsert(prisma, {
          hash: ulid().toLowerCase(),
          sequence: faker.datatype.number(),
          difficulty: faker.datatype.number(),
          work: faker.datatype.number(),
          timestamp: new Date(),
          transactionsCount: 1,
          type: BlockOperation.CONNECTED,
          graffiti: ulid(),
          previousBlockHash: ulid(),
          size: faker.datatype.number(),
        });

        const deleteBlockMined = jest.spyOn(eventsService, 'deleteBlockMined');
        await eventsJobsController.deleteBlockMinedEvent({
          block_id: block.id,
        });

        expect(deleteBlockMined).toHaveBeenCalledTimes(1);
        assert.ok(deleteBlockMined.mock.calls);
        expect(deleteBlockMined.mock.calls[0][0].id).toBe(block.id);
      });
    });
  });
});
