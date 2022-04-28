/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import { EventType, User } from '@prisma/client';
import faker from 'faker';
import request from 'supertest';
import { ApiConfigService } from '../api-config/api-config.service';
import { BlockOperation } from '../blocks/enums/block-operation';
import { ORE_TO_IRON } from '../common/constants';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import { DepositsService } from './deposits.service';
import { UpsertDepositsDto } from './dto/upsert-deposit.dto';

describe('DepositsController', () => {
  let app: INestApplication;
  let config: ApiConfigService;
  let prisma: PrismaService;
  let deposits: DepositsService;
  let users: UsersService;
  let user1: User;
  let user2: User;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    config = app.get(ApiConfigService);
    prisma = app.get(PrismaService);
    deposits = app.get(DepositsService);
    users = app.get(UsersService);
    await app.init();

    user1 = await users.create({
      email: faker.internet.email(),
      graffiti: 'user1',
      country_code: faker.address.countryCode(),
    });

    user2 = await users.create({
      email: faker.internet.email(),
      graffiti: 'user2',
      country_code: faker.address.countryCode(),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /deposits/head', () => {
    it('returns the latest deposit', async () => {
      const API_KEY = config.get<string>('IRONFISH_API_KEY');
      const NETWORK_VERSION = config.get<number>('NETWORK_VERSION');

      const latest = await deposits.head();
      const latestSequence = latest?.block_sequence ?? 0;

      // Create a deposit that should not be picked up
      const deposit = await prisma.deposit.create({
        data: {
          transaction_hash: 'foo',
          block_hash: 'bar',
          block_sequence: latestSequence + 1,
          graffiti: 'mygraffiti',
          network_version: NETWORK_VERSION - 1,
          main: false,
          amount: 13,
        },
      });

      await request(app.getHttpServer())
        .get(`/deposits/head`)
        .set('Authorization', `Bearer ${API_KEY}`)
        .expect(HttpStatus.NOT_FOUND);

      // The deposit should be picked up now as the latest deposit
      await prisma.deposit.update({
        data: { main: true, network_version: NETWORK_VERSION },
        where: { id: deposit.id },
      });

      const response = await request(app.getHttpServer())
        .get(`/deposits/head`)
        .set('Authorization', `Bearer ${API_KEY}`)
        .expect(HttpStatus.OK);

      expect(response.body.id).toEqual(deposit.id);
    });
  });

  describe('GET /deposits/address', () => {
    it('retuns deposit address from config', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/deposits/address')
        .expect(HttpStatus.OK);

      const { address } = body;
      expect(address as string).toBe(config.get('DEPOSIT_ADDRESS'));
    });
  });

  const notes = (amounts: number[], graffiti: string) => {
    return amounts.map((amount) => {
      return { memo: graffiti, amount: amount * ORE_TO_IRON };
    });
  };

  describe('POST /deposits', () => {
    it('upserts new deposit', async () => {
      const API_KEY = config.get<string>('IRONFISH_API_KEY');

      const payload: UpsertDepositsDto = {
        operations: [
          {
            type: BlockOperation.CONNECTED,
            block: {
              hash: 'block1hash',
              timestamp: new Date(),
              sequence: 5,
            },
            transactions: [
              {
                hash: 'block1transaction1hash',
                notes: [
                  ...notes([1, 2], user1.graffiti),
                  ...notes([0.1, 3], user2.graffiti),
                ],
              },
              {
                hash: 'block1transaction2hash',
                notes: [
                  ...notes([0.05], user1.graffiti),
                  ...notes([1], user2.graffiti),
                ],
              },
            ],
          },
        ],
      };

      await request(app.getHttpServer())
        .post(`/deposits`)
        .send(payload)
        .set('Authorization', `Bearer ${API_KEY}`)
        .expect(HttpStatus.CREATED);

      const user1Events = await prisma.event.findMany({
        where: {
          user_id: user1.id,
          type: EventType.SEND_TRANSACTION,
        },
      });

      const user2Events = await prisma.event.findMany({
        where: {
          user_id: user2.id,
          type: EventType.SEND_TRANSACTION,
        },
      });

      expect(user1Events).toHaveLength(1);
      expect(user2Events).toHaveLength(2);

      const user1Deposits = await prisma.deposit.findMany({
        where: {
          graffiti: user1.graffiti,
        },
      });

      const user2Deposits = await prisma.deposit.findMany({
        where: {
          graffiti: user2.graffiti,
        },
      });

      expect(user1Deposits).toHaveLength(2);
      expect(user2Deposits).toHaveLength(2);

      expect(user1Events[0].deposit_id).toEqual(user1Deposits[0].id);
      expect(user2Events[0].deposit_id).toEqual(user2Deposits[0].id);
      expect(user2Events[1].deposit_id).toEqual(user2Deposits[1].id);
    });

    it('removes events on DISCONNECTED operation', async () => {
      const API_KEY = config.get<string>('IRONFISH_API_KEY');

      const payload: UpsertDepositsDto = {
        operations: [
          {
            type: BlockOperation.DISCONNECTED,
            block: {
              hash: 'block1hash',
              timestamp: new Date(),
              sequence: 5,
            },
            transactions: [
              {
                hash: 'block1transaction2hash',
                notes: [
                  ...notes([0.05], user1.graffiti),
                  ...notes([1], user2.graffiti),
                ],
              },
            ],
          },
        ],
      };

      await request(app.getHttpServer())
        .post(`/deposits`)
        .send(payload)
        .set('Authorization', `Bearer ${API_KEY}`)
        .expect(HttpStatus.CREATED);

      const user2Events = await prisma.event.findMany({
        where: {
          user_id: user2.id,
          type: EventType.SEND_TRANSACTION,
        },
      });

      const user1Deposits = await prisma.deposit.findMany({
        where: {
          graffiti: user1.graffiti,
        },
      });

      const user2Deposits = await prisma.deposit.findMany({
        where: {
          graffiti: user2.graffiti,
        },
      });

      expect(user2Events[0].points).toBe(10);
      expect(user2Events[1].points).toBe(0);
      expect(user2Events[1].deposit_id).toEqual(user2Deposits[1].id);
      expect(user2Deposits[1].amount).toEqual(1 * ORE_TO_IRON);

      expect(user1Deposits).toHaveLength(2);
      expect(user2Deposits).toHaveLength(2);

      expect(user1Deposits[1].main).toBe(false);
      expect(user2Deposits[1].main).toBe(false);
    });
  });
});
